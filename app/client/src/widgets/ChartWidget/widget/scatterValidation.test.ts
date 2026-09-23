import type { AllChartData } from "../constants";
import { findInvalidScatterCoordinate } from "./scatterValidation";

describe("findInvalidScatterCoordinate", () => {
  it("accepts finite numeric coordinates and trimmed numeric strings without changing data", () => {
    const chartData = {
      first: {
        seriesName: "First",
        data: [
          { x: 0, y: "  -1.5 " },
          { x: "0", y: 2.25 },
        ],
      },
    } as AllChartData;
    const original = JSON.stringify(chartData);

    expect(findInvalidScatterCoordinate(chartData)).toBeUndefined();
    expect(JSON.stringify(chartData)).toBe(original);
  });

  it.each([
    ["empty", "", "x"],
    ["whitespace", "   ", "x"],
    ["text", "Mon", "x"],
    ["infinity text", "Infinity", "x"],
    ["infinity", Infinity, "x"],
    ["NaN", NaN, "x"],
    ["null", null, "x"],
    ["missing x", undefined, "x"],
    ["missing y", undefined, "y"],
    ["unexpected object", {}, "x"],
  ])("returns the first invalid %s coordinate", (_label, value, axis) => {
    const point = axis === "x" ? { x: value, y: 1 } : { x: 1, y: value };
    const chartData = {
      "series-key": { seriesName: "Revenue", data: [point] },
    } as unknown as AllChartData;

    expect(findInvalidScatterCoordinate(chartData)).toEqual({
      series: "Revenue",
      point: 1,
      axis,
    });
  });

  it("reports the first invalid point and uses the 1-based series fallback", () => {
    const chartData = {
      unnamed: {
        data: [
          { x: 1, y: 2 },
          { x: 3, y: "bad" },
        ],
      },
      later: { data: [{ x: "bad", y: 4 }] },
    } as unknown as AllChartData;

    expect(findInvalidScatterCoordinate(chartData)).toEqual({
      series: "1",
      point: 2,
      axis: "y",
    });
  });
});
