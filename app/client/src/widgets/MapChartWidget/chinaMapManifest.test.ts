import fs from "fs";
import path from "path";
import {
  CHINA_NATIONWIDE_MAP_ID,
  CHINA_PROVINCE_MAPS,
  getChinaMapResource,
  isChinaMapId,
} from "./chinaMapManifest";

const mapsRoot = path.resolve(__dirname, "../../../public/static/maps");

describe("China map manifest", () => {
  it("describes the nationwide and available child resources", () => {
    const nationwide = JSON.parse(
      fs.readFileSync(path.join(mapsRoot, "CHINA_PROVINCES.json"), "utf8"),
    );
    const provinceFeatures = nationwide.features.filter(
      (feature: { properties?: { level?: string } }) =>
        feature.properties?.level === "province",
    );

    expect(provinceFeatures).toHaveLength(34);
    expect(CHINA_PROVINCE_MAPS).toHaveLength(33);
    expect(CHINA_PROVINCE_MAPS).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ adcode: "710000" })]),
    );
    expect(isChinaMapId(CHINA_NATIONWIDE_MAP_ID)).toBe(true);
    expect(isChinaMapId("710000")).toBe(false);
  });

  it("uses local files and stable Zhejiang and Guangdong metadata", () => {
    const zhejiang = getChinaMapResource("CHINA_330000");
    const guangdong = getChinaMapResource("CHINA_440000");

    expect(zhejiang).toMatchObject({
      adcode: "330000",
      name: "浙江省",
      level: "province",
      childAvailable: true,
    });
    expect(guangdong).toMatchObject({
      adcode: "440000",
      name: "广东省",
      level: "province",
      childAvailable: true,
    });

    for (const resource of [
      getChinaMapResource(CHINA_NATIONWIDE_MAP_ID),
      ...CHINA_PROVINCE_MAPS,
    ]) {
      expect(resource?.file).toMatch(/^\/static\/maps\//);
      expect(resource?.file).not.toMatch(/^https?:/);
      expect(
        fs.existsSync(
          path.join(mapsRoot, resource!.file.replace(/^\/static\/maps\//, "")),
        ),
      ).toBe(true);
    }
  });
});
