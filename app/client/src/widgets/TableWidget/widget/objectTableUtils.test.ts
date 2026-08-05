import type { CelanworksmithObjectType } from "api/CelanworksmithAPI";
import {
  createObjectTableQueryRequest,
  getObjectTableColumns,
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
    ).toEqual([{ id: "PO001", typeId: "PurchaseOrder", status: "DELAYED" }]);
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
});
