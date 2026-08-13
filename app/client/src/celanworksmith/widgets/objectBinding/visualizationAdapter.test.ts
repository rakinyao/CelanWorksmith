import {
  getAggregationVariableChartData,
  getObjectSetChartData,
} from "./visualizationAdapter";

const result = {
  typeId: "PurchaseOrder",
  items: [
    {
      id: "PO001",
      typeId: "PurchaseOrder",
      properties: { delayDays: 4, supplierName: "Acme" },
    },
    {
      id: "PO002",
      typeId: "PurchaseOrder",
      properties: { delayDays: 8, supplierName: "Globex" },
    },
  ],
  limit: 100,
  offset: 0,
  total: 2,
};

const binding = {
  labelPropertyId: "supplierName",
  objectTypeId: "PurchaseOrder",
  propertyDataTypes: { valuePropertyId: ["INTEGER", "DECIMAL"] },
  valuePropertyId: "delayDays",
};

const metadata = {
  id: "PurchaseOrder",
  displayName: "Purchase Order",
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
      id: "delayDays",
      displayName: "Delay days",
      dataType: "INTEGER",
      required: false,
      readOnly: false,
      derived: true,
    },
    {
      id: "riskLevel",
      displayName: "Risk level",
      dataType: "ENUM",
      required: false,
      readOnly: false,
      derived: false,
      enumValues: ["HIGH", "LOW"],
    },
  ],
};

describe("getObjectSetChartData", () => {
  it("maps ObjectSet rows to the existing chartData format", () => {
    expect(getObjectSetChartData(result, binding, metadata)).toEqual({
      chartData: {
        objectSet: {
          data: [
            { x: "Acme", y: 4 },
            { x: "Globex", y: 8 },
          ],
        },
      },
      status: "ready",
    });
  });

  it("maps a configured Object property to native chart series", () => {
    expect(
      getObjectSetChartData(
        {
          ...result,
          items: [
            {
              ...result.items[0],
              properties: {
                ...result.items[0].properties,
                riskLevel: "HIGH",
              },
            },
            {
              ...result.items[1],
              properties: {
                ...result.items[1].properties,
                riskLevel: "LOW",
              },
            },
          ],
        },
        { ...binding, groupPropertyId: "riskLevel" },
        metadata,
      ),
    ).toEqual({
      chartData: {
        HIGH: { data: [{ x: "Acme", y: 4 }], seriesName: "HIGH" },
        LOW: { data: [{ x: "Globex", y: 8 }], seriesName: "LOW" },
      },
      status: "ready",
    });
  });

  it("keeps prototype-like group values as a native chart series", () => {
    expect(
      getObjectSetChartData(
        {
          ...result,
          items: [
            {
              ...result.items[0],
              properties: {
                ...result.items[0].properties,
                riskLevel: "__proto__",
              },
            },
          ],
        },
        { ...binding, groupPropertyId: "riskLevel" },
        metadata,
      ),
    ).toEqual({
      chartData: {
        __proto__: {
          data: [{ x: "Acme", y: 4 }],
          seriesName: "__proto__",
        },
      },
      status: "ready",
    });
  });

  it("reports empty ObjectSets without producing a blank chart payload", () => {
    expect(
      getObjectSetChartData(
        { ...result, items: [], total: 0 },
        binding,
        metadata,
      ),
    ).toEqual({ chartData: {}, status: "empty" });
  });

  it.each([
    ["metadata is unavailable", binding, undefined],
    [
      "the Object Type no longer exists",
      { ...binding, objectTypeId: "DeletedPurchaseOrder" },
      metadata,
    ],
    [
      "the label property no longer exists",
      { ...binding, labelPropertyId: "deletedLabel" },
      metadata,
    ],
    [
      "the label property has an unsupported type",
      binding,
      {
        ...metadata,
        properties: [
          { ...metadata.properties[0], dataType: "BOOLEAN" },
          metadata.properties[1],
        ],
      },
    ],
  ])(
    "reports %s as a type mismatch before classifying an empty ObjectSet",
    (_case, invalidBinding, invalidMetadata) => {
      expect(
        getObjectSetChartData(
          { ...result, items: [], total: 0 },
          invalidBinding,
          invalidMetadata,
        ),
      ).toEqual({ chartData: {}, status: "typeMismatch" });
    },
  );

  it("reports an ObjectSet with a different Object Type as a type mismatch", () => {
    expect(
      getObjectSetChartData(
        {
          ...result,
          items: [],
          total: 0,
          typeId: "Supplier",
        },
        binding,
        metadata,
      ),
    ).toEqual({ chartData: {}, status: "typeMismatch" });
  });

  it("rejects null and non-numeric Object property values", () => {
    expect(
      getObjectSetChartData(
        {
          ...result,
          items: [
            {
              ...result.items[0],
              properties: { delayDays: null, supplierName: "Acme" },
            },
          ],
        },
        binding,
        metadata,
      ),
    ).toEqual({ chartData: {}, status: "typeMismatch" });
  });

  it.each([
    ["NaN label", { delayDays: 4, supplierName: Number.NaN }],
    ["infinite label", { delayDays: 4, supplierName: Infinity }],
    ["NaN value", { delayDays: Number.NaN, supplierName: "Acme" }],
    ["infinite value", { delayDays: Infinity, supplierName: "Acme" }],
  ])("rejects a non-finite %s", (_case, properties) => {
    expect(
      getObjectSetChartData(
        {
          ...result,
          items: [{ ...result.items[0], properties }],
        },
        binding,
        metadata,
      ),
    ).toEqual({ chartData: {}, status: "typeMismatch" });
  });
});

describe("getAggregationVariableChartData", () => {
  it("maps a ready $variables aggregation to a single existing chart point", () => {
    expect(
      getAggregationVariableChartData("{{ $variables.averageDelay }}", {
        ENTITY_TYPE: "CELANWORKSMITH_VARIABLES",
        _meta: { averageDelay: { status: "ready" } },
        averageDelay: 6.5,
      }),
    ).toEqual({
      chartData: {
        aggregationVariable: { data: [{ x: "averageDelay", y: 6.5 }] },
      },
      status: "ready",
    });
  });

  it.each([
    ["loading", { status: "loading" }, undefined, "loading"],
    ["empty", { status: "empty" }, undefined, "empty"],
    [
      "runtime error",
      { error: "Runtime unavailable", status: "error" },
      undefined,
      "error",
    ],
    [
      "permission error",
      { status: "permissionDenied" },
      undefined,
      "permissionDenied",
    ],
    ["non-numeric value", { status: "ready" }, "six", "typeMismatch"],
  ] as const)(
    "preserves the aggregation variable %s state",
    (_case, metadata, value, status) => {
      expect(
        getAggregationVariableChartData("averageDelay", {
          ENTITY_TYPE: "CELANWORKSMITH_VARIABLES",
          _meta: { averageDelay: metadata },
          ...(value === undefined ? {} : { averageDelay: value }),
        }),
      ).toMatchObject({ chartData: {}, status });
    },
  );
});
