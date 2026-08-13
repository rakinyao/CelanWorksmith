import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import reducer, { getObjectQueryKey } from "./celanworksmithObjectQueryReducer";

const request = {
  widgetId: "Table1",
  typeId: "PurchaseOrder",
  query: { offset: 0, limit: 10 },
};

describe("celanworksmithObjectQueryReducer", () => {
  test("uses the same key for equivalent query property order", () => {
    const first = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
      payload: request,
    } as never);
    const second = reducer(first, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
      payload: {
        ...request,
        query: { limit: 10, offset: 0 },
      },
    } as never);

    expect(Object.keys(second.entries)).toHaveLength(1);
  });

  test("isolates application-scoped query keys", () => {
    const appA = { ...request, applicationId: "app-a" };
    const appB = { ...request, applicationId: "app-b" };

    expect(getObjectQueryKey(appA)).not.toBe(getObjectQueryKey(appB));
    expect(getObjectQueryKey(appA)).toContain("app-a/");
  });

  test("uses the same key for queries normalized to the same page", () => {
    const first = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
      payload: { ...request, query: { limit: 0, offset: -1 } },
    } as never);
    const second = reducer(first, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
      payload: { ...request, query: { limit: 1, offset: 0 } },
    } as never);

    expect(Object.keys(second.entries)).toHaveLength(1);
  });

  test("keeps query entries isolated and preserves result during refresh", () => {
    const started = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
      payload: request,
    } as never);
    const ready = reducer(started, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_SUCCESS,
      payload: {
        ...request,
        result: {
          typeId: "PurchaseOrder",
          items: [{ id: "PO001", typeId: "PurchaseOrder", properties: {} }],
          offset: 0,
          limit: 10,
          total: 1,
        },
      },
    } as never);
    const refreshed = reducer(ready, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
      payload: request,
    } as never);

    const entry = refreshed.entries[getObjectQueryKey(request)];

    expect(entry.status).toBe("loading");
    expect(entry.result?.items[0].id).toBe("PO001");
  });

  test("clears cached query entries for the target application only", () => {
    const appRequest = { ...request, applicationId: "app-1" };
    const otherAppRequest = {
      ...request,
      applicationId: "app-2",
      widgetId: "Table2",
    };
    const legacyRequest = { ...request, widgetId: "Table3" };
    let state = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
      payload: appRequest,
    } as never);

    state = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
      payload: otherAppRequest,
    } as never);
    state = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
      payload: legacyRequest,
    } as never);

    const cleared = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED,
      payload: { applicationId: "app-1" },
    } as never);

    expect(state.entries[getObjectQueryKey(appRequest)].request).toEqual(
      appRequest,
    );
    expect(cleared.entries[getObjectQueryKey(appRequest)]).toBeUndefined();
    expect(cleared.entries[getObjectQueryKey(otherAppRequest)]).toBeDefined();
    expect(cleared.entries[getObjectQueryKey(legacyRequest)]).toBeDefined();
  });

  test("clears all cached query entries when no application is targeted", () => {
    const ready = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
      payload: request,
    } as never);
    const cleared = reducer(ready, {
      type: ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED,
      payload: undefined,
    } as never);

    expect(cleared.entries).toEqual({});
  });

  test("stores empty and error results per query key", () => {
    const empty = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_SUCCESS,
      payload: {
        ...request,
        result: {
          typeId: "PurchaseOrder",
          items: [],
          offset: 0,
          limit: 10,
          total: 0,
        },
      },
    } as never);
    const errored = reducer(empty, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_ERROR,
      payload: {
        ...request,
        error: { code: "BACKEND_ERROR", message: "failed" },
      },
    } as never);

    const entry = errored.entries[getObjectQueryKey(request)];

    expect(entry.status).toBe("error");
    expect(entry.error?.message).toBe("failed");
  });
});
