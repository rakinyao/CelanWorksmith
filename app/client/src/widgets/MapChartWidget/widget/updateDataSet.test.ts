import { updateDataSet } from "./index";

describe("Map Chart map type updates", () => {
  it("preserves existing data when selecting a child map without child samples", () => {
    const data = [{ id: "330100", value: 12 }];

    expect(
      updateDataSet(
        { data, dynamicPropertyPathList: [] } as never,
        "mapType",
        "CHINA_330000",
      ),
    ).toEqual([{ propertyPath: "mapType", propertyValue: "CHINA_330000" }]);
  });

  it("preserves data when the data property is dynamically bound", () => {
    const data = [{ id: "330000", value: 12 }];

    expect(
      updateDataSet(
        {
          data,
          dynamicPropertyPathList: [{ key: "data" }],
        } as never,
        "mapType",
        "CHINA_PROVINCES",
      ),
    ).toEqual([{ propertyPath: "mapType", propertyValue: "CHINA_PROVINCES" }]);
  });
});
