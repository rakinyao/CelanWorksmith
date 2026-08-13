import type { CelanworksmithObjectSet } from "api/CelanworksmithAPI";
import { getProgressObjectValue } from "./progressObjectBinding";

const metadata = {
  id: "PurchaseOrder",
  displayName: "Purchase order",
  properties: [
    {
      id: "completion",
      displayName: "Completion",
      dataType: "DECIMAL",
      required: false,
      readOnly: false,
      derived: false,
    },
  ],
};

const result: CelanworksmithObjectSet = {
  typeId: "PurchaseOrder",
  items: [
    {
      id: "PO001",
      typeId: "PurchaseOrder",
      properties: { completion: 42 },
    },
  ],
  offset: 0,
  limit: 100,
  total: 1,
};

describe("getProgressObjectValue", () => {
  it("maps the first ObjectSet item's configured numeric property", () => {
    expect(
      getProgressObjectValue({
        metadata,
        result,
        status: "ready",
        valuePropertyId: "completion",
      }),
    ).toEqual({ status: "ready", value: 42 });
  });

  it.each([null, "42", Number.NaN])(
    "reports non-numeric Object property value %p as a type mismatch",
    (completion) => {
      expect(
        getProgressObjectValue({
          metadata,
          result: {
            ...result,
            items: [
              {
                ...result.items[0],
                properties: { completion },
              },
            ],
          },
          status: "ready",
          valuePropertyId: "completion",
        }),
      ).toEqual({ status: "typeMismatch" });
    },
  );

  it("reports an empty ObjectSet instead of falling back to zero", () => {
    expect(
      getProgressObjectValue({
        metadata,
        result: { ...result, items: [], total: 0 },
        status: "ready",
        valuePropertyId: "completion",
      }),
    ).toEqual({ status: "empty" });
  });

  it("rejects multiple ObjectSet rows instead of silently using the first", () => {
    expect(
      getProgressObjectValue({
        metadata,
        result: {
          ...result,
          items: [...result.items, { ...result.items[0], id: "PO002" }],
          total: 2,
        },
        status: "ready",
        valuePropertyId: "completion",
      }),
    ).toEqual({ status: "typeMismatch" });
  });

  it("uses an aggregation variable as the explicit value source", () => {
    expect(
      getProgressObjectValue({
        aggregationVariableName: "$variables.orderCompletion",
        metadata,
        result,
        status: "ready",
        variables: {
          ENTITY_TYPE: "CELANWORKSMITH_VARIABLES",
          _meta: {
            orderCompletion: {
              dependencies: [],
              status: "ready",
              type: "AGGREGATION",
            },
          },
          orderCompletion: 87,
        },
      }),
    ).toEqual({ status: "ready", value: 87 });
  });

  it("uses an aggregation variable when the ObjectSet is empty", () => {
    expect(
      getProgressObjectValue({
        aggregationVariableName: "orderCompletion",
        metadata,
        result: { ...result, items: [], total: 0 },
        status: "empty",
        variables: {
          ENTITY_TYPE: "CELANWORKSMITH_VARIABLES",
          _meta: {
            orderCompletion: {
              dependencies: [],
              status: "ready",
              type: "AGGREGATION",
            },
          },
          orderCompletion: 87,
        },
      }),
    ).toEqual({ status: "ready", value: 87 });
  });

  it("exposes aggregation variable loading and errors", () => {
    const loading = getProgressObjectValue({
      aggregationVariableName: "orderCompletion",
      metadata,
      result,
      status: "ready",
      variables: {
        ENTITY_TYPE: "CELANWORKSMITH_VARIABLES",
        _meta: {
          orderCompletion: {
            dependencies: [],
            status: "loading",
            type: "AGGREGATION",
          },
        },
      },
    });
    const error = getProgressObjectValue({
      aggregationVariableName: "orderCompletion",
      metadata,
      result,
      status: "ready",
      variables: {
        ENTITY_TYPE: "CELANWORKSMITH_VARIABLES",
        _meta: {
          orderCompletion: {
            dependencies: [],
            error: "Aggregation failed",
            status: "error",
            type: "AGGREGATION",
          },
        },
      },
    });

    expect(loading).toEqual({ status: "loading" });
    expect(error).toEqual({ error: "Aggregation failed", status: "error" });
  });

  it.each(["loading", "error", "permissionDenied"] as const)(
    "preserves the ObjectSet %s state before resolving an aggregation variable",
    (status) => {
      expect(
        getProgressObjectValue({
          aggregationVariableName: "orderCompletion",
          error: { message: "Runtime unavailable" },
          metadata,
          status,
          variables: {
            ENTITY_TYPE: "CELANWORKSMITH_VARIABLES",
            _meta: {
              orderCompletion: {
                dependencies: [],
                status: "ready",
                type: "AGGREGATION",
              },
            },
            orderCompletion: 87,
          },
        }),
      ).toEqual({ error: "Runtime unavailable", status });
    },
  );
});
