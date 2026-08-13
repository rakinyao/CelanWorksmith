import CelanworksmithAPI from "api/CelanworksmithAPI";
import { celanworksmithObjectQueryRequested } from "actions/celanworksmithObjectQueryActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { runSaga, stdChannel } from "redux-saga";
import { call, put, select } from "redux-saga/effects";
import { loadCelanworksmithObjectQuery } from "../CelanworksmithObjectQuerySaga";
import celanworksmithObjectQuerySaga from "../CelanworksmithObjectQuerySaga";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithCurrentApplicationId,
} from "selectors/celanworksmithApplicationBindingSelectors";

const request = {
  widgetId: "Table1",
  typeId: "PurchaseOrder",
  query: {
    offset: 0,
    limit: 10,
    sortBy: "status",
    sortDirection: "asc" as const,
  },
};

const metadata = {
  id: "PurchaseOrder",
  displayName: "Purchase order",
  properties: [
    {
      id: "status",
      displayName: "Status",
      dataType: "STRING",
      required: false,
      readOnly: false,
      derived: false,
    },
  ],
};

const waitForCallCount = async (mock: jest.Mock, count: number) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (mock.mock.calls.length === count) return;

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  expect(mock).toHaveBeenCalledTimes(count);
};

describe("loadCelanworksmithObjectQuery", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("calls the shared object API with a whitelisted sort property", () => {
    const iterator = loadCelanworksmithObjectQuery(
      celanworksmithObjectQueryRequested(request),
    );

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithCurrentApplicationId),
    );
    expect(iterator.next(undefined).value).toEqual(
      select(getCelanworksmithApplicationBindingState),
    );
    expect(iterator.next(undefined).value).toEqual(
      select(getCelanworksmithObjectsState),
    );
    expect(
      iterator.next({ types: { PurchaseOrder: { metadata } } }).value,
    ).toEqual(
      put({ type: "CELANWORKSMITH_OBJECT_QUERY_START", payload: request }),
    );
    expect(iterator.next().value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.queryObjects],
        "PurchaseOrder",
        request.query,
      ),
    );
  });

  test("rejects a sort property outside object metadata", () => {
    const invalidRequest = {
      ...request,
      query: { ...request.query, sortBy: "notAllowed" },
    };
    const iterator = loadCelanworksmithObjectQuery(
      celanworksmithObjectQueryRequested(invalidRequest),
    );

    iterator.next();
    iterator.next(undefined);
    expect(iterator.next(undefined).value).toEqual(
      select(getCelanworksmithObjectsState),
    );
    expect(
      iterator.next({ types: { PurchaseOrder: { metadata } } }).value,
    ).toEqual(
      put({
        type: "CELANWORKSMITH_OBJECT_QUERY_START",
        payload: invalidRequest,
      }),
    );
    expect(iterator.next().value).toMatchObject({ type: "PUT" });
  });

  test("rejects an unversioned or unsupported object filter", () => {
    const invalidRequest = {
      ...request,
      query: {
        ...request.query,
        filter: {
          typeId: "PurchaseOrder",
          version: 2,
          conditions: [{ propertyId: "status", operator: "raw" }],
        },
      },
    };
    const iterator = loadCelanworksmithObjectQuery(
      celanworksmithObjectQueryRequested(invalidRequest),
    );

    iterator.next();
    iterator.next(undefined);
    iterator.next(undefined);
    iterator.next({ types: { PurchaseOrder: { metadata } } });
    expect(iterator.next().value).toMatchObject({ type: "PUT" });
  });

  test("rejects an unsupported sort direction", () => {
    const invalidRequest = {
      ...request,
      query: { ...request.query, sortDirection: "sideways" as never },
    };
    const iterator = loadCelanworksmithObjectQuery(
      celanworksmithObjectQueryRequested(invalidRequest),
    );

    iterator.next();
    iterator.next(undefined);
    iterator.next(undefined);
    iterator.next({ types: { PurchaseOrder: { metadata } } });
    expect(iterator.next().value).toMatchObject({ type: "PUT" });
  });

  test("replaces an in-flight query when the same key is forced", async () => {
    let resolveFirstRequest: (value: unknown) => void = () => undefined;
    const firstRequest = new Promise((resolve) => {
      resolveFirstRequest = resolve;
    });
    const forcedResult = {
      typeId: "PurchaseOrder",
      items: [{ id: "PO002", typeId: "PurchaseOrder", properties: {} }],
      offset: 0,
      limit: 10,
      total: 1,
    };
    const queryObjects = jest
      .spyOn(CelanworksmithAPI, "queryObjects")
      .mockImplementationOnce(() => firstRequest as never)
      .mockResolvedValueOnce({
        responseMeta: { status: 200, success: true },
        data: forcedResult,
      });
    const channel = stdChannel();
    const dispatched: Array<{ type: string; payload?: unknown }> = [];
    const task = runSaga(
      {
        channel,
        dispatch: (action) => dispatched.push(action),
        getState: () => ({
          celanworksmithObjects: {
            status: "ready",
            types: { PurchaseOrder: { metadata } },
          },
        }),
      },
      celanworksmithObjectQuerySaga,
    );

    try {
      channel.put(celanworksmithObjectQueryRequested(request));
      await waitForCallCount(queryObjects, 1);

      channel.put(celanworksmithObjectQueryRequested(request));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(queryObjects).toHaveBeenCalledTimes(1);

      channel.put(
        celanworksmithObjectQueryRequested({ ...request, force: true }),
      );
      await waitForCallCount(queryObjects, 2);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        dispatched.filter(
          (action) =>
            action.type ===
            ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_SUCCESS,
        ),
      ).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({
            force: true,
            result: forcedResult,
          }),
        }),
      ]);

      resolveFirstRequest({
        responseMeta: { status: 200, success: true },
        data: { ...forcedResult, items: [] },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        dispatched.filter(
          (action) =>
            action.type ===
            ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_SUCCESS,
        ),
      ).toHaveLength(1);
    } finally {
      task.cancel();
      await task.toPromise();
    }
  });
});
