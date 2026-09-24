import type { AllChartData } from "../constants";

export const findInvalidComboSeries = (
  chartData: AllChartData,
): { series: string } | undefined => {
  let index = 0;

  for (const series of Object.values(chartData)) {
    index++;

    if (
      series.seriesType !== undefined &&
      series.seriesType !== "bar" &&
      series.seriesType !== "line"
    ) {
      return { series: series.seriesName || String(index) };
    }
  }

  return undefined;
};
