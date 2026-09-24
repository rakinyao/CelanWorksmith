import * as echarts from "echarts";
import { CHINA_NATIONWIDE_MAP_ID } from "../chinaMapManifest";
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
});
