import type { CelanworksmithObjectType } from "api/CelanworksmithAPI";
import {
  buildFilter,
  isOperatorAllowed,
  type FilterCondition,
} from "./filterUtils";

const metadata: CelanworksmithObjectType = {
  id: "PurchaseOrder",
  displayName: "Purchase order",
  properties: [
    {
      id: "supplierName",
      displayName: "Supplier",
      dataType: "STRING",
      required: false,
      readOnly: false,
      derived: false,
    },
    {
      id: "amount",
      displayName: "Amount",
      dataType: "DECIMAL",
      required: false,
      readOnly: false,
      derived: false,
    },
    {
      id: "approved",
      displayName: "Approved",
      dataType: "BOOLEAN",
      required: false,
      readOnly: false,
      derived: false,
    },
  ],
};

describe("FilterList filter utilities", () => {
  test.each([
    ["STRING", "equals", true],
    ["STRING", "contains", true],
    ["STRING", "startsWith", true],
    ["INTEGER", "gt", true],
    ["DECIMAL", "lte", true],
    ["DATETIME", "gte", true],
    ["BOOLEAN", "equals", true],
    ["BOOLEAN", "contains", false],
    ["STRING", "gt", false],
  ])("checks %s/%s compatibility", (dataType, operator, expected) => {
    expect(isOperatorAllowed(dataType, operator)).toBe(expected);
  });

  test("rejects unknown properties, incompatible operators, and missing values", () => {
    const invalidConditions: FilterCondition[] = [
      { propertyId: "missing", operator: "equals", value: "x" },
      { propertyId: "supplierName", operator: "gt", value: "x" },
      { propertyId: "supplierName", operator: "contains", value: "" },
    ];

    invalidConditions.forEach((condition) => {
      expect(buildFilter(metadata, [condition]).isValid).toBe(false);
    });
  });

  test("returns the exact versioned structured filter for valid conditions", () => {
    expect(
      buildFilter(metadata, [
        { propertyId: "supplierName", operator: "contains", value: "Acme" },
        { propertyId: "approved", operator: "equals", value: true },
        { propertyId: "amount", operator: "isEmpty" },
      ]),
    ).toEqual({
      isValid: true,
      filter: {
        typeId: "PurchaseOrder",
        conditions: [
          { propertyId: "supplierName", operator: "contains", value: "Acme" },
          { propertyId: "approved", operator: "equals", value: true },
          { propertyId: "amount", operator: "isEmpty" },
        ],
        version: 1,
      },
    });
  });
});
