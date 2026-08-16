import _ from "lodash";
import moment from "moment";
import derivedProperty from "../../derived";

describe("getPageSize -", () => {
  const { getPageSize } = derivedProperty;

  it("returns at least one row for a short widget", () => {
    expect(
      getPageSize(
        { componentHeight: 0, compactMode: "DEFAULT", tableData: [] },
        moment,
        _,
      ),
    ).toBe(1);
  });

  it("returns a finite integer for missing dimensions", () => {
    expect(
      getPageSize(
        {
          componentHeight: undefined,
          compactMode: "DEFAULT",
          tableData: [],
        },
        moment,
        _,
      ),
    ).toBe(1);
  });

  it("uses the current compact mode and height", () => {
    expect(
      getPageSize(
        {
          componentHeight: 600,
          compactMode: "DEFAULT",
          tableData: Array(20),
        },
        moment,
        _,
      ),
    ).toBeGreaterThan(1);
  });
});
