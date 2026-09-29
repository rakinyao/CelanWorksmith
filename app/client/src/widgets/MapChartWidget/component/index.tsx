import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import type { MapColorObject } from "../constants";
import type { MapData } from "./types";
import { getChartOption } from "./utilities";
import * as echarts from "echarts";
import { getChinaRegionDetail } from "../chinaRegionDetails";
import { getRegionDetail, type RegionOption } from "../mapRegionMetadata";
import {
  resolveMapResource,
  type ResolvedMapResource,
} from "../mapResourceResolver";
import clsx from "clsx";
import type { MapResourceUnavailableError } from "./resourceState";

const MapChartContainer = styled.div<{
  borderRadius?: string;
  boxShadow?: string;
}>`
  display: flex;
  height: 100%;
  width: 100%;
  background: white;
  border-radius: ${({ borderRadius }) => borderRadius};
  box-shadow: ${({ boxShadow }) => `${boxShadow}`};
  overflow: hidden;
  position: relative;

  & > div {
    width: 100%;
  }
`;

export default function EchartComponent(props: MapChartComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [resourceError, setResourceError] = useState<
    MapResourceUnavailableError | Error | null
  >(null);

  const [resolvedMap, setResolvedMap] = useState<ResolvedMapResource | null>(
    null,
  );

  const {
    applicationId,
    caption,
    colorRange,
    customMapResourceId,
    data,
    mapSource,
    onDataPointClick,
    onMapChange,
    onRegionOptionsChange,
    showLabels,
    type,
  } = props;

  const fontFamily =
    props.fontFamily === "System Default" ? "" : props.fontFamily;

  const colorRangePieces = useMemo(() => {
    return colorRange.map((color) => {
      const alpha = color.alpha ?? 100;

      return {
        min: color.minValue,
        max: color.maxValue,
        color: color.code,
        colorAlpha: alpha ? alpha / 100 : 0,
        label: color.displayValue,
      };
    });
  }, [colorRange]);

  const transformedData = useMemo(() => {
    return data.map((each) => ({
      name: each.id,
      value: each.value,
    }));
  }, [data]);

  const chartContainer = useRef<HTMLDivElement>(null);

  const chartInstance = useRef<echarts.ECharts | null>();

  useEffect(() => {
    chartInstance.current = echarts.init(
      chartContainer.current!,
      {},
      {
        renderer: "svg",
        width: props.width,
        height: props.height,
      },
    );
  }, [chartContainer]);

  useEffect(() => {
    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (event: any) => {
      if (!resolvedMap) return;

      const id = event.data.name;

      const regionDetail =
        resolvedMap?.regionKey === "id"
          ? getRegionDetail(resolvedMap.regionOptions, id)
          : getChinaRegionDetail(type, id);

      if (!regionDetail) {
        return;
      }

      onDataPointClick({
        value: parseFloat(event.data.value),
        label: regionDetail.label,
        shortLabel: regionDetail.shortLabel,
        originalId: regionDetail.originalId,
        id: regionDetail.id,
      });
    };

    chartInstance.current?.on("click", "series", handler);

    return () => {
      chartInstance.current?.off("click", handler);
    };
  }, [onDataPointClick, chartInstance.current, type, resolvedMap]);

  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    setIsLoading(true);
    setResourceError(null);
    setResolvedMap(null);
    chartInstance.current?.clear();
    onRegionOptionsChange?.([]);
    onMapChange?.();

    resolveMapResource(
      mapSource,
      customMapResourceId,
      applicationId,
      type,
      abortController.signal,
    )
      .then((resource) => {
        if (!active) return;

        setIsLoading(false);
        setResolvedMap(resource);
        onRegionOptionsChange?.(resource.regionOptions);
      })
      .catch((error: MapResourceUnavailableError | Error) => {
        if (!active) return;

        setIsLoading(false);
        setResourceError(error);
      });

    return () => {
      active = false;
      abortController.abort();
    };
  }, [
    type,
    mapSource,
    customMapResourceId,
    applicationId,
    onRegionOptionsChange,
    onMapChange,
  ]);

  useEffect(() => {
    if (!isLoading && resolvedMap && !!echarts.getMap(resolvedMap.mapKey)) {
      chartInstance.current?.setOption(
        getChartOption(
          caption,
          showLabels,
          colorRangePieces,
          transformedData,
          resolvedMap.mapKey,
          props.height,
          props.width,
          fontFamily,
          resolvedMap.regionKey,
          resolvedMap.regionOptions,
        ),
        true,
      );
    }
  }, [
    isLoading,
    caption,
    showLabels,
    colorRangePieces,
    transformedData,
    fontFamily,
    chartInstance.current,
    resolvedMap,
    props.height,
    props.width,
  ]);

  useEffect(() => {
    chartInstance.current?.resize({
      width: props.width,
      height: props.height,
    });
  }, [props.width, props.height]);

  return (
    <MapChartContainer
      borderRadius={props.borderRadius}
      boxShadow={props.boxShadow}
      className={clsx({
        "bp3-skeleton": isLoading,
      })}
      data-testid="t--map-chart-container"
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={chartContainer} />
      {resourceError && (
        <MapResourceError role="alert">
          {resourceError.message}
        </MapResourceError>
      )}
    </MapChartContainer>
  );
}

const MapResourceError = styled.div`
  align-items: center;
  background: white;
  color: #4c5664;
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 24px;
  position: absolute;
  text-align: center;
  width: 100%;
`;

export interface MapChartComponentProps {
  caption: string;
  colorRange: MapColorObject[];
  data: MapData[];
  isVisible: boolean;
  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDataPointClick: (evt: any) => void;
  showLabels: boolean;
  type: string;
  mapSource?: "builtin" | "custom";
  customMapResourceId?: string;
  applicationId?: string;
  onRegionOptionsChange?: (options: RegionOption[]) => void;
  onMapChange?: () => void;
  borderRadius?: string;
  boxShadow?: string;
  fontFamily?: string;
  height: number;
  width: number;
}
