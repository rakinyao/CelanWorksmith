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
          legacyColumnWidths: [120, 240],
          legacyTableStyle: { compact: true, zebra: false },
          rows: 16,
          tableData: "{{GetOrders.data}}",
          type: "TABLE_WIDGET",
          widgetId: "Table1",
          widgetName: "Table1",
        },
      ],
    } as unknown as DSLWidget;
    const originalDsl = cloneDeep(legacyDsl);
    const expectedLoadedTableDsl = {
      accentColor: "{{appsmith.theme.colors.primaryColor}}",
      borderRadius: "0px",
      bottomRow: Number.NaN,
      boxShadow: "none",
      childStylesheet: {
        button: {
          borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
          boxShadow: "none",
          buttonColor: "{{appsmith.theme.colors.primaryColor}}",
        },
        iconButton: {
          borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
          boxShadow: "none",
          menuColor: "{{appsmith.theme.colors.primaryColor}}",
        },
        menuButton: {
          borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
          boxShadow: "none",
          menuColor: "{{appsmith.theme.colors.primaryColor}}",
        },
      },
      children: undefined,
      columnOrder: [],
      columns: 24,
      defaultSelectedRow: undefined,
      delimiter: ",",
      derivedColumns: {},
      dynamicBindingPathList: [{ key: "tableData" }, { key: "accentColor" }],
      dynamicTriggerPathList: [],
      fontStyle: "REGULAR",
      horizontalAlignment: "LEFT",
      isSortable: true,
      isVisibleDownload: true,
      isVisibleFilters: true,
      isVisiblePagination: true,
      isVisibleSearch: true,
      labelTextSize: "0.875rem",
      leftColumn: Number.NaN,
      legacyColumnWidths: [120, 240],
      legacyTableStyle: { compact: true, zebra: false },
      migrated: false,
      primaryColumns: {},
      rightColumn: Number.NaN,
      rows: 16,
      tableData: "{{GetOrders.data}}",
      textSize: "0.875rem",
      topRow: Number.NaN,
      type: "TABLE_WIDGET",
      version: 3,
      verticalAlignment: "CENTER",
      widgetId: "Table1",
      widgetName: "Table1",
    };

    const { dsl: loadedDsl } = await extractCurrentDSL({
      response: {
        data: {
          layouts: [{ id: "layout-1", dsl: legacyDsl }],
        },
      } as never,
    });

    const loadedTableDsl = loadedDsl.children?.[0] as Record<string, unknown>;

    expect(legacyDsl).toEqual(originalDsl);
    expect(loadedTableDsl).toEqual(expectedLoadedTableDsl);
    expect(
      normalizeObjectBinding("TABLE_WIDGET", loadedTableDsl, {
        objectTypes: [],
      }).mode,
    ).toBe("QUERY");
    expect(loadedTableDsl).toEqual(expectedLoadedTableDsl);
  });
});
