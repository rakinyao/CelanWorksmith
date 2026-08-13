import type {
  CelanworksmithAction,
  CelanworksmithProperty,
} from "api/CelanworksmithAPI";
import {
  validateActionBinding,
  validateFieldValue,
  validateFieldValues,
} from "./objectActionValidation";

const property = (
  overrides: Partial<CelanworksmithProperty> &
    Pick<CelanworksmithProperty, "id" | "dataType">,
): CelanworksmithProperty => ({
  displayName: overrides.id,
  derived: false,
  readOnly: false,
  required: false,
  ...overrides,
});

const action: CelanworksmithAction = {
  displayName: "Update order",
  id: "update_order",
  objectTypeId: "PurchaseOrder",
  parameters: [],
  requiresConfirmation: false,
};

describe("ontology field validation", () => {
  test.each([
    ["STRING", "hello"],
    ["INTEGER", 3],
    ["DECIMAL", 3.14],
    ["BOOLEAN", false],
    ["DATETIME", "2026-08-10T12:00:00Z"],
    ["ENUM", "DELAYED"],
    ["REFERENCE", "Supplier/S001"],
  ] as const)("accepts valid %s values", (dataType, value) => {
    expect(
      validateFieldValue(value, property({ dataType, id: "value" })),
    ).toEqual([]);
  });

  test("returns a stable field path and readable type error", () => {
    expect(
      validateFieldValue(
        "3",
        property({
          dataType: "INTEGER",
          displayName: "Quantity",
          id: "quantity",
        }),
        { path: "parameters", objectTypeId: "PurchaseOrder" },
      ),
    ).toEqual([
      expect.objectContaining({
        code: "TYPE_MISMATCH",
        message: expect.stringContaining("PurchaseOrder.quantity"),
        path: "parameters.quantity",
      }),
    ]);
  });

  test("validates required, enum, reference, and range constraints", () => {
    expect(
      validateFieldValue(
        "",
        property({ dataType: "STRING", id: "name", required: true }),
      )[0],
    ).toMatchObject({ code: "REQUIRED", path: "name" });
    expect(
      validateFieldValue(
        "UNKNOWN",
        property({ dataType: "ENUM", enumValues: ["LOW", "HIGH"], id: "risk" }),
      )[0],
    ).toMatchObject({ code: "INVALID_ENUM", path: "risk" });
    expect(
      validateFieldValue(
        7,
        property({ dataType: "REFERENCE", id: "supplierId" }),
      )[0],
    ).toMatchObject({ code: "TYPE_MISMATCH", path: "supplierId" });
    expect(
      validateFieldValue(
        11,
        property({ dataType: "INTEGER", id: "quantity", maximum: 10 } as never),
      )[0],
    ).toMatchObject({ code: "MAX_VALUE", path: "quantity" });
  });

  test("rejects edits to read-only and derived fields", () => {
    expect(
      validateFieldValue(
        "locked",
        property({ dataType: "STRING", id: "locked", readOnly: true }),
      )[0],
    ).toMatchObject({ code: "READ_ONLY", path: "locked" });
    expect(
      validateFieldValue(
        8,
        property({ dataType: "INTEGER", id: "delayDays", derived: true }),
      )[0],
    ).toMatchObject({ code: "DERIVED", path: "delayDays" });
  });

  test("accepts unedited read-only and derived values but rejects edits", () => {
    const lockedProperty = property({
      dataType: "STRING",
      id: "locked",
      readOnly: true,
    });

    expect(
      validateFieldValue("original", lockedProperty, {
        uneditedValue: "original",
      }),
    ).toEqual([]);
    expect(
      validateFieldValue("edited", lockedProperty, {
        uneditedValue: "original",
      })[0],
    ).toMatchObject({ code: "READ_ONLY", path: "locked" });

    const derivedProperty = property({
      dataType: "INTEGER",
      id: "delayDays",
      derived: true,
    });

    expect(
      validateFieldValue(8, derivedProperty, { uneditedValue: 8 }),
    ).toEqual([]);
    expect(
      validateFieldValue(9, derivedProperty, { uneditedValue: 8 })[0],
    ).toMatchObject({ code: "DERIVED", path: "delayDays" });
  });

  test("returns all field issues in metadata order and summarizes the first", () => {
    const result = validateFieldValues(
      { amount: "bad", status: "UNKNOWN" },
      [
        property({ dataType: "DECIMAL", id: "amount", required: true }),
        property({ dataType: "ENUM", enumValues: ["CONFIRMED"], id: "status" }),
      ],
      { path: "properties", objectTypeId: "PurchaseOrder" },
    );

    expect(result.issues).toHaveLength(2);
    expect(result.firstIssue).toMatchObject({ path: "properties.amount" });
    expect(result.summary).toContain("properties.amount");
  });
});

describe("Action parameter validation", () => {
  test("maps every invalid parameter to parameters.<stable id> and exposes the first fix", () => {
    const typedAction: CelanworksmithAction = {
      ...action,
      parameters: [
        property({ dataType: "STRING", id: "comment", required: true }),
        property({ dataType: "INTEGER", id: "quantity", required: true }),
      ],
    };

    const result = validateActionBinding(typedAction, {
      objectData: { id: "PO001", typeId: "PurchaseOrder" },
      parameters: { comment: "", quantity: "bad" },
    });

    expect(result).toMatchObject({
      valid: false,
      firstIssue: { path: "parameters.comment" },
      errorPath: "parameters.comment",
    });
    expect(result.issues).toEqual([
      expect.objectContaining({ path: "parameters.comment" }),
      expect.objectContaining({ path: "parameters.quantity" }),
    ]);
    expect(result.summary).toContain("parameters.comment");
  });
});
