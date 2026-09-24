import * as echarts from "echarts";

export interface ChinaRegionDetail {
  label: string;
  shortLabel: string;
  originalId: string;
  id: string;
  level: string;
}

interface GeoFeature {
  properties?: {
    adcode?: string | number;
    name?: string;
    level?: string;
  };
}

interface RegisteredMap {
  geoJson?: { features?: GeoFeature[] };
}

/** Returns metadata from the locally registered DataV GeoJSON map. */
export function getChinaRegionDetail(
  mapId: string,
  regionId: string | number | undefined,
): ChinaRegionDetail | undefined {
  if (regionId === undefined || regionId === null) return undefined;

  const originalId = String(regionId);

  if (originalId === "100000_JD") return undefined;

  const map = echarts.getMap(mapId) as RegisteredMap | undefined;
  const feature = map?.geoJson?.features?.find(
    (item) => String(item.properties?.adcode) === originalId,
  );
  const properties = feature?.properties;

  if (!properties?.name || properties.level === "special") return undefined;

  return {
    label: properties.name,
    shortLabel: properties.name,
    originalId,
    id: originalId.toLowerCase(),
    level: properties.level || "unknown",
  };
}
