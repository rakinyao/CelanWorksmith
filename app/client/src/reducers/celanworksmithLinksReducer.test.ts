import type {
  CelanworksmithLinkType,
  CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";
import {
  celanworksmithLinkLoadError,
  celanworksmithLinkLoadRequested,
  celanworksmithLinkLoadStart,
  celanworksmithLinkLoadSuccess,
  celanworksmithLinkMetadataLoadError,
  celanworksmithLinkMetadataLoadRequested,
  celanworksmithLinkMetadataLoadSuccess,
} from "actions/celanworksmithLinkActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import reducer, {
  getCelanworksmithLinkKey,
} from "./celanworksmithLinksReducer";

const purchaseOrderLink: CelanworksmithLinkType = {
  id: "po_production",
  displayName: "Purchase Order Production",
  sourceTypeId: "PurchaseOrder",
  targetTypeId: "ProductionOrder",
  cardinality: "ONE_TO_ONE",
};

const linkedObjects: CelanworksmithObjectSet = {
  typeId: "ProductionOrder",
  items: [
    {
      id: "PR001",
      typeId: "ProductionOrder",
      properties: { status: "SCHEDULED" },
    },
  ],
  offset: 0,
  limit: 100,
  total: 1,
};

const key = {
  typeId: "PurchaseOrder",
  objectId: "PO001",
  linkTypeId: "po_production",
};

describe("celanworksmithLinksReducer", () => {
  test("stores link metadata by source object type", () => {
    let state = reducer(
      undefined,
      celanworksmithLinkMetadataLoadRequested("PurchaseOrder"),
    );

    expect(state.metadata.PurchaseOrder.status).toBe("loading");

    state = reducer(
      state,
      celanworksmithLinkMetadataLoadSuccess("PurchaseOrder", [
        purchaseOrderLink,
      ]),
    );

    expect(state.metadata.PurchaseOrder).toMatchObject({
      status: "ready",
      links: [purchaseOrderLink],
    });
  });

  test("isolates link data by object and link type", () => {
    const otherKey = { ...key, objectId: "PO002" };
    let state = reducer(undefined, celanworksmithLinkLoadRequested(key));

    state = reducer(state, celanworksmithLinkLoadStart(key));
    state = reducer(state, celanworksmithLinkLoadSuccess(key, linkedObjects));
    state = reducer(state, celanworksmithLinkLoadRequested(otherKey));

    expect(getCelanworksmithLinkKey(key)).toBe(
      "PurchaseOrder/PO001/po_production",
    );
    expect(state.entries[getCelanworksmithLinkKey(key)]).toMatchObject({
      status: "ready",
      result: linkedObjects,
    });
    expect(state.entries[getCelanworksmithLinkKey(otherKey)]).toMatchObject({
      status: "idle",
    });
  });

  test("keeps successful link data while a refresh is loading", () => {
    let state = reducer(undefined, celanworksmithLinkLoadStart(key));

    state = reducer(state, celanworksmithLinkLoadSuccess(key, linkedObjects));
    state = reducer(state, celanworksmithLinkLoadStart(key));

    expect(state.entries[getCelanworksmithLinkKey(key)]).toMatchObject({
      status: "loading",
      result: linkedObjects,
    });
  });

  test("stores link errors without removing the previous result", () => {
    let state = reducer(undefined, celanworksmithLinkLoadStart(key));

    state = reducer(state, celanworksmithLinkLoadSuccess(key, linkedObjects));
    state = reducer(
      state,
      celanworksmithLinkLoadError(key, {
        code: "NETWORK_ERROR",
        message: "Link service unavailable",
      }),
    );

    expect(state.entries[getCelanworksmithLinkKey(key)]).toMatchObject({
      status: "error",
      result: linkedObjects,
      error: { code: "NETWORK_ERROR" },
    });
  });

  test("preserves metadata when a metadata reload fails", () => {
    let state = reducer(
      undefined,
      celanworksmithLinkMetadataLoadSuccess("PurchaseOrder", [
        purchaseOrderLink,
      ]),
    );

    state = reducer(
      state,
      celanworksmithLinkMetadataLoadError("PurchaseOrder", {
        code: "NETWORK_ERROR",
        message: "Metadata unavailable",
      }),
    );

    expect(state.metadata.PurchaseOrder).toMatchObject({
      status: "error",
      links: [purchaseOrderLink],
    });
  });

  test("invalidates source and target link entries when an object type refreshes", () => {
    let state = reducer(undefined, celanworksmithLinkLoadStart(key));

    state = reducer(state, celanworksmithLinkLoadSuccess(key, linkedObjects));

    const targetEntry = {
      typeId: "Supplier",
      objectId: "S001",
      linkTypeId: "supplier_rating",
    };

    state = reducer(state, celanworksmithLinkLoadStart(targetEntry));
    state = reducer(
      state,
      celanworksmithLinkLoadSuccess(targetEntry, {
        ...linkedObjects,
        typeId: "SupplierRating",
      }),
    );

    state = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_REFRESH_START,
      payload: "ProductionOrder",
    });

    expect(state.entries[getCelanworksmithLinkKey(key)]).toBeUndefined();
    expect(state.entries[getCelanworksmithLinkKey(targetEntry)]).toBeDefined();
  });
});
