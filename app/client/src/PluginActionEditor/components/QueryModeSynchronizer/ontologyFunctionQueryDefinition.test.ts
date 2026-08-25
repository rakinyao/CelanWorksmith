import {
  hydrateBuilderForm,
  parseAdvancedDefinition,
  serializeFunctionBuilderForm,
  validateDefinition,
  type OntologyFunctionMetadata,
} from "./ontologyFunctionQueryDefinition";

const metadata: OntologyFunctionMetadata = {
  functions: [
    {
      id: "CalculateDelayDays",
      parameters: [
        { id: "poId", required: true },
        { id: "requestId" },
        { id: "internalToken", readOnly: true },
        { id: "derivedScore", derived: true },
      ],
    },
  ],
};

describe("ontology function query definition", () => {
  it("serializes writable Builder parameters into canonical JSON", () => {
    expect(
      serializeFunctionBuilderForm(
        {
          functionId: { data: "CalculateDelayDays" },
          parameters: { data: { poId: "{{Table1.selectedRow.id}}" } },
        },
        metadata,
      ),
    ).toBe(
      JSON.stringify({
        functionId: "CalculateDelayDays",
        parameters: { poId: "{{Table1.selectedRow.id}}" },
      }),
    );
  });

  it("hydrates valid Advanced JSON into the Function Builder controls", () => {
    const definition = parseAdvancedDefinition(
      '{"functionId":"CalculateDelayDays","parameters":{"poId":"{{Table1.selectedRow.id}}"}}',
    );

    expect(validateDefinition(definition, metadata)).toEqual({
      valid: true,
      definition: {
        functionId: "CalculateDelayDays",
        parameters: { poId: "{{Table1.selectedRow.id}}" },
      },
    });
    expect(hydrateBuilderForm(definition)).toEqual({
      "actionConfiguration.formData.functionId.data": "CalculateDelayDays",
      "actionConfiguration.formData.parameters.data": {
        poId: "{{Table1.selectedRow.id}}",
      },
    });
  });

  it("rejects an absent Function ID", () => {
    expect(() =>
      parseAdvancedDefinition('{"parameters":{"poId":"purchase-order"}}'),
    ).toThrow("Function query definition requires functionId");
  });

  it("rejects an untrimmed Function ID", () => {
    expect(() =>
      parseAdvancedDefinition(
        '{"functionId":" CalculateDelayDays ","parameters":{"poId":"purchase-order"}}',
      ),
    ).toThrow("Function query definition requires functionId");
  });

  it("rejects an absent writable required parameter", () => {
    const result = validateDefinition(
      { functionId: "CalculateDelayDays", parameters: {} },
      metadata,
    );

    expect(result).toEqual({
      valid: false,
      message: "Missing required Function parameter: poId",
    });
  });

  it("rejects an unknown parameter ID", () => {
    const result = validateDefinition(
      {
        functionId: "CalculateDelayDays",
        parameters: { poId: "purchase-order", unknown: "value" },
      },
      metadata,
    );

    expect(result).toEqual({
      valid: false,
      message: "Unknown Function parameter: unknown",
    });
  });

  it.each([
    ["read-only", "internalToken"],
    ["derived", "derivedScore"],
  ])("rejects supplied %s parameters", (_kind, parameterId) => {
    const result = validateDefinition(
      {
        functionId: "CalculateDelayDays",
        parameters: { poId: "purchase-order", [parameterId]: "value" },
      },
      metadata,
    );

    expect(result).toEqual({
      valid: false,
      message: `Function parameter is not writable: ${parameterId}`,
    });
  });

  it("rejects unsupported Function definition fields", () => {
    expect(() =>
      parseAdvancedDefinition(
        '{"functionId":"CalculateDelayDays","parameters":{},"resultMode":"ROWS"}',
      ),
    ).toThrow("Unsupported field in Function query definition: resultMode");
  });
});
