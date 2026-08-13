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
  getCelanworksmithLinkMetadataKey,
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
  test("stores legacy link metadata by source object type", () => {
    let state = reducer(
      undefined,
      celanworksmithLinkMetadataLoadRequested("PurchaseOrder"),
    );

    expect(state.metadata["legacy/PurchaseOrder"].status).toBe("loading");

    state = reducer(
      state,
      celanworksmithLinkMetadataLoadSuccess("PurchaseOrder", [
        purchaseOrderLink,
      ]),
    );

    expect(state.metadata["legacy/PurchaseOrder"]).toMatchObject({
      status: "ready",
      links: [purchaseOrderLink],
    });
  });

  test("isolates link metadata by application for the same source type", () => {
    let state = reducer(
      undefined,
      celanworksmithLinkMetadataLoadSuccess(
        "PurchaseOrder",
        [purchaseOrderLink],
        "app-1",
      ),
    );

    state = reducer(
      state,
      celanworksmithLinkMetadataLoadError(
        "PurchaseOrder",
        { code: "FORBIDDEN", message: "Forbidden" },
        "app-2",
      ),
    );

    expect(
      state.metadata[
        getCelanworksmithLinkMetadataKey("PurchaseOrder", "app-1")
      ],
    ).toMatchObject({ status: "ready", links: [purchaseOrderLink] });
    expect(
      state.metadata[
        getCelanworksmithLinkMetadataKey("PurchaseOrder", "app-2")
      ],
    ).toMatchObject({ status: "error", links: [] });
  });

  test("isolates link data by object and link type", () => {
    const otherKey = { ...key, objectId: "PO002" };
    let state = reducer(undefined, celanworksmithLinkLoadRequested(key));

    state = reducer(state, celanworksmithLinkLoadStart(key));
    state = reducer(state, celanworksmithLinkLoadSuccess(key, linkedObjects));
    state = reducer(state, celanworksmithLinkLoadRequested(otherKey));

    expect(getCelanworksmithLinkKey(key)).toBe(
      "legacy/PurchaseOrder/PO001/po_production",
    );
    expect(state.entries[getCelanworksmithLinkKey(key)]).toMatchObject({
      status: "ready",
      result: linkedObjects,
    });
    expect(state.entries[getCelanworksmithLinkKey(otherKey)]).toMatchObject({
      status: "idle",
    });
  });

  test("isolates link entries by application while retaining legacy entries", () => {
    const appRequest = { ...key, applicationId: "app-1" };
    const otherAppRequest = { ...key, applicationId: "app-2" };
    let state = reducer(
      undefined,
      celanworksmithLinkLoadSuccess(key, linkedObjects),
    );

    state = reducer(
      state,
      celanworksmithLinkLoadSuccess(appRequest, linkedObjects),
    );
    state = reducer(
      state,
      celanworksmithLinkLoadSuccess(otherAppRequest, linkedObjects),
    );

    expect(getCelanworksmithLinkKey(key)).toBe(
      "legacy/PurchaseOrder/PO001/po_production",
    );
    expect(getCelanworksmithLinkKey(appRequest)).toBe(
      "app-1/PurchaseOrder/PO001/po_production",
    );
    expect(getCelanworksmithLinkKey(otherAppRequest)).toBe(
      "app-2/PurchaseOrder/PO001/po_production",
    );
    expect(state.entries).toEqual({
      "legacy/PurchaseOrder/PO001/po_production": expect.any(Object),
      "app-1/PurchaseOrder/PO001/po_production": expect.any(Object),
      "app-2/PurchaseOrder/PO001/po_production": expect.any(Object),
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

  test("clears runtime Link entries for the target application while retaining metadata and other scopes", () => {
    const appKey = { ...key, applicationId: "app-1" };
    let state = reducer(
      undefined,
      celanworksmithLinkMetadataLoadSuccess("PurchaseOrder", [
        purchaseOrderLink,
      ]),
    );

    state = reducer(
      state,
      celanworksmithLinkLoadSuccess(appKey, linkedObjects),
    );
    state = reducer(state, celanworksmithLinkLoadSuccess(key, linkedObjects));
    state = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED,
      payload: { applicationId: "app-1" },
    });

    expect(state.entries[getCelanworksmithLinkKey(appKey)]).toBeUndefined();
    expect(state.entries[getCelanworksmithLinkKey(key)]).toBeDefined();
    expect(state.metadata["legacy/PurchaseOrder"].links).toEqual([
      purchaseOrderLink,
    ]);
  });

  test("clears all runtime Link entries when no application is targeted", () => {
    let state = reducer(
      undefined,
      celanworksmithLinkLoadSuccess(key, linkedObjects),
    );

    state = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED,
      payload: undefined,
    });

    expect(state.entries).toEqual({});
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

    expect(state.metadata["legacy/PurchaseOrder"]).toMatchObject({
      status: "error",
      links: [purchaseOrderLink],
    });
  });

  test("preserves source and target link entries when an object type refreshes", () => {
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

    const sourceEntry = {
      typeId: "ProductionOrder",
      objectId: "PR001",
      linkTypeId: "production_delivery",
    };

    state = reducer(state, celanworksmithLinkLoadStart(sourceEntry));
    state = reducer(
      state,
      celanworksmithLinkLoadSuccess(sourceEntry, {
        ...linkedObjects,
        typeId: "DeliveryOrder",
      }),
    );

    state = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_REFRESH_START,
      payload: "ProductionOrder",
    });

    expect(state.entries[getCelanworksmithLinkKey(key)]).toMatchObject({
      status: "ready",
      result: linkedObjects,
    });
    expect(state.entries[getCelanworksmithLinkKey(targetEntry)]).toBeDefined();
    expect(state.entries[getCelanworksmithLinkKey(sourceEntry)]).toMatchObject({
      status: "ready",
      result: { typeId: "DeliveryOrder" },
    });
  });
});
