import {
  getCelanworksmithVariableDefinitionsFromWidgets,
  getCelanworksmithVariableRootWidgetId,
} from "./celanworksmithVariableSelectors";

const definitions = [
  {
    id: "orders",
    name: "orders",
    kind: "OBJECT_SET",
    version: 1,
    updatedAt: 1,
    dependencies: [],
    config: { typeId: "PurchaseOrder" },
  },
];

describe("CelanWorksmith variable selectors", () => {
  test("reads variables from the page root widget", () => {
    const widgets = {
      root: {
        widgetId: "root",
        type: "CANVAS_WIDGET",
        celanworksmithVariables: definitions,
      },
      child: { widgetId: "child", type: "TEXT_WIDGET" },
    } as never;

    expect(getCelanworksmithVariableRootWidgetId(widgets)).toBe("root");
    expect(getCelanworksmithVariableDefinitionsFromWidgets(widgets)).toEqual(
      definitions,
    );
  });

  test("supports pages without variable definitions", () => {
    expect(getCelanworksmithVariableRootWidgetId({} as never)).toBeUndefined();
    expect(
      getCelanworksmithVariableDefinitionsFromWidgets({} as never),
    ).toEqual([]);
  });
});
