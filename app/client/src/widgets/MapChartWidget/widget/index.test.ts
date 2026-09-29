import fs from "fs";
import path from "path";
import type {
  PropertyPaneControlConfig,
  PropertyPaneSectionConfig,
} from "constants/PropertyControlConstants";
import MapChartWidget from ".";
import i18n from "i18n";
import { MapTypes } from "../constants";
import {
  CHINA_NATIONWIDE_MAP_ID,
  CHINA_PROVINCE_MAPS,
} from "../chinaMapManifest";

function findProperty(propertyName: string) {
  const sections =
    MapChartWidget.getPropertyPaneContentConfig() as unknown as PropertyPaneSectionConfig[];
  const controls = sections.flatMap(
    (section) => section.children ?? [],
  ) as PropertyPaneControlConfig[];

  return controls.find((property) => property.propertyName === propertyName);
}

describe("Map Chart China configuration", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en-US");
  });
  it("exposes empty region options as read-only widget metadata", () => {
    expect(MapChartWidget.getMetaPropertiesMap()).toMatchObject({
      regionOptions: [],
    });
    expect(MapChartWidget.getAutocompleteDefinitions()).toMatchObject({
      regionOptions: [{ label: "string", value: "string" }],
    });
  });
  it("offers a grouped resource selector and keeps built-in map IDs", () => {
    const selector = findProperty("mapSource");

    expect(selector?.controlType).toBe("MAP_RESOURCE");
    expect(CHINA_NATIONWIDE_MAP_ID).toBe("CHINA_PROVINCES");
    expect(
      CHINA_PROVINCE_MAPS.filter((resource) => resource.childAvailable),
    ).toHaveLength(33);
  });

  it("keeps the saved dynamic built-in map type editable", () => {
    const mapType = findProperty("mapType");

    expect(mapType?.isJSConvertible).toBe(true);
    expect(mapType?.hidden?.({ dynamicPropertyPathList: [] }, "mapType")).toBe(
      true,
    );
    expect(
      mapType?.hidden?.(
        { dynamicPropertyPathList: [{ key: "mapType" }] },
        "mapType",
      ),
    ).toBe(false);
  });

  it("allows map type and chart data to be driven by expressions", () => {
    const chartData = findProperty("data");

    expect(chartData?.isJSConvertible).toBe(true);
  });

  it("does not attribute custom uploads to the bundled map provider", () => {
    const getEditorCallouts = MapChartWidget.getMethods().getEditorCallouts;

    expect(getEditorCallouts({ mapSource: "custom" } as never)).toEqual([
      { message: "Uploaded map for this application." },
    ]);
    expect(getEditorCallouts({ mapSource: "builtin" } as never)).toHaveLength(
      1,
    );
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
