import {
  getCelanworksmithActionLoadState,
  getCelanworksmithExecutionRequestLoadState,
  getCelanworksmithLinkEntryLoadState,
  getCelanworksmithLinkMetadataLoadState,
  getCelanworksmithObjectQueryLoadState,
  getCelanworksmithObjectSetLoadState,
  getCelanworksmithOntologyLoadState,
  getCelanworksmithVariableLoadState,
} from "./celanworksmithLoadStateSelectors";
import { hashCelanworksmithParameters } from "actions/celanworksmithExecutionActions";

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
      "legacy/PurchaseOrder": {
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
      "legacy/PurchaseOrder/PO001/po_production": {
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
      requestKey: "links/metadata/legacy/PurchaseOrder",
      status: "error",
      updatedAt: 80,
      canRetry: true,
    });
    expect(
      getCelanworksmithLinkEntryLoadState(state, linkRequest),
    ).toMatchObject({
      requestKey: "links/legacy/PurchaseOrder/PO001/po_production",
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

  it("isolates Link metadata load state by application", () => {
    const scopedState = {
      ...state,
      celanworksmithLinks: {
        ...state.celanworksmithLinks,
        metadata: {
          "app-1/PurchaseOrder": {
            links: [],
            status: "empty",
            updatedAt: 101,
          },
          "app-2/PurchaseOrder": {
            links: [],
            status: "error",
            updatedAt: 102,
            error: { code: "FORBIDDEN", message: "Forbidden" },
          },
        },
      },
    };

    expect(
      getCelanworksmithLinkMetadataLoadState(
        scopedState,
        "PurchaseOrder",
        "app-1",
      ),
    ).toMatchObject({ status: "empty", updatedAt: 101 });
    expect(
      getCelanworksmithLinkMetadataLoadState(
        scopedState,
        "PurchaseOrder",
        "app-2",
      ),
    ).toMatchObject({ status: "permissionDenied", updatedAt: 102 });
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

  it("does not expose a newer entity result for a historical execution request", () => {
    const historicalState = {
      ...state,
      celanworksmithExecution: {
        ...state.celanworksmithExecution,
        functions: {
          CalculateDelayDays: {
            data: 8,
            meta: {
              status: "succeeded",
              requestId: "function-request-newer",
              parametersHash: "abc123",
              completedAt: 80,
            },
            lastSuccessfulRequestId: "function-request-newer",
          },
        },
        requests: {
          "function-request-1": {
            ...state.celanworksmithExecution.requests["function-request-1"],
            status: "succeeded",
          },
          "function-request-newer": {
            requestId: "function-request-newer",
            kind: "function",
            entityId: "CalculateDelayDays",
            status: "succeeded",
            parametersHash: "abc123",
            completedAt: 80,
          },
        },
      },
    } as never;

    expect(
      getCelanworksmithExecutionRequestLoadState(
        historicalState,
        "function-request-1",
      ).data,
    ).toBeUndefined();
  });

  it("retains execution data for the current failed request only with a prior-success marker", () => {
    const failedRefreshState = {
      ...state,
      celanworksmithExecution: {
        ...state.celanworksmithExecution,
        functions: {
          CalculateDelayDays: {
            data: 4,
            meta: {
              status: "failed",
              requestId: "function-request-2",
              parametersHash: "abc123",
              completedAt: 80,
              error: { code: "NETWORK_ERROR", message: "temporary" },
            },
            lastSuccessfulRequestId: "function-request-1",
          },
        },
        requests: {
          ...state.celanworksmithExecution.requests,
          "function-request-2": {
            requestId: "function-request-2",
            kind: "function",
            entityId: "CalculateDelayDays",
            status: "failed",
            parametersHash: "abc123",
            completedAt: 80,
            error: { code: "NETWORK_ERROR", message: "temporary" },
          },
        },
      },
    } as never;

    expect(
      getCelanworksmithExecutionRequestLoadState(
        failedRefreshState,
        "function-request-2",
      ).data,
    ).toBe(4);
  });

  it("keeps action load state isolated by its bound object", () => {
    const actionRequest = {
      objectTypeId: "PurchaseOrder",
      objectId: "PO001",
      parameters: { approved: true },
    };
    const actionState = {
      ...state,
      celanworksmithExecution: {
        ...state.celanworksmithExecution,
        actions: {
          ApprovePurchaseOrder: {
            data: {
              executionId: "execution-2",
              changedObjects: [],
              sideEffects: [],
            },
            changedObjects: [],
            sideEffects: [],
            objectTypeId: "PurchaseOrder",
            objectId: "PO002",
            meta: {
              status: "succeeded",
              requestId: "action-request-2",
              parametersHash: hashCelanworksmithParameters(
                actionRequest.parameters,
              ),
              completedAt: 80,
            },
          },
        },
      },
    } as never;

    expect(
      getCelanworksmithActionLoadState(
        actionState,
        "ApprovePurchaseOrder",
        actionRequest,
      ).data,
    ).toBeUndefined();
  });

  it("does not retain fresh empty state containers as loaded data", () => {
    const freshState = {
      celanworksmithObjects: {
        status: "error",
        types: {
          PurchaseOrder: {
            items: [],
            total: 0,
            offset: 0,
            limit: 10,
            status: "error",
            error: { code: "NETWORK_ERROR", message: "temporary" },
          },
        },
      },
      celanworksmithObjectQueries: {
        entries: {
          'Table1/PurchaseOrder/{"limit":10,"offset":0}': {
            request: queryRequest,
            status: "error",
            error: { code: "NETWORK_ERROR", message: "temporary" },
          },
        },
      },
      celanworksmithLinks: {
        metadata: {
          "legacy/PurchaseOrder": {
            links: [],
            status: "loading",
          },
        },
        entries: {
          "legacy/PurchaseOrder/PO001/po_production": {
            status: "error",
            error: { code: "NETWORK_ERROR", message: "temporary" },
          },
        },
      },
      celanworksmithOntology: {
        status: "error",
        functions: [],
        actions: [],
        error: { code: "NETWORK_ERROR", message: "temporary" },
      },
    } as never;

    expect(
      getCelanworksmithObjectSetLoadState(freshState, "PurchaseOrder").data,
    ).toBeUndefined();
    expect(
      getCelanworksmithObjectQueryLoadState(freshState, queryRequest).data,
    ).toBeUndefined();
    expect(
      getCelanworksmithLinkMetadataLoadState(freshState, "PurchaseOrder").data,
    ).toBeUndefined();
    expect(
      getCelanworksmithLinkEntryLoadState(freshState, linkRequest).data,
    ).toBeUndefined();
    expect(getCelanworksmithOntologyLoadState(freshState).data).toBeUndefined();
  });
});
