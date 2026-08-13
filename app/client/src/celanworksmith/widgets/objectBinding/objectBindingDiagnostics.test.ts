import { getObjectBindingDiagnostic } from "./objectBindingDiagnostics";

describe("getObjectBindingDiagnostic", () => {
  it.each([
    [
      { code: "MISSING_OBJECT_TYPE" as const },
      "Select an ontology Object Type.",
      "objectTypeId",
      undefined,
    ],
    [
      {
        code: "DELETED_OBJECT_TYPE" as const,
        objectTypeId: "PurchaseOrder",
      },
      'Object Type "PurchaseOrder" is missing or unavailable. Select another Object Type.',
      "objectTypeId",
      "PurchaseOrder",
    ],
    [
      {
        code: "DELETED_PROPERTY" as const,
        objectTypeId: "PurchaseOrder",
        propertyId: "delayDays",
      },
      'Property "PurchaseOrder.delayDays" is missing. Select another Property.',
      "propertyId",
      "delayDays",
    ],
    [
      {
        code: "INCOMPATIBLE_PROPERTY_TYPE" as const,
        expectedDataTypes: ["INTEGER", "DECIMAL"],
        objectTypeId: "PurchaseOrder",
        propertyId: "status",
        receivedDataType: "STRING",
      },
      'Property "PurchaseOrder.status" has type STRING; expected INTEGER or DECIMAL.',
      "propertyId",
      "status",
    ],
  ])(
    "describes %s with a repair target",
    (issue, message, propertyPath, stableId) => {
      expect(getObjectBindingDiagnostic(issue)).toEqual({
        code: issue.code,
        message,
        propertyPath,
        stableId,
      });
    },
  );

  it("returns the first actionable issue", () => {
    expect(
      getObjectBindingDiagnostic([
        { code: "INVALID_SOURCE", source: "UNKNOWN" },
        { code: "MISSING_PROPERTY" },
      ]),
    ).toMatchObject({
      code: "INVALID_SOURCE",
      propertyPath: "source",
    });
  });
});
