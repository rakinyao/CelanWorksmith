import {
  hydrateCapabilityBuilderForm,
  parseAdvancedCapabilityDefinition,
  serializeCapabilityBuilderForm,
  validateCapabilityDefinition,
  type OntologyCapabilityMetadata,
} from "./ontologyCapabilityQueryDefinition";

const functionMetadata: OntologyCapabilityMetadata = {
  capabilities: [
    {
      id: "CalculateDelayDays",
      parameters: [
        { id: "delayDays", required: true },
        { id: "internalToken", readOnly: true },
      ],
    },
  ],
};

const actionMetadata: OntologyCapabilityMetadata = {
  capabilities: [
    {
      id: "ReschedulePurchaseOrder",
      parameters: [{ id: "newDeliveryDate", required: true }],
    },
  ],
};

describe("ontology capability query definition", () => {
  it.each([
    ["FUNCTION_QUERY", "functionId", "CalculateDelayDays", functionMetadata],
    ["ACTION_QUERY", "actionId", "ReschedulePurchaseOrder", actionMetadata],
  ] as const)(
    "serializes %s Builder target and parameters without protected selectors",
    (operation, capabilityField, capabilityId, metadata) => {
      expect(
        serializeCapabilityBuilderForm(
          {
            objectTypeId: { data: "PurchaseOrder" },
            [capabilityField]: { data: capabilityId },
            target: {
              data: {
                source: "SINGLE_OBJECT",
                objectId: "{{Table1.selectedRow.id}}",
              },
            },
            parameters: {
              data:
                operation === "FUNCTION_QUERY"
                  ? { delayDays: 5 }
                  : { newDeliveryDate: "2026-08-30" },
            },
          },
          operation,
          metadata,
        ),
      ).toBe(
        '{"target":{"source":"SINGLE_OBJECT","objectId":"{{Table1.selectedRow.id}}"},"parameters":' +
          (operation === "FUNCTION_QUERY"
            ? '{"delayDays":5}'
            : '{"newDeliveryDate":"2026-08-30"}') +
          "}",
      );
    },
  );

  it("serializes a zero-parameter Function when its control has not written form data", () => {
    expect(
      serializeCapabilityBuilderForm(
        {
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "CalculateDelayDays" },
          target: {
            data: {
              source: "SINGLE_OBJECT",
              objectId: "{{Table1.selectedRow.id}}",
            },
          },
        },
        "FUNCTION_QUERY",
        {
          capabilities: [{ id: "CalculateDelayDays", parameters: [] }],
        },
      ),
    ).toBe(
      '{"target":{"source":"SINGLE_OBJECT","objectId":"{{Table1.selectedRow.id}}"},"parameters":{}}',
    );
  });

  it("preserves the canonical zero-parameter capability query JSON", () => {
    expect(
      serializeCapabilityBuilderForm(
        {
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "CalculateDelayDays" },
          target: {
            data: { source: "SINGLE_OBJECT", objectId: "PO002" },
          },
        },
        "FUNCTION_QUERY",
        {
          capabilities: [{ id: "CalculateDelayDays", parameters: [] }],
        },
      ),
    ).toBe(
      '{"target":{"source":"SINGLE_OBJECT","objectId":"PO002"},"parameters":{}}',
    );
  });

  it("does not assume an unverified capability has zero parameters", () => {
    expect(() =>
      serializeCapabilityBuilderForm(
        {
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "UnverifiedFunction" },
          target: {
            data: {
              source: "SINGLE_OBJECT",
              objectId: "{{Table1.selectedRow.id}}",
            },
          },
        },
        "FUNCTION_QUERY",
      ),
    ).toThrow("Ontology capability parameters must be a JSON object");
  });

  it("hydrates Advanced target and parameters into Builder controls", () => {
    expect(
      hydrateCapabilityBuilderForm({
        target: { source: "SINGLE_OBJECT", objectId: "PO002" },
        parameters: { delayDays: 5 },
      }),
    ).toEqual({
      "actionConfiguration.formData.target.data": {
        mode: "MANUAL",
        cardinality: "ONE",
        expression: "PO002",
      },
      "actionConfiguration.formData.parameters.data": { delayDays: 5 },
    });
  });

  it("serializes a Function many-target binding without Builder metadata", () => {
    expect(
      serializeCapabilityBuilderForm(
        {
          objectTypeId: { data: "Contract" },
          functionId: { data: "CalculateContractGrossAmount" },
          target: {
            data: {
              mode: "WIDGET",
              widgetId: "table-id",
              cardinality: "MANY",
              expression:
                "{{ContractsTable.selectedRows.map((row) => row.contract_id)}}",
            },
          },
          parameters: { data: {} },
        },
        "FUNCTION_QUERY",
        {
          capabilities: [
            { id: "CalculateContractGrossAmount", parameters: [] },
          ],
        },
      ),
    ).toBe(
      '{"target":{"source":"OBJECT_SET","objectIds":"{{ContractsTable.selectedRows.map((row) => row.contract_id)}}"},"parameters":{}}',
    );
  });

  it("serializes a manual literal target without storing widget metadata", () => {
    expect(
      serializeCapabilityBuilderForm(
        {
          objectTypeId: { data: "PurchaseOrder" },
          functionId: { data: "CalculateDelayDays" },
          target: {
            data: {
              mode: "MANUAL",
              cardinality: "ONE",
              expression: "PO002",
            },
          },
          parameters: { data: { delayDays: 5 } },
        },
        "FUNCTION_QUERY",
        functionMetadata,
      ),
    ).toBe(
      '{"target":{"source":"SINGLE_OBJECT","objectId":"PO002"},"parameters":{"delayDays":5}}',
    );
  });

  it("hydrates a Function object set into manual array-expression metadata", () => {
    expect(
      hydrateCapabilityBuilderForm({
        target: { source: "OBJECT_SET", objectIds: ["C1", "C2"] },
        parameters: {},
      }),
    ).toEqual({
      "actionConfiguration.formData.target.data": {
        mode: "MANUAL",
        cardinality: "MANY",
        expression: '["C1","C2"]',
      },
      "actionConfiguration.formData.parameters.data": {},
    });
  });

  it("rejects a many-target Action Builder binding", () => {
    expect(() =>
      serializeCapabilityBuilderForm(
        {
          objectTypeId: { data: "Contract" },
          actionId: { data: "ReschedulePurchaseOrder" },
          target: {
            data: {
              mode: "WIDGET",
              widgetId: "table-id",
              cardinality: "MANY",
              expression: "{{ContractsTable.selectedRows}}",
            },
          },
          parameters: { data: { newDeliveryDate: "2026-08-30" } },
        },
        "ACTION_QUERY",
        actionMetadata,
      ),
    ).toThrow("Action query Builder supports only one target");
  });

  it.each([
    ["invalid JSON", "{"],
    [
      "a protected function selector",
      '{"functionId":"forged","target":{"source":"SINGLE_OBJECT","objectId":"PO002"},"parameters":{}}',
    ],
    [
      "a protected action selector",
      '{"actionId":"forged","target":{"source":"SINGLE_OBJECT","objectId":"PO002"},"parameters":{}}',
    ],
    [
      "a protected owner selector",
      '{"objectTypeId":"Supplier","target":{"source":"SINGLE_OBJECT","objectId":"PO002"},"parameters":{}}',
    ],
    [
      "a blank object ID",
      '{"target":{"source":"SINGLE_OBJECT","objectId":"   "},"parameters":{}}',
    ],
  ])("rejects Advanced definition with %s", (_reason, text) => {
    expect(() => parseAdvancedCapabilityDefinition(text)).toThrow();
  });

  it("rejects an incompatible capability and unwritable parameters", () => {
    expect(
      validateCapabilityDefinition(
        {
          target: { source: "SINGLE_OBJECT", objectId: "PO002" },
          parameters: { internalToken: "forged" },
        },
        "FUNCTION_QUERY",
        "UnknownFunction",
        functionMetadata,
      ),
    ).toEqual({
      valid: false,
      errorId: "invalidDefinition",
      message: "Unknown Function: UnknownFunction",
    });

    expect(
      validateCapabilityDefinition(
        {
          target: { source: "SINGLE_OBJECT", objectId: "PO002" },
          parameters: { delayDays: 5, internalToken: "forged" },
        },
        "FUNCTION_QUERY",
        "CalculateDelayDays",
        functionMetadata,
      ),
    ).toEqual({
      valid: false,
      errorId: "invalidDefinition",
      message: "Function parameter is not writable: internalToken",
    });
  });
});
