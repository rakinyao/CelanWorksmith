import * as echarts from "echarts";
import {
  getChinaRegionDetail,
  type ChinaRegionDetail,
} from "./chinaRegionDetails";

describe("China map region metadata", () => {
  afterEach(() => jest.restoreAllMocks());

  it("derives labels and level from the registered GeoJSON feature", () => {
    jest.spyOn(echarts, "getMap").mockReturnValue({
      geoJson: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { adcode: "330100", name: "杭州市", level: "city" },
          },
        ],
      },
    } as never);

    expect(getChinaRegionDetail("CHINA_330000", "330100")).toEqual({
      label: "杭州市",
      shortLabel: "杭州市",
      originalId: "330100",
      id: "330100",
      level: "city",
    } satisfies ChinaRegionDetail);
  });

  it("ignores the synthetic nationwide boundary and unknown regions", () => {
    jest.spyOn(echarts, "getMap").mockReturnValue({
      geoJson: {
        type: "FeatureCollection",
        features: [
          {
            properties: {
              adcode: "100000_JD",
              name: "南海诸岛",
              level: "special",
            },
          },
        ],
      },
    } as never);

    expect(
      getChinaRegionDetail("CHINA_PROVINCES", "100000_JD"),
    ).toBeUndefined();
    expect(getChinaRegionDetail("CHINA_PROVINCES", "110000")).toBeUndefined();
  });
});
