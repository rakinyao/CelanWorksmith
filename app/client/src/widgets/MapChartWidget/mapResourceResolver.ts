import * as echarts from "echarts";
import ApplicationMapsApi from "api/ApplicationMapsApi";
import { getChinaMapResource } from "./chinaMapManifest";
import {
  getRegionOptions,
  type MapGeoJson,
  type RegionOption,
} from "./mapRegionMetadata";

export interface ResolvedMapResource {
  mapKey: string;
  geoJson: MapGeoJson;
  regionKey: "adcode" | "id";
  regionOptions: RegionOption[];
}

function validateGeoJson(value: unknown): MapGeoJson {
  if (
    !value ||
    typeof value !== "object" ||
    (value as MapGeoJson).type !== "FeatureCollection" ||
    !Array.isArray((value as MapGeoJson).features)
  ) {
    throw new Error("Invalid map resource");
  }

  return value as MapGeoJson;
}

export async function resolveMapResource(
  mapSource: "builtin" | "custom" | undefined,
  customMapResourceId: string | undefined,
  applicationId: string | undefined,
  mapType: string,
  signal?: AbortSignal,
): Promise<ResolvedMapResource> {
  const custom = mapSource === "custom";
  const mapKey = custom
    ? `application:${applicationId}:${customMapResourceId}`
    : mapType;
  const regionKey = custom ? "id" : "adcode";

  if (custom && (!applicationId || !customMapResourceId))
    throw new Error("Map resource is unavailable");

  const builtin = custom ? undefined : getChinaMapResource(mapType);

  if (!custom && !builtin)
    throw new Error(`Map resource ${mapType} is unavailable`);

  const registered = echarts.getMap(mapKey) as
    | { geoJson?: unknown }
    | undefined;
  const geoJson = validateGeoJson(
    registered?.geoJson ??
      (custom
        ? await ApplicationMapsApi.get(applicationId!, customMapResourceId!)
        : await fetch(builtin!.file, { signal }).then(async (response) => {
            if (!response.ok)
              throw new Error(
                `Unable to load map resource (${response.status})`,
              );

            return response.json();
          })),
  );
  const regionOptions = getRegionOptions(geoJson, regionKey);

  if (!registered && !signal?.aborted)
    echarts.registerMap(
      mapKey,
      geoJson as unknown as Parameters<typeof echarts.registerMap>[1],
      {},
    );

  return { mapKey, geoJson, regionKey, regionOptions };
}
