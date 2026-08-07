import { cloneDeep, noop } from "lodash";
import type { DSLWidget } from "WidgetProvider/types";
import { normalizeObjectBinding } from "celanworksmith/widgets/objectBinding/normalizeObjectBinding";
import { extractCurrentDSL } from "./WidgetPropsUtils";
import { traverseDSLAndMigrate } from "./WidgetMigrationUtils";

const dsl = {
  children: [
    {
      name: "widget1",
      children: [
        {
          name: "widget2",
        },
        {
          name: "widget3",
        },
      ],
    },
    {
      name: "widget4",
    },
  ],
};

describe("traverseDSLAndMigrate", () => {
  it("should check that migration function is getting called for each widget in the tree", () => {
    const migrateFn = jest.fn();

    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    traverseDSLAndMigrate(dsl as any as DSLWidget, migrateFn);
    expect(migrateFn).toHaveBeenCalledTimes(4);
  });

  it("should check that tree structure remain intact", () => {
    const copyDSL = cloneDeep(dsl);

    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    traverseDSLAndMigrate(dsl as any as DSLWidget, noop);
    expect(dsl).toEqual(copyDSL);
  });

  it("should check that migration function updates are written in the tree", () => {
    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    traverseDSLAndMigrate(dsl as any as DSLWidget, (widget) => {
      widget.type = "widget";
    });

    expect(dsl).toEqual({
      children: [
        {
          name: "widget1",
          type: "widget",
          children: [
            {
              name: "widget2",
              type: "widget",
            },
            {
              name: "widget3",
              type: "widget",
            },
          ],
        },
        {
          name: "widget4",
          type: "widget",
        },
      ],
    });
  });
});

describe("legacy object binding modes", () => {
  it("normalizes a loaded legacy widget without writing a mode into its DSL", async () => {
    const legacyDsl = {
      type: "CANVAS_WIDGET",
      widgetId: "Canvas1",
      widgetName: "Canvas1",
      children: [
        {
          columns: 24,
          rows: 16,
          tableData: "{{GetOrders.data}}",
          type: "TABLE_WIDGET",
          widgetId: "Table1",
          widgetName: "Table1",
        },
      ],
    } as unknown as DSLWidget;
    const originalDsl = cloneDeep(legacyDsl);

    const { dsl: loadedDsl } = await extractCurrentDSL({
      response: {
        data: {
          layouts: [{ id: "layout-1", dsl: legacyDsl }],
        },
      } as never,
    });

    const originalTableDsl = originalDsl.children?.[0];
    const loadedTableDsl = loadedDsl.children?.[0];

    expect(legacyDsl.children?.[0]).toMatchObject(originalTableDsl);
    expect(legacyDsl.children?.[0]).not.toHaveProperty("dataMode");
    expect(loadedTableDsl).toMatchObject(originalTableDsl);
    expect(loadedTableDsl).not.toHaveProperty("dataMode");
    expect(
      normalizeObjectBinding(
        "TABLE_WIDGET",
        loadedTableDsl as Record<string, unknown>,
        { objectTypes: [] },
      ).mode,
    ).toBe("QUERY");
  });
});
