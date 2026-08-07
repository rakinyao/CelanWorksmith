import { validateObjectBinding } from "./objectBindingValidation";

const metadata = {
  objectTypes: [
    {
      id: "PurchaseOrder",
      displayName: "Purchase Order",
      properties: [
        {
          id: "delayDays",
          displayName: "Delay days",
          dataType: "INTEGER",
          required: false,
          readOnly: false,
          derived: false,
        },
        {
          id: "supplierName",
          displayName: "Supplier name",
          dataType: "STRING",
          required: false,
          readOnly: false,
          derived: false,
        },
      ],
    },
  ],
};

describe("validateObjectBinding", () => {
  it("reports a missing Object Type", () => {
    expect(validateObjectBinding({}, metadata)).toEqual([
      { code: "MISSING_OBJECT_TYPE" },
    ]);
  });

  it("preserves and reports a deleted Object Type ID", () => {
    expect(
      validateObjectBinding({ objectTypeId: "DeletedType" }, metadata),
    ).toEqual([{ code: "DELETED_OBJECT_TYPE", objectTypeId: "DeletedType" }]);
  });

  it("reports a missing configured Property", () => {
    expect(
      validateObjectBinding(
        { displayPropertyId: "", objectTypeId: "PurchaseOrder" },
        metadata,
      ),
    ).toEqual([{ code: "MISSING_PROPERTY" }]);
  });

  it("reports a deleted Property ID", () => {
    expect(
      validateObjectBinding(
        { objectTypeId: "PurchaseOrder", valuePropertyId: "deletedProperty" },
        metadata,
      ),
    ).toEqual([
      {
        code: "DELETED_PROPERTY",
        objectTypeId: "PurchaseOrder",
        propertyId: "deletedProperty",
      },
    ]);
  });

  it("reports incompatible configured Property data types", () => {
    expect(
      validateObjectBinding(
        {
          objectTypeId: "PurchaseOrder",
          propertyDataTypes: { valuePropertyId: ["INTEGER", "DECIMAL"] },
          valuePropertyId: "supplierName",
        },
        metadata,
      ),
    ).toEqual([
      {
        code: "INCOMPATIBLE_PROPERTY_TYPE",
        expectedDataTypes: ["INTEGER", "DECIMAL"],
        propertyId: "supplierName",
        receivedDataType: "STRING",
      },
    ]);
  });

  it("reports an invalid source without replacing it", () => {
    expect(
      validateObjectBinding(
        { objectTypeId: "PurchaseOrder", source: "QUERY_RESULT" },
        metadata,
      ),
    ).toEqual([{ code: "INVALID_SOURCE", source: "QUERY_RESULT" }]);
  });

  it("accepts a valid PurchaseOrder.delayDays binding", () => {
    expect(
      validateObjectBinding(
        {
          objectTypeId: "PurchaseOrder",
          propertyDataTypes: { valuePropertyId: "INTEGER" },
          valuePropertyId: "delayDays",
        },
        metadata,
      ),
    ).toEqual([]);
  });
});
