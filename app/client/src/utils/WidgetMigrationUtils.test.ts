import { cloneDeep, noop } from "lodash";
import type { DSLWidget } from "WidgetProvider/types";
import {
  migrateLegacyObjectBindingModes,
  traverseDSLAndMigrate,
} from "./WidgetMigrationUtils";

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

describe("migrateLegacyObjectBindingModes", () => {
  it("sets QUERY only for legacy ontology-capable widgets without a mode", () => {
    const legacyDsl = {
      type: "CANVAS_WIDGET",
      children: [
        { type: "TABLE_WIDGET", tableData: "{{GetOrders.data}}" },
        { formMode: "OBJECT", type: "JSON_FORM_WIDGET" },
        { type: "FORM_WIDGET" },
        { type: "TEXT_WIDGET", text: "unchanged" },
      ],
    } as unknown as DSLWidget;

    expect(migrateLegacyObjectBindingModes(legacyDsl)).toEqual({
      type: "CANVAS_WIDGET",
      children: [
        {
          dataMode: "QUERY",
          tableData: "{{GetOrders.data}}",
          type: "TABLE_WIDGET",
        },
        { formMode: "OBJECT", type: "JSON_FORM_WIDGET" },
        { formMode: "QUERY", type: "FORM_WIDGET" },
        { text: "unchanged", type: "TEXT_WIDGET" },
      ],
    });
  });
});
