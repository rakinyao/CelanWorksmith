import * as echarts from "echarts";
import {
  CHINA_NATIONWIDE_MAP_ID,
  getChinaMapResource,
} from "../chinaMapManifest";
import { getChartOption, loadMapGenerator } from "./utilities";

describe("Map Chart local resource loader", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fetches the manifest file and registers it under the manifest map id", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "FeatureCollection",
        features: [{ properties: { adcode: "110000", level: "province" } }],
      }),
    });

    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    jest.spyOn(echarts, "getMap").mockReturnValue(undefined);
    const registerMap = jest
      .spyOn(echarts, "registerMap")
      .mockImplementation(() => undefined);

    await loadMapGenerator()(CHINA_NATIONWIDE_MAP_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      "/static/maps/CHINA_PROVINCES.json",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(registerMap).toHaveBeenCalledWith(
      CHINA_NATIONWIDE_MAP_ID,
      expect.objectContaining({ type: "FeatureCollection" }),
      {},
    );
  });

  it("does not request a remote replacement for a removed map id", async () => {
    const fetchMock = jest.fn();

    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: fetchMock,
    });

    await expect(loadMapGenerator()("WORLD")).rejects.toMatchObject({
      mapType: "WORLD",
      recoverable: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("matches DataV regions by their adcode property", () => {
    const option = getChartOption(
      "中国",
      true,
      [],
      [{ name: "330000", value: 1 }],
      CHINA_NATIONWIDE_MAP_ID,
      300,
      300,
    );

    expect(option.series[0].nameProperty).toBe("adcode");
  });

  it("keeps zero values visible in tooltip and labels", () => {
    const option = getChartOption(
      "中国",
      true,
      [],
      [{ name: "330000", value: 0 }],
      CHINA_NATIONWIDE_MAP_ID,
      300,
      300,
    );
    const series = option.series[0];
    const tooltip = series.tooltip.formatter as (datum: unknown) => string;
    const label = series.label.formatter as (datum: unknown) => string;

    expect(tooltip({ name: "330000", data: { value: 0 } })).toContain(", 0");
    expect(label({ name: "330000", data: { value: 0 } })).toContain(": 0");
  });

  it("uses a safe fallback for an unknown or childless region", () => {
    const option = getChartOption(
      "中国",
      true,
      [],
      [{ name: "999999", value: 1 }],
      CHINA_NATIONWIDE_MAP_ID,
      300,
      300,
    );
    const tooltip = option.series[0].tooltip.formatter as (
      datum: unknown,
    ) => string;

    expect(tooltip({ name: "999999", data: { value: 1 } })).toBe("999999, 1");
    expect(getChinaMapResource("CHINA_710000")).toBeUndefined();
  });

  it("escapes custom region labels in tooltip HTML", () => {
    const option = getChartOption(
      "Campus",
      true,
      [],
      [{ name: "Building-A", value: 0 }],
      "application:app:resource",
      300,
      300,
      undefined,
      "id",
      [{ label: "<North & Hall>", value: "Building-A" }],
    );
    const tooltip = option.series[0].tooltip.formatter as (
      datum: unknown,
    ) => string;

    expect(tooltip({ name: "Building-A", data: { value: 0 } })).toBe(
      "&lt;North &amp; Hall&gt;, 0",
    );
  });
});
