import {
  getCelanworksmithExecutionRequestLoadState,
  getCelanworksmithLinkEntryLoadState,
  getCelanworksmithLinkMetadataLoadState,
  getCelanworksmithObjectQueryLoadState,
  getCelanworksmithObjectSetLoadState,
  getCelanworksmithOntologyLoadState,
  getCelanworksmithVariableLoadState,
} from "./celanworksmithLoadStateSelectors";

const objectSet = {
  typeId: "PurchaseOrder",
  items: [{ id: "PO001", typeId: "PurchaseOrder", properties: {} }],
  offset: 0,
  limit: 10,
  total: 1,
};

const queryRequest = {
  widgetId: "Table1",
  typeId: "PurchaseOrder",
  query: { limit: 10, offset: 0 },
};

const linkRequest = {
  typeId: "PurchaseOrder",
  objectId: "PO001",
  linkTypeId: "po_production",
};

const state = {
  celanworksmithObjects: {
    status: "ready",
    types: {
      PurchaseOrder: {
        items: objectSet.items,
        total: 1,
        offset: 0,
        limit: 10,
        status: "ready",
        updatedAt: 100,
      },
    },
  },
  celanworksmithObjectQueries: {
    entries: {
      'Table1/PurchaseOrder/{"limit":10,"offset":0}': {
        request: queryRequest,
        result: objectSet,
        status: "error",
        updatedAt: 100,
        error: { code: "FORBIDDEN", message: "internal details" },
      },
      'Table2/PurchaseOrder/{"limit":10,"offset":0}': {
        request: { ...queryRequest, widgetId: "Table2" },
        status: "loading",
      },
      '$variable/orders/PurchaseOrder/{"limit":10,"offset":0}': {
        request: { ...queryRequest, widgetId: "$variable/orders" },
        result: objectSet,
        status: "error",
        updatedAt: 100,
        error: { code: "FORBIDDEN", message: "internal details" },
      },
    },
  },
  celanworksmithLinks: {
    metadata: {
      PurchaseOrder: {
        links: [
          {
            id: "po_production",
            displayName: "Production",
            sourceTypeId: "PurchaseOrder",
            targetTypeId: "ProductionOrder",
            cardinality: "ONE_TO_ONE",
          },
        ],
        status: "error",
        updatedAt: 80,
        error: { code: "NETWORK_ERROR", message: "temporary" },
      },
    },
    entries: {
      "PurchaseOrder/PO001/po_production": {
        status: "loading",
        result: objectSet,
        updatedAt: 90,
      },
    },
  },
  celanworksmithOntology: {
    status: "error",
    functions: [],
    actions: [],
    updatedAt: 70,
    error: { code: "TYPE_MISMATCH", message: "internal details" },
  },
  celanworksmithExecution: {
    functions: {
      CalculateDelayDays: {
        data: 4,
        meta: {
          status: "failed",
          requestId: "function-request-1",
          parametersHash: "abc123",
          completedAt: 60,
          error: { code: "NETWORK_ERROR", message: "temporary" },
        },
      },
    },
    actions: {},
    requests: {
      "function-request-1": {
        requestId: "function-request-1",
        kind: "function",
        entityId: "CalculateDelayDays",
        status: "failed",
        parametersHash: "abc123",
        completedAt: 60,
        error: { code: "NETWORK_ERROR", message: "temporary" },
      },
    },
    functionCache: {},
    inputs: {},
  },
} as never;

describe("CelanWorksmith load-state selectors", () => {
  it("adapts ObjectSet refreshes while retaining the previous result", () => {
    const refreshState = {
      ...state,
      celanworksmithObjects: {
        ...state.celanworksmithObjects,
        types: {
          ...state.celanworksmithObjects.types,
          PurchaseOrder: {
            ...state.celanworksmithObjects.types.PurchaseOrder,
            status: "loading",
          },
        },
      },
    } as never;

    expect(
      getCelanworksmithObjectSetLoadState(refreshState, "PurchaseOrder"),
    ).toMatchObject({
      requestKey: "objects/PurchaseOrder",
      status: "loading",
      data: objectSet,
      updatedAt: 100,
      canRetry: false,
    });
  });

  it("keeps Query keys isolated and classifies permission errors", () => {
    expect(getCelanworksmithObjectQueryLoadState(state, queryRequest)).toEqual({
      requestKey: 'Table1/PurchaseOrder/{"limit":10,"offset":0}',
      status: "permissionDenied",
      data: objectSet,
      updatedAt: 100,
      error: {
        code: "PERMISSION_DENIED",
        message: "You do not have permission to access this ontology data.",
      },
      canRetry: false,
    });

    expect(
      getCelanworksmithObjectQueryLoadState(state, {
        ...queryRequest,
        widgetId: "Table2",
      }),
    ).toMatchObject({
      requestKey: 'Table2/PurchaseOrder/{"limit":10,"offset":0}',
      status: "loading",
    });
  });

  it("adapts Link and Ontology metadata through the shared error contract", () => {
    expect(
      getCelanworksmithLinkMetadataLoadState(state, "PurchaseOrder"),
    ).toMatchObject({
      requestKey: "links/metadata/PurchaseOrder",
      status: "error",
      updatedAt: 80,
      canRetry: true,
    });
    expect(
      getCelanworksmithLinkEntryLoadState(state, linkRequest),
    ).toMatchObject({
      requestKey: "links/PurchaseOrder/PO001/po_production",
      status: "loading",
      data: objectSet,
      updatedAt: 90,
    });
    expect(getCelanworksmithOntologyLoadState(state)).toMatchObject({
      requestKey: "ontology/metadata",
      status: "typeMismatch",
      updatedAt: 70,
      canRetry: false,
    });
  });

  it("adapts execution requests and variable dependencies without a variable reducer", () => {
    expect(
      getCelanworksmithExecutionRequestLoadState(state, "function-request-1"),
    ).toMatchObject({
      requestKey: "execution/function/function-request-1",
      status: "error",
      updatedAt: 60,
      canRetry: true,
    });

    expect(
      getCelanworksmithVariableLoadState(state, {
        id: "orders",
        name: "orders",
        kind: "OBJECT_SET",
        version: 1,
        updatedAt: 1,
        dependencies: [],
        config: { typeId: "PurchaseOrder", offset: 0, limit: 10 },
      }),
    ).toMatchObject({
      requestKey:
        'variables/orders/$variable/orders/PurchaseOrder/{"limit":10,"offset":0}',
      status: "permissionDenied",
      data: objectSet,
    });
  });
});
