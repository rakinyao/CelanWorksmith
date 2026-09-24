import type { AllChartData } from "../constants";
import { findInvalidComboSeries } from "./comboValidation";

describe("findInvalidComboSeries", () => {
  it("accepts missing and both supported series types without rewriting input", () => {
    const data: AllChartData = {
      first: { seriesName: "Revenue", data: [] },
      second: { seriesName: "Costs", seriesType: "line", data: [] },
      third: { seriesType: "bar", data: [] },
    };
    const original = JSON.parse(JSON.stringify(data));

    expect(findInvalidComboSeries(data)).toBeUndefined();
    expect(data).toEqual(original);
  });

  it("identifies the first explicitly invalid series by name or position", () => {
    const named = {
      first: { seriesName: "Revenue", data: [] },
      second: { seriesName: "Costs", seriesType: "area", data: [] },
    } as unknown as AllChartData;
    const unnamed = {
      first: { seriesType: "scatter", data: [] },
    } as unknown as AllChartData;

    expect(findInvalidComboSeries(named)).toEqual({ series: "Costs" });
    expect(findInvalidComboSeries(unnamed)).toEqual({ series: "1" });
    expect((named.second as unknown as { seriesType: string }).seriesType).toBe(
      "area",
    );
  });
});
