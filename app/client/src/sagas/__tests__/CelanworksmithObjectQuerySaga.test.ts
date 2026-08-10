import CelanworksmithAPI from "api/CelanworksmithAPI";
import { celanworksmithObjectQueryRequested } from "actions/celanworksmithObjectQueryActions";
import { call, put, select } from "redux-saga/effects";
import { loadCelanworksmithObjectQuery } from "../CelanworksmithObjectQuerySaga";
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

describe("loadCelanworksmithObjectQuery", () => {
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
});
