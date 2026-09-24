import {
  CHINA_NATIONWIDE_MAP_ID,
  getChinaMapResource,
} from "../chinaMapManifest";
import {
  isBusinessRegionFeature,
  getUnavailableMapResourceError,
} from "./resourceState";

describe("Map Chart China resource state", () => {
  it("recognizes province features as business regions but excludes the nationwide special boundary", () => {
    expect(
      isBusinessRegionFeature({
        properties: { adcode: "330000", name: "浙江省", level: "province" },
      }),
    ).toBe(true);
    expect(
      isBusinessRegionFeature({
        properties: {
          adcode: "100000_JD",
          name: "南海诸岛",
          level: "district",
        },
      }),
    ).toBe(false);
  });

  it("returns a recoverable error for removed map ids", () => {
    expect(getUnavailableMapResourceError("WORLD")).toEqual(
      expect.objectContaining({
        mapType: "WORLD",
        recoverable: true,
      }),
    );
    expect(getUnavailableMapResourceError("WORLD").message).toContain("WORLD");
  });

  it("looks up local manifest resources by their saved map id", () => {
    expect(getChinaMapResource(CHINA_NATIONWIDE_MAP_ID)).toMatchObject({
      mapId: CHINA_NATIONWIDE_MAP_ID,
      file: "/static/maps/CHINA_PROVINCES.json",
    });
    expect(getChinaMapResource("WORLD")).toBeUndefined();
  });
});
