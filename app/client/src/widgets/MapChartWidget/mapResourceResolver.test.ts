import * as echarts from "echarts";
import ApplicationMapsApi from "api/ApplicationMapsApi";
import { resolveMapResource } from "./mapResourceResolver";

const customGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "Building-A", name: "North Hall" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "Building-B", name: "South Hall" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    },
  ],
};

describe("map resource resolution", () => {
  afterEach(() => jest.restoreAllMocks());

  it("resolves the exact custom ID and preserves case-sensitive region options", async () => {
    jest
      .spyOn(ApplicationMapsApi, "get")
      .mockResolvedValue(customGeoJson as never);
    jest.spyOn(echarts, "getMap").mockReturnValue(undefined);
    const register = jest
      .spyOn(echarts, "registerMap")
      .mockImplementation(() => undefined);

    const result = await resolveMapResource(
      "custom",
      "resource-1",
      "app-1",
      "CHINA_PROVINCES",
    );

    expect(result).toMatchObject({
      mapKey: "application:app-1:resource-1",
      regionKey: "id",
      regionOptions: [
        { label: "North Hall", value: "Building-A" },
        { label: "South Hall", value: "Building-B" },
      ],
    });
    expect(register).toHaveBeenCalledWith(result.mapKey, customGeoJson, {});
  });

  it("rejects an empty custom ID without fetching or falling back", async () => {
    const get = jest.spyOn(ApplicationMapsApi, "get");

    await expect(
      resolveMapResource("custom", "", "app-1", "CHINA_PROVINCES"),
    ).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });

  it("rejects malformed custom features", async () => {
    jest.spyOn(ApplicationMapsApi, "get").mockResolvedValue({
      type: "FeatureCollection",
      features: [{ properties: { id: "Building-A" } }],
    } as never);
    await expect(
      resolveMapResource("custom", "resource-1", "app-1", "CHINA_PROVINCES"),
    ).rejects.toThrow();
  });

  it("keeps successive immutable resources under distinct registration keys", async () => {
    const get = jest
      .spyOn(ApplicationMapsApi, "get")
      .mockImplementation(async (_applicationId, resourceId) => ({
        ...customGeoJson,
        features: [customGeoJson.features[resourceId === "resource-a" ? 0 : 1]],
      }));

    jest.spyOn(echarts, "getMap").mockReturnValue(undefined);
    jest.spyOn(echarts, "registerMap").mockImplementation(() => undefined);

    const first = await resolveMapResource(
      "custom",
      "resource-a",
      "app-1",
      "CHINA_PROVINCES",
    );
    const second = await resolveMapResource(
      "custom",
      "resource-b",
      "app-1",
      "CHINA_PROVINCES",
    );

    expect(first.mapKey).toBe("application:app-1:resource-a");
    expect(second.mapKey).toBe("application:app-1:resource-b");
    expect(first.regionOptions).toEqual([
      { label: "North Hall", value: "Building-A" },
    ]);
    expect(second.regionOptions).toEqual([
      { label: "South Hall", value: "Building-B" },
    ]);
    expect(get).toHaveBeenNthCalledWith(2, "app-1", "resource-b");
  });

  it("propagates a missing resource instead of choosing another map", async () => {
    jest
      .spyOn(ApplicationMapsApi, "get")
      .mockRejectedValue(new Error("Map resource not found"));

    await expect(
      resolveMapResource("custom", "missing", "app-1", "CHINA_PROVINCES"),
    ).rejects.toThrow("Map resource not found");
  });
});
