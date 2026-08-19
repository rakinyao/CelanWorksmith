import {
  normalizeDefinition,
  parseAdvancedDefinition,
  serializeBuilderForm,
  validateDefinition,
  hydrateBuilderForm,
  type OntologyObjectQueryDefinition,
  type OntologyQueryMetadata,
} from "./ontologyObjectQueryDefinition";

const metadata: OntologyQueryMetadata = {
  objectTypes: [
    {
      id: "PurchaseOrder",
      properties: [
        { id: "id", operators: [{ value: "eq" }] },
        {
          id: "delayDays",
          operators: [
            { value: "gt" },
            { value: "lt", requiresValue: true },
            { value: "isEmpty", requiresValue: false },
          ],
        },
        { id: "internalNote", hidden: true, operators: [{ value: "eq" }] },
      ],
    },
  ],
};

describe("ontology object query definition", () => {
  it("serializes Builder fields into stable canonical JSON", () => {
    expect(
      serializeBuilderForm({
        page: {
          data: {
            limit: "{{Table1.pageSize}}",
            offset: "{{Table1.pageOffset}}",
          },
        },
        projection: { data: ["id", "delayDays"] },
        objectTypeId: { data: "PurchaseOrder" },
        sort: {
          data: [{ direction: "DESC", propertyId: "delayDays" }],
        },
        filter: {
          data: {
            conditions: [
              {
                value: "{{Table1.searchText}}",
                operator: "contains",
                propertyId: "supplierId",
              },
            ],
          },
        },
      }),
    ).toBe(
      '{"objectTypeId":"PurchaseOrder","projection":["id","delayDays"],"filter":{"conditions":[{"propertyId":"supplierId","operator":"contains","value":"{{Table1.searchText}}"}]},"sort":[{"propertyId":"delayDays","direction":"DESC"}],"page":{"offset":"{{Table1.pageOffset}}","limit":"{{Table1.pageSize}}"}}',
    );
  });

  it("omits empty optional Builder fields", () => {
    expect(
      serializeBuilderForm({
        objectTypeId: { data: "Supplier" },
        projection: { data: [] },
        filter: { data: { conditions: [] } },
        sort: { data: [] },
      }),
    ).toBe('{"objectTypeId":"Supplier"}');
  });

  it("normalizes optional empty values without evaluating bindings", () => {
    const definition: OntologyObjectQueryDefinition = {
      objectTypeId: "PurchaseOrder",
      projection: [],
      filter: { conditions: [] },
      sort: [],
      page: { offset: "{{Table1.pageOffset}}", limit: "{{Table1.pageSize}}" },
    };

    expect(normalizeDefinition(definition)).toEqual({
      objectTypeId: "PurchaseOrder",
      page: { offset: "{{Table1.pageOffset}}", limit: "{{Table1.pageSize}}" },
    });
  });

  it("parses Advanced JSON into the canonical definition", () => {
    expect(
      parseAdvancedDefinition(
        '{"objectTypeId":"PurchaseOrder","filter":{"conditions":[{"propertyId":"delayDays","operator":"gt","value":0}]},"page":{"offset":"{{Table1.pageOffset}}","limit":50}}',
      ),
    ).toEqual({
      objectTypeId: "PurchaseOrder",
      filter: {
        conditions: [{ propertyId: "delayDays", operator: "gt", value: 0 }],
      },
      page: { offset: "{{Table1.pageOffset}}", limit: 50 },
    });
  });

  it("preserves dynamic sort bindings for Advanced to Builder round-trips", () => {
    const result = validateDefinition(
      {
        objectTypeId: "PurchaseOrder",
        sort: [
          {
            propertyId: '{{Table1.sortColumn || "delayDays"}}',
            direction: '{{Table1.isAscending ? "ASC" : "DESC"}}',
          },
        ],
      },
      metadata,
    );

    expect(result).toEqual({
      valid: true,
      definition: {
        objectTypeId: "PurchaseOrder",
        sort: [
          {
            propertyId: '{{Table1.sortColumn || "delayDays"}}',
            direction: '{{Table1.isAscending ? "ASC" : "DESC"}}',
          },
        ],
      },
    });
  });

  it("serializes and hydrates the object query result mode", () => {
    const definition = serializeBuilderForm({
      objectTypeId: { data: "PurchaseOrder" },
      resultMode: { data: "TOTAL" },
    });

    expect(definition).toBe(
      '{"objectTypeId":"PurchaseOrder","resultMode":"TOTAL"}',
    );
    expect(hydrateBuilderForm(JSON.parse(definition))).toMatchObject({
      "actionConfiguration.formData.resultMode.data": "TOTAL",
    });
  });

  it("hydrates every Builder field and preserves dynamic bindings", () => {
    expect(
      hydrateBuilderForm({
        objectTypeId: "PurchaseOrder",
        projection: ["id", "delayDays"],
        filter: {
          conditions: [
            {
              propertyId: "delayDays",
              operator: "gt",
              value: "{{Table1.searchText}}",
            },
          ],
        },
        sort: [{ propertyId: "delayDays", direction: "DESC" }],
        page: {
          offset: "{{Table1.pageOffset}}",
          limit: "{{Table1.pageSize}}",
        },
      }),
    ).toEqual({
      "actionConfiguration.formData.objectTypeId.data": "PurchaseOrder",
      "actionConfiguration.formData.resultMode.data": "ROWS",
      "actionConfiguration.formData.projection.data": ["id", "delayDays"],
      "actionConfiguration.formData.filter.data.conditions": [
        {
          propertyId: "delayDays",
          operator: "gt",
          value: "{{Table1.searchText}}",
        },
      ],
      "actionConfiguration.formData.sort.data": [
        { propertyId: "delayDays", direction: "DESC" },
      ],
      "actionConfiguration.formData.page.data": {
        offset: "{{Table1.pageOffset}}",
        limit: "{{Table1.pageSize}}",
      },
    });
  });

  it.each([
    ["projection", '{"objectTypeId":"PurchaseOrder","projection":"id"}'],
    ["filter", '{"objectTypeId":"PurchaseOrder","filter":{"conditions":{}}}'],
    ["sort", '{"objectTypeId":"PurchaseOrder","sort":{}}'],
    [
      "partial pagination",
      '{"objectTypeId":"PurchaseOrder","page":{"offset":0}}',
    ],
  ])("rejects malformed %s while parsing Advanced JSON", (_name, text) => {
    expect(() => parseAdvancedDefinition(text)).toThrow();
  });

  it("rejects unsupported top-level fields instead of silently dropping them", () => {
    expect(() =>
      parseAdvancedDefinition(
        '{"objectTypeId":"PurchaseOrder","includeDrafts":true}',
      ),
    ).toThrow("Unsupported field in ontology query definition: includeDrafts");
  });

  it("reports an actionable parser error for malformed projection", () => {
    expect(() =>
      parseAdvancedDefinition(
        '{"objectTypeId":"PurchaseOrder","projection":"id"}',
      ),
    ).toThrow("Projection must be an array of visible Property IDs");
  });

  it("accepts stable metadata IDs, supported operators, and binding pagination", () => {
    const definition: OntologyObjectQueryDefinition = {
      objectTypeId: "PurchaseOrder",
      projection: ["id", "delayDays"],
      filter: {
        conditions: [{ propertyId: "delayDays", operator: "gt", value: 0 }],
      },
      sort: [{ propertyId: "delayDays", direction: "DESC" }],
      page: { offset: "{{Table1.pageOffset}}", limit: 50 },
    };

    expect(validateDefinition(definition, metadata)).toEqual({
      valid: true,
      definition,
    });
  });

  it("accepts isEmpty without a value when metadata marks it valueless", () => {
    expect(
      validateDefinition(
        {
          objectTypeId: "PurchaseOrder",
          filter: {
            conditions: [{ propertyId: "delayDays", operator: "isEmpty" }],
          },
        },
        metadata,
      ),
    ).toMatchObject({ valid: true });
  });

  it("rejects a missing value when the operator requires one", () => {
    expect(
      validateDefinition(
        {
          objectTypeId: "PurchaseOrder",
          filter: {
            conditions: [{ propertyId: "delayDays", operator: "gt" }],
          },
        },
        metadata,
      ),
    ).toMatchObject({
      valid: false,
      message: "Filter operator gt requires a value",
    });
  });

  it("does not treat requiresValue false as valueless for other operators", () => {
    const nonEmptyOperatorMetadata: OntologyQueryMetadata = {
      objectTypes: [
        {
          id: "PurchaseOrder",
          properties: [
            {
              id: "delayDays",
              operators: [{ value: "gt", requiresValue: false }],
            },
          ],
        },
      ],
    };

    expect(
      validateDefinition(
        {
          objectTypeId: "PurchaseOrder",
          filter: {
            conditions: [{ propertyId: "delayDays", operator: "gt" }],
          },
        },
        nonEmptyOperatorMetadata,
      ),
    ).toMatchObject({
      valid: false,
      message: "Filter operator gt requires a value",
    });
  });

  it.each([
    ["unknown Object Type", { objectTypeId: "Supplier" }, "Object Type"],
    [
      "unknown Property",
      { objectTypeId: "PurchaseOrder", projection: ["missing"] },
      "Property",
    ],
    [
      "hidden Property",
      { objectTypeId: "PurchaseOrder", projection: ["internalNote"] },
      "hidden",
    ],
    [
      "unsupported operator",
      {
        objectTypeId: "PurchaseOrder",
        filter: { conditions: [{ propertyId: "delayDays", operator: "eq" }] },
      },
      "operator",
    ],
  ])("rejects metadata-invalid %s", (_name, definition, message) => {
    const result = validateDefinition(
      definition as OntologyObjectQueryDefinition,
      metadata,
    );

    expect(result.valid).toBe(false);
    expect(result).toMatchObject({ message: expect.stringContaining(message) });
  });

  it.each([
    ["projection", { objectTypeId: "PurchaseOrder", projection: "id" }],
    [
      "filter",
      {
        objectTypeId: "PurchaseOrder",
        filter: { conditions: [{ propertyId: "delayDays" }] },
      },
    ],
    [
      "sort",
      {
        objectTypeId: "PurchaseOrder",
        sort: [{ propertyId: "delayDays", direction: "UP" }],
      },
    ],
  ])("rejects malformed %s shapes", (_name, definition) => {
    const result = validateDefinition(
      definition as OntologyObjectQueryDefinition,
      metadata,
    );

    expect(result.valid).toBe(false);
    expect(result).toMatchObject({ valid: false });
  });

  it("rejects partial and negative pagination instead of dropping it", () => {
    expect(
      validateDefinition(
        {
          objectTypeId: "PurchaseOrder",
          page: { offset: 0 },
        } as OntologyObjectQueryDefinition,
        metadata,
      ),
    ).toMatchObject({
      valid: false,
      message: expect.stringContaining("Pagination"),
    });

    expect(
      validateDefinition(
        { objectTypeId: "PurchaseOrder", page: { offset: -1, limit: 10 } },
        metadata,
      ),
    ).toMatchObject({
      valid: false,
      message: expect.stringContaining("Pagination"),
    });

    expect(
      validateDefinition(
        { objectTypeId: "PurchaseOrder", page: { offset: 0, limit: 0 } },
        metadata,
      ),
    ).toMatchObject({
      valid: false,
      message: expect.stringContaining("limit"),
    });

    expect(
      validateDefinition(
        { objectTypeId: "PurchaseOrder", page: { offset: 0.5, limit: 10 } },
        metadata,
      ),
    ).toMatchObject({
      valid: false,
      message: expect.stringContaining("integer"),
    });
  });

  it("rejects multiple sort entries under the backend contract", () => {
    expect(
      validateDefinition(
        {
          objectTypeId: "PurchaseOrder",
          sort: [
            { propertyId: "delayDays", direction: "ASC" },
            { propertyId: "id", direction: "DESC" },
          ],
        },
        metadata,
      ),
    ).toMatchObject({
      valid: false,
      message: "Sort must contain exactly one property and direction",
    });
  });

  it("rejects hidden and unknown filter and sort properties", () => {
    for (const definition of [
      {
        objectTypeId: "PurchaseOrder",
        filter: {
          conditions: [
            { propertyId: "internalNote", operator: "eq", value: "x" },
          ],
        },
      },
      {
        objectTypeId: "PurchaseOrder",
        filter: {
          conditions: [{ propertyId: "missing", operator: "eq", value: "x" }],
        },
      },
      {
        objectTypeId: "PurchaseOrder",
        sort: [{ propertyId: "internalNote", direction: "ASC" }],
      },
      {
        objectTypeId: "PurchaseOrder",
        sort: [{ propertyId: "missing", direction: "ASC" }],
      },
    ]) {
      expect(validateDefinition(definition, metadata)).toMatchObject({
        valid: false,
      });
    }
  });
});
