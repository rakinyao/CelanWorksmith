import type { AllChartData } from "../constants";

export interface InvalidScatterCoordinate {
  series: string;
  point: number;
  axis: "x" | "y";
}

const isFiniteCoordinate = (value: unknown): boolean => {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  );
};

export const findInvalidScatterCoordinate = (
  chartData: AllChartData,
): InvalidScatterCoordinate | undefined => {
  let seriesIndex = 0;

  for (const seriesData of Object.values(chartData)) {
    seriesIndex++;
    const seriesName = seriesData?.seriesName || String(seriesIndex);

    if (!Array.isArray(seriesData?.data)) {
      return { series: seriesName, point: 1, axis: "x" };
    }

    for (
      let pointIndex = 0;
      pointIndex < seriesData.data.length;
      pointIndex++
    ) {
      const point = seriesData.data[pointIndex] as unknown;
      const coordinates =
        point && typeof point === "object"
          ? (point as Record<string, unknown>)
          : {};

      if (!isFiniteCoordinate(coordinates.x)) {
        return {
          series: seriesData.seriesName || String(seriesIndex),
          point: pointIndex + 1,
          axis: "x",
        };
      }

      if (!isFiniteCoordinate(coordinates.y)) {
        return {
          series: seriesData.seriesName || String(seriesIndex),
          point: pointIndex + 1,
          axis: "y",
        };
      }
    }
  }

  return undefined;
};
