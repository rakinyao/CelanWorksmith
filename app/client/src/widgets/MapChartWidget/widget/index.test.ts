import fs from "fs";
import path from "path";
import MapChartWidget from ".";
import { MapTypes } from "../constants";
import {
  CHINA_NATIONWIDE_MAP_ID,
  CHINA_PROVINCE_MAPS,
} from "../chinaMapManifest";

function findProperty(propertyName: string) {
  return MapChartWidget.getPropertyPaneContentConfig()
    .flatMap((section) => section.children ?? [])
    .find((property) => property.propertyName === propertyName);
}

describe("Map Chart China configuration", () => {
  it("exposes the nationwide map and exactly the available child resources", () => {
    const mapType = findProperty("mapType");
    const options = mapType?.options ?? [];
    const optionValues = options.map((option) => option.value);

    expect(optionValues[0]).toBe(CHINA_NATIONWIDE_MAP_ID);
    expect(options[0]?.label).toBe("全国");
    expect(optionValues).toHaveLength(34);
    expect(optionValues).toEqual([
      CHINA_NATIONWIDE_MAP_ID,
      ...CHINA_PROVINCE_MAPS.map((resource) => resource.mapId),
    ]);
    expect(optionValues).not.toEqual(expect.arrayContaining(["WORLD", "USA"]));
    expect(optionValues).not.toContain("CHINA_710000");
    expect(mapType?.validation?.params.allowedValues).toEqual(optionValues);
    expect(mapType?.isJSConvertible).toBe(true);
  });

  it("allows map type and chart data to be driven by expressions", () => {
    const mapType = findProperty("mapType");
    const chartData = findProperty("data");

    expect(mapType?.isJSConvertible).toBe(true);
    expect(chartData?.isJSConvertible).toBe(true);
  });

  it("keeps the { id, value } data contract and all nationwide regions", () => {
    const defaults = MapChartWidget.getDefaults();
    const data = defaults.data as Array<{ id: string; value: unknown }>;

    expect(defaults.mapType).toBe(MapTypes.CHINA_PROVINCES);
    expect(data).toHaveLength(34);
    expect(data).toEqual(
      expect.arrayContaining([
        { id: "110000", value: 0 },
        { id: "710000", value: 0 },
        { id: "820000", value: 0 },
      ]),
    );
    expect(data).toEqual(data.map(({ id, value }) => ({ id, value })));
  });

  it("ships every manifest file locally and removes the old bundled maps", () => {
    const mapsRoot = path.resolve(__dirname, "../../../../public/static/maps");
    const oldMapFiles = [
      "AFRICA.json",
      "ASIA.json",
      "EUROPE.json",
      "NORTH_AMERICA.json",
      "OCEANIA.json",
      "SOURTH_AMERICA.json",
      "USA.json",
      "WORLD.json",
      "WORLD_WITH_ANTARCTICA.json",
    ];

    expect(fs.existsSync(path.join(mapsRoot, "CHINA_PROVINCES.json"))).toBe(
      true,
    );
    expect(
      oldMapFiles.some((file) => fs.existsSync(path.join(mapsRoot, file))),
    ).toBe(false);
    expect(
      CHINA_PROVINCE_MAPS.every(
        (resource) =>
          resource.file.startsWith("/static/maps/") &&
          !/^https?:/.test(resource.file),
      ),
    ).toBe(true);
  });
});
