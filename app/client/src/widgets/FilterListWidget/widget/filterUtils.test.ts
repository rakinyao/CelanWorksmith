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
    {
      id: "status",
      displayName: "Status",
      dataType: "ENUM",
      required: false,
      readOnly: false,
      derived: false,
      enumValues: ["OPEN", "CLOSED"],
    },
    {
      id: "supplierId",
      displayName: "Supplier ID",
      dataType: "STRING",
      required: false,
      readOnly: false,
      derived: false,
      referenceTypeId: "Supplier",
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
    ["ENUM", "equals", true],
    ["ENUM", "contains", false],
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

  test("rejects non-finite decimal values", () => {
    expect(
      buildFilter(metadata, [
        { propertyId: "amount", operator: "equals", value: Number.NaN },
      ]).isValid,
    ).toBe(false);
    expect(
      buildFilter(metadata, [
        {
          propertyId: "amount",
          operator: "equals",
          value: Number.POSITIVE_INFINITY,
        },
      ]).isValid,
    ).toBe(false);
  });

  test("rejects enum values outside the Object Type metadata", () => {
    expect(
      buildFilter(metadata, [
        { propertyId: "status", operator: "equals", value: "UNKNOWN" },
      ]).isValid,
    ).toBe(false);
  });
});
