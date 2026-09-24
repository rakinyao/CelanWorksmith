import * as echarts from "echarts";
import { getChinaRegionDetail } from "../chinaRegionDetails";
import log from "loglevel";
import { appsmithTelemetry } from "instrumentation";
import { retryPromise } from "utils/AppsmithUtils";
import { getChinaMapResource } from "../chinaMapManifest";
import {
  getUnavailableMapResourceError,
  isBusinessRegionFeature,
} from "./resourceState";

interface GeoSpecialAreas {
  [areaName: string]: {
    left: number;
    top: number;
    width?: number;
    height?: number;
  };
}

export function getSpecialAreas(): GeoSpecialAreas {
  return {};
}

/*
 * Function to load the map geojson file and register it with echarts
 */
export const loadMapGenerator = () => {
  let abortController: AbortController | null = null;

  return async (mapType: string) => {
    const resource = getChinaMapResource(mapType);

    if (!resource) {
      throw getUnavailableMapResourceError(mapType);
    }

    if (!echarts.getMap(resource.mapId)) {
      if (abortController && abortController.abort) {
        abortController.abort();
      }

      if (AbortController) {
        abortController = new AbortController();
      }

      return retryPromise(
        async () => {
          const response = await fetch(resource.file, {
            signal: abortController?.signal,
          });

          if (!response.ok) {
            throw new Error(`Unable to load map resource (${response.status})`);
          }

          return response;
        },
        3,
        0,
        // TODO: Fix this the next time the file is edited
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error: any) => error.code !== 20,
      )
        .then((response) => response.json())
        .then((geoJson) => {
          if (
            !geoJson ||
            geoJson.type !== "FeatureCollection" ||
            !Array.isArray(geoJson.features) ||
            !geoJson.features.some(isBusinessRegionFeature)
          ) {
            throw new Error(`Invalid map resource ${resource.mapId}`);
          }

          abortController = null;
          echarts.registerMap(resource.mapId, geoJson, getSpecialAreas());
        })
        .catch((error) => {
          abortController = null;

          if (error?.code !== 20) {
            log.error({ error });
            appsmithTelemetry.captureException(error, {
              errorName: "MapChartWidget_utilities",
            });
          }

          throw error;
        });
    } else {
      return Promise.resolve();
    }
  };
};

export function getPositionOffset(type: string, width: number, height: number) {
  return {
    layoutSize: Math.min(width, height),
    layoutCenter: ["50%", height / 2 + 30],
  };
}

export const getChartOption = (
  caption: string,
  showLabel: boolean,
  colorRangePieces: {
    min: number;
    max: number;
    color: string;
  }[],
  data: { name: string; value: number }[],
  type: string,
  height: number,
  width: number,
  fontFamily?: string,
) => {
  const projection = undefined;

  let projectionConfig = {};

  if (projection) {
    projectionConfig = {
      projection: {
        project: (point: [number, number]) => projection(point),
        unproject: (point: [number, number]) => projection.invert?.(point),
        stream: projection.stream,
      },
    };
  }

  return {
    title: {
      text: caption,
      left: "center",
      top: "12px",
      textStyle: {
        fontSize: 24,
        fontWeight: "bold",
        fontFamily,
      },
    },
    tooltip: {
      trigger: "item",
      showDelay: 0,
      transitionDuration: 0.2,
    },
    visualMap: {
      show: true,
      type: "piecewise",
      pieces: colorRangePieces,
      formatter: (min: number, max: number) => {
        return `${min}-${max}`;
      },
      orient: "horizontal",
      top: "68px",
      left: "center",
      itemWidth: 12,
      itemHeight: 12,
      textStyle: {
        fontSize: 14,
        color: "#4c5664",
        overflow: "break",
      },
      itemSymbol: "rect",
    },
    toolbox: {
      show: false,
    },
    series: [
      {
        type: "map",
        ...getPositionOffset(type, width, height),
        roam: true,
        map: type,
        itemStyle: {
          borderColor: "#ccc",
          areaColor: "#aeaeae",
        },
        emphasis: {
          itemStyle: {
            areaColor: "#FFF9C4",
          },
        },
        tooltip: {
          show: true,
          borderColor: "#ccc",
          padding: [4, 8],
          fontFamily,
          // TODO: Fix this the next time the file is edited
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (d: any) => {
            const key = d?.name as string;
            const label = getChinaRegionDetail(type, key)?.label || key;

            return `${label}, ${d.data?.value ?? "-"}`;
          },
          textStyle: {
            fontSize: 14,
            color: "#4c5664",
          },
          extraCssText: "border-radius: 0;",
        },
        label: {
          show: showLabel,
          fontFamily,
          position: "top",
          // TODO: Fix this the next time the file is edited
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (d: any) => {
            const key = d?.name as string;
            const label = getChinaRegionDetail(type, key)?.shortLabel || key;

            return `${label}: ${d.data?.value ?? "-"}`;
          },
          textStyle: {
            fontSize: 12,
            color: "#4c5664",
          },
        },
        scaleLimit: {
          min: 1,
          max: 4,
        },
        labelLayout: () => {
          return {
            hideOverlap: true,
          };
        },
        nameProperty: "id",
        data,
        ...projectionConfig,
      },
    ],
  };
};
