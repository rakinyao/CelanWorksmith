import {
  buildDataTreeForAutocomplete,
  getDataTreeForAutocomplete,
} from "selectors/dataTreeSelectors";

describe("getDataTreeForAutocomplete", () => {
  it("keeps ordinary evaluated entities available for autocomplete", () => {
    const dataTree = getDataTreeForAutocomplete({
      evaluations: {
        tree: {
          Input1: { text: "value" },
        },
      },
    } as never);

    expect(dataTree).toEqual({
      Input1: { text: "value" },
    });
  });

  it("removes only Appsmith internal autocomplete keys", () => {
    const dataTree = buildDataTreeForAutocomplete({
      Input1: { data: "value" },
      actionPaths: {},
    } as never);

    expect(dataTree).toEqual({
      Input1: { data: "value" },
    });
  });

  it("does not use a selector path as a dispatch mechanism", () => {
    const dataTree = getDataTreeForAutocomplete(
      {
        evaluations: { tree: { Input1: { text: "value" } } },
      } as never,
      "Input1.text",
    );

    expect(dataTree).toEqual({ Input1: { text: "value" } });
  });
});
