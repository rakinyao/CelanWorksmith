import type { CelanworksmithObjectType } from "api/CelanworksmithAPI";
import {
  createObjectTableQueryRequest,
  getObjectTableColumns,
  getObjectTablePrimaryColumns,
  getObjectTableReactColumns,
  getObjectTableRows,
} from "./objectTableUtils";

const metadata: CelanworksmithObjectType = {
  id: "PurchaseOrder",
  displayName: "Purchase order",
  properties: [
    {
      id: "status",
      displayName: "Order status",
      dataType: "STRING",
      required: false,
      readOnly: false,
      derived: false,
    },
  ],
};

describe("Object Table utilities", () => {
  test("uses stable property IDs and display names for columns", () => {
    expect(getObjectTableColumns(metadata)).toEqual([
      { id: "id", label: "ID", dataType: "STRING" },
      { id: "status", label: "Order status", dataType: "STRING" },
    ]);
  });

  test("flattens object properties for the existing table row shape", () => {
    expect(
      getObjectTableRows({
        typeId: "PurchaseOrder",
        items: [
          {
            id: "PO001",
            typeId: "PurchaseOrder",
            properties: { status: "DELAYED" },
          },
        ],
        offset: 0,
        limit: 10,
        total: 1,
      }),
    ).toEqual([
      {
        id: "PO001",
        typeId: "PurchaseOrder",
        status: "DELAYED",
        __object: {
          id: "PO001",
          typeId: "PurchaseOrder",
          properties: { status: "DELAYED" },
        },
      },
    ]);
  });

  test("creates a server-side page, sort, and filter request", () => {
    expect(
      createObjectTableQueryRequest(
        "Table1",
        "PurchaseOrder",
        3,
        10,
        { column: "status", order: "desc" },
        { typeId: "PurchaseOrder", conditions: [], version: 1 },
      ),
    ).toEqual({
      widgetId: "Table1",
      typeId: "PurchaseOrder",
      query: {
        offset: 20,
        limit: 10,
        sortBy: "status",
        sortDirection: "desc",
        filter: { typeId: "PurchaseOrder", conditions: [], version: 1 },
      },
    });
  });

  test("includes search text and normalizes an incomplete page request", () => {
    expect(
      createObjectTableQueryRequest(
        "Table1",
        "PurchaseOrder",
        Number.NaN,
        0,
        { column: "", order: null },
        undefined,
        undefined,
        "PO005",
      ),
    ).toEqual({
      widgetId: "Table1",
      typeId: "PurchaseOrder",
      query: {
        offset: 0,
        limit: 10,
        searchText: "PO005",
      },
    });
  });

  test("uses persisted column configuration for object table presentation", () => {
    const columns = getObjectTableReactColumns(metadata, {
      id: {
        id: "id",
        index: 0,
        width: 180,
        columnType: "text",
        isVisible: false,
        isDerived: false,
        computedValue: '{{currentRow["id"]}}',
        label: "Order ID",
      },
    });

    expect(columns[0]).toMatchObject({
      Header: "Order ID",
      isHidden: true,
      width: 180,
    });
  });

  test("creates native table column bindings that remain valid after switching to Query mode", () => {
    const columns = getObjectTablePrimaryColumns(metadata, undefined, "Table1");

    expect(columns).toMatchObject({
      id: {
        alias: "id",
        computedValue:
          '{{(() => { const tableData = Table1.processedTableData || []; return tableData.length > 0 ? tableData.map((currentRow) => (currentRow["id"])) : "id" })()}}',
        originalId: "id",
      },
      status: {
        alias: "status",
        computedValue:
          '{{(() => { const tableData = Table1.processedTableData || []; return tableData.length > 0 ? tableData.map((currentRow) => (currentRow["status"])) : "status" })()}}',
        originalId: "status",
      },
    });
  });

  test("upgrades legacy object column bindings without discarding user configuration", () => {
    const columns = getObjectTablePrimaryColumns(
      metadata,
      {
        status: {
          computedValue: '{{currentRow["status"]}}',
          id: "status",
          isVisible: false,
          label: "Order state",
          width: 240,
        },
      },
      "Table1",
    );

    expect(columns).toMatchObject({
      status: {
        alias: "status",
        computedValue:
          '{{(() => { const tableData = Table1.processedTableData || []; return tableData.length > 0 ? tableData.map((currentRow) => (currentRow["status"])) : "status" })()}}',
        isVisible: false,
        label: "Order state",
        originalId: "status",
        width: 240,
      },
    });
  });
});
