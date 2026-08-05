import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import reducer from "./celanworksmithObjectQueryReducer";

const request = {
  widgetId: "Table1",
  typeId: "PurchaseOrder",
  query: { offset: 0, limit: 10 },
};

describe("celanworksmithObjectQueryReducer", () => {
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

    const entry =
      refreshed.entries['Table1/PurchaseOrder/{"offset":0,"limit":10}'];

    expect(entry.status).toBe("loading");
    expect(entry.result?.items[0].id).toBe("PO001");
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

    const entry =
      errored.entries['Table1/PurchaseOrder/{"offset":0,"limit":10}'];

    expect(entry.status).toBe("error");
    expect(entry.error?.message).toBe("failed");
  });
});
