import {
  parseAdvancedParameters,
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

  it("parses unknown Advanced parameters without Function metadata validation", () => {
    expect(parseAdvancedParameters('{"unknown":"x"}')).toEqual({
      unknown: "x",
    });
  });

  it.each(["{", "[]"])(
    "rejects malformed or non-object Advanced parameters: %s",
    (text) => {
      expect(() => parseAdvancedParameters(text)).toThrow(
        "Advanced Function parameters must be a JSON object",
      );
    },
  );

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
});
