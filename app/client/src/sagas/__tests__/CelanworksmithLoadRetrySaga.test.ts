import { all, put, takeEvery } from "redux-saga/effects";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import {
  celanworksmithLoadRetry,
  celanworksmithRuntimeCacheClearRequest,
} from "actions/celanworksmithLoadStateActions";
import { runSaga } from "redux-saga";
import {
  clearCelanworksmithRuntimeCache,
  routeCelanworksmithLoadRetry,
  default as celanworksmithLoadRetrySaga,
} from "../CelanworksmithLoadRetrySaga";

describe("CelanWorksmith load retry routing", () => {
  it("forces Link metadata and entry retries", () => {
    const metadata = routeCelanworksmithLoadRetry(
      celanworksmithLoadRetry({
        kind: "linkMetadata",
        typeId: "PurchaseOrder",
      }),
    );

    expect(metadata.next().value).toEqual(
      put({
        type: ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_REQUESTED,
        payload: "PurchaseOrder",
        meta: { force: true },
      }),
    );

    const entry = routeCelanworksmithLoadRetry(
      celanworksmithLoadRetry({
        kind: "linkEntry",
        request: {
          typeId: "PurchaseOrder",
          objectId: "PO001",
          linkTypeId: "po_production",
        },
      }),
    );

    expect(entry.next().value).toEqual(
      put({
        type: ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_REQUESTED,
        payload: {
          typeId: "PurchaseOrder",
          objectId: "PO001",
          linkTypeId: "po_production",
          force: true,
        },
      }),
    );
  });

  it("preserves exact Query and execution parameters on retry", () => {
    const query = routeCelanworksmithLoadRetry(
      celanworksmithLoadRetry({
        kind: "objectQuery",
        request: {
          widgetId: "Table1",
          typeId: "PurchaseOrder",
          query: { filter: { typeId: "PurchaseOrder", version: 1 }, limit: 10 },
        },
      }),
    );
    const functionRetry = routeCelanworksmithLoadRetry(
      celanworksmithLoadRetry({
        kind: "function",
        functionId: "CalculateDelayDays",
        parameters: { poId: "PO001" },
        applicationId: "app-1",
      }),
    );
    const actionRetry = routeCelanworksmithLoadRetry(
      celanworksmithLoadRetry({
        kind: "action",
        actionId: "UpdateDeliveryDate",
        request: {
          objectTypeId: "PurchaseOrder",
          objectId: "PO001",
          parameters: { date: "2026-08-09" },
        },
        applicationId: "app-1",
      }),
    );

    expect(query.next().value).toMatchObject({
      payload: {
        action: {
          type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_REQUESTED,
          payload: {
            widgetId: "Table1",
            typeId: "PurchaseOrder",
            query: {
              filter: { typeId: "PurchaseOrder", version: 1 },
              limit: 10,
            },
          },
        },
      },
    });
    expect(functionRetry.next().value).toMatchObject({
      payload: {
        action: {
          type: ReduxActionTypes.CELANWORKSMITH_FUNCTION_RETRY,
          payload: {
            functionId: "CalculateDelayDays",
            parameters: { poId: "PO001" },
            applicationId: "app-1",
          },
        },
      },
    });
    expect(actionRetry.next().value).toMatchObject({
      payload: {
        action: {
          type: ReduxActionTypes.CELANWORKSMITH_ACTION_RETRY,
          payload: {
            actionId: "UpdateDeliveryDate",
            request: {
              objectTypeId: "PurchaseOrder",
              objectId: "PO001",
              parameters: { date: "2026-08-09" },
            },
            applicationId: "app-1",
          },
        },
      },
    });
  });

  it("routes variable dependency loads without introducing state", () => {
    const iterator = routeCelanworksmithLoadRetry(
      celanworksmithLoadRetry({
        kind: "variable",
        definition: {
          id: "orders",
          name: "orders",
          kind: "OBJECT_SET",
          version: 1,
          updatedAt: 1,
          dependencies: [],
          config: { typeId: "PurchaseOrder", offset: 0, limit: 10 },
        },
      }),
    );

    expect(iterator.next().value).toMatchObject({
      payload: {
        action: {
          type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_REQUESTED,
          payload: {
            widgetId: "$variable/orders",
            typeId: "PurchaseOrder",
            query: { offset: 0, limit: 10 },
          },
        },
      },
    });
  });

  it("watches the unified retry action", () => {
    const iterator = celanworksmithLoadRetrySaga();

    expect(iterator.next().value).toEqual(
      all([
        takeEvery(
          ReduxActionTypes.CELANWORKSMITH_LOAD_RETRY,
          routeCelanworksmithLoadRetry,
        ),
        takeEvery(
          ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEAR_REQUEST,
          clearCelanworksmithRuntimeCache,
        ),
      ]),
    );
  });

  it("clears and replays current runtime cache keys for the bound application", async () => {
    const dispatched: Array<{ type: string; payload?: unknown }> = [];
    const queryRequest = {
      widgetId: "Table1",
      typeId: "PurchaseOrder",
      query: { offset: 0, limit: 10 },
      applicationId: "app-1",
    };
    const linkRequest = {
      typeId: "PurchaseOrder",
      objectId: "PO001",
      linkTypeId: "po_production",
      applicationId: "app-1",
    };

    await runSaga(
      {
        dispatch: (action) => dispatched.push(action),
        getState: () => ({
          celanworksmithObjectQueries: {
            entries: {
              query: { request: queryRequest, status: "ready" },
            },
          },
          celanworksmithLinks: {
            metadata: {},
            entries: {
              link: { request: linkRequest, status: "ready" },
            },
          },
        }),
      },
      clearCelanworksmithRuntimeCache,
      celanworksmithRuntimeCacheClearRequest("app-1"),
    ).toPromise();

    expect(dispatched).toEqual([
      expect.objectContaining({
        type: ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED,
        payload: { applicationId: "app-1" },
      }),
      expect.objectContaining({
        type: ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST,
      }),
      expect.objectContaining({
        type: ReduxActionTypes.CELANWORKSMITH_OBJECTS_LOAD_REQUEST,
      }),
      expect.objectContaining({
        type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_REQUESTED,
        payload: { ...queryRequest, force: true },
      }),
      expect.objectContaining({
        type: ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_REQUESTED,
        payload: { ...linkRequest, force: true },
      }),
    ]);
  });
});

describe("clearCelanworksmithRuntimeCache application scoping", () => {
  it("does not replay legacy or other-application requests when clearing a bound application cache", async () => {
    const dispatched: Array<{ type: string; payload?: unknown }> = [];
    const appQueryRequest = {
      widgetId: "Table1",
      typeId: "PurchaseOrder",
      query: { offset: 0, limit: 10 },
      applicationId: "app-1",
    };
    const legacyQueryRequest = {
      widgetId: "Table2",
      typeId: "Supplier",
      query: { offset: 0, limit: 10 },
    };
    const otherAppQueryRequest = {
      widgetId: "Table3",
      typeId: "Supplier",
      query: { offset: 0, limit: 10 },
      applicationId: "app-2",
    };

    await runSaga(
      {
        dispatch: (action) => dispatched.push(action),
        getState: () => ({
          celanworksmithObjectQueries: {
            entries: {
              appQuery: { request: appQueryRequest, status: "ready" },
              legacyQuery: { request: legacyQueryRequest, status: "ready" },
              otherAppQuery: {
                request: otherAppQueryRequest,
                status: "ready",
              },
            },
          },
          celanworksmithLinks: { metadata: {}, entries: {} },
        }),
      },
      clearCelanworksmithRuntimeCache,
      celanworksmithRuntimeCacheClearRequest("app-1"),
    ).toPromise();

    const queryReplays = dispatched.filter(
      (action) =>
        action.type === ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_REQUESTED,
    );

    expect(queryReplays).toEqual([
      expect.objectContaining({
        payload: { ...appQueryRequest, force: true },
      }),
    ]);
  });

  it("replays legacy requests unchanged when clearing the whole runtime cache", async () => {
    const dispatched: Array<{ type: string; payload?: unknown }> = [];
    const legacyQueryRequest = {
      widgetId: "Table2",
      typeId: "Supplier",
      query: { offset: 0, limit: 10 },
    };

    await runSaga(
      {
        dispatch: (action) => dispatched.push(action),
        getState: () => ({
          celanworksmithObjectQueries: {
            entries: {
              legacyQuery: { request: legacyQueryRequest, status: "ready" },
            },
          },
          celanworksmithLinks: { metadata: {}, entries: {} },
        }),
      },
      clearCelanworksmithRuntimeCache,
      celanworksmithRuntimeCacheClearRequest(),
    ).toPromise();

    expect(dispatched).toEqual([
      expect.objectContaining({
        type: ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED,
      }),
      expect.objectContaining({
        type: ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST,
      }),
      expect.objectContaining({
        type: ReduxActionTypes.CELANWORKSMITH_OBJECTS_LOAD_REQUEST,
      }),
      expect.objectContaining({
        type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_REQUESTED,
        payload: { ...legacyQueryRequest, force: true },
      }),
    ]);
  });
});
