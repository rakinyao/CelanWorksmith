import { normalizeObjectBinding } from "./normalizeObjectBinding";

const metadata = {
  objectTypes: [
    {
      id: "PurchaseOrder",
      displayName: "Purchase Order",
      properties: [],
    },
  ],
};

describe("normalizeObjectBinding", () => {
  it("normalizes a legacy widget without dataMode to QUERY without changing its DSL", () => {
    const widgetProps = {
      legacyTableStyle: { compact: true, zebra: false },
      objectTypeId: "PurchaseOrder",
      tableData: "{{GetOrders.data}}",
    };

    expect(
      normalizeObjectBinding("TABLE_WIDGET", widgetProps, metadata),
    ).toEqual({
      mode: "QUERY",
      binding: { objectTypeId: "PurchaseOrder", source: "ALL" },
      issues: [],
    });
    expect(widgetProps).toEqual({
      legacyTableStyle: { compact: true, zebra: false },
      objectTypeId: "PurchaseOrder",
      tableData: "{{GetOrders.data}}",
    });
  });

  it("keeps an explicit OBJECT dataMode and object type ID", () => {
    expect(
      normalizeObjectBinding(
        "TABLE_WIDGET",
        { dataMode: "OBJECT", objectTypeId: "PurchaseOrder" },
        metadata,
      ),
    ).toEqual({
      mode: "OBJECT",
      binding: { objectTypeId: "PurchaseOrder", source: "ALL" },
      issues: [],
    });
  });

  it("prefers an explicit object type ID over an inferred expression type", () => {
    expect(
      normalizeObjectBinding(
        "OBJECT_DETAIL_WIDGET",
        {
          mode: "OBJECT",
          objectData: "{{Table1.selectedObject}}",
          objectTypeId: "PurchaseOrder",
        },
        {
          ...metadata,
          dataTree: {
            Table1: { selectedObject: { id: "1", typeId: "Invoice" } },
          },
        },
      ),
    ).toEqual({
      mode: "OBJECT",
      binding: {
        objectPath: "{{Table1.selectedObject}}",
        objectTypeId: "PurchaseOrder",
        source: "INSTANCE",
      },
      issues: [],
    });
  });

  it("infers a type from a recognized FilterList filter", () => {
    expect(
      normalizeObjectBinding(
        "FILTER_LIST_WIDGET",
        {
          dataMode: "OBJECT",
          filter: { conditions: [], typeId: "PurchaseOrder", version: 1 },
        },
        metadata,
      ),
    ).toEqual({
      mode: "OBJECT",
      binding: {
        filter: { conditions: [], typeId: "PurchaseOrder", version: 1 },
        objectTypeId: "PurchaseOrder",
        source: "FILTER",
      },
      issues: [],
    });
  });

  it("does not infer a type from an unstructured filter with only a type ID", () => {
    expect(
      normalizeObjectBinding(
        "FILTER_LIST_WIDGET",
        {
          dataMode: "OBJECT",
          filter: { typeId: "PurchaseOrder" },
        },
        metadata,
      ),
    ).toEqual({
      mode: "OBJECT",
      binding: {
        filter: { typeId: "PurchaseOrder" },
        source: "FILTER",
      },
      issues: [{ code: "MISSING_OBJECT_TYPE" }],
    });
  });

  it("does not guess an object type for an unknown expression", () => {
    expect(
      normalizeObjectBinding(
        "OBJECT_DETAIL_WIDGET",
        { mode: "OBJECT", objectData: "{{Unknown.data}}" },
        metadata,
      ),
    ).toEqual({
      mode: "OBJECT",
      binding: { objectPath: "{{Unknown.data}}", source: "INSTANCE" },
      issues: [{ code: "MISSING_OBJECT_TYPE" }],
    });
  });

  it("recognizes explicit Object mode for collection and selection widgets", () => {
    expect(
      normalizeObjectBinding(
        "SELECT_WIDGET",
        { dataMode: "OBJECT", objectTypeId: "PurchaseOrder" },
        metadata,
      ),
    ).toMatchObject({ mode: "OBJECT", issues: [] });
    expect(
      normalizeObjectBinding(
        "LIST_WIDGET_V2",
        { objectTypeId: "PurchaseOrder", listData: "{{Query1.data}}" },
        metadata,
      ),
    ).toMatchObject({ mode: "QUERY", issues: [] });
  });
});
