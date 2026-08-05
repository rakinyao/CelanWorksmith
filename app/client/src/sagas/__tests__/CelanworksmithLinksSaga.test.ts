import CelanworksmithAPI from "api/CelanworksmithAPI";
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
import { all, call, put, select, takeEvery } from "redux-saga/effects";
import {
  loadCelanworksmithLink,
  loadCelanworksmithLinkMetadata,
  default as celanworksmithLinksSaga,
} from "../CelanworksmithLinksSaga";
import {
  getCelanworksmithLinkEntry,
  getCelanworksmithLinkMetadata,
} from "selectors/celanworksmithSelectors";

const request = {
  typeId: "PurchaseOrder",
  objectId: "PO001",
  linkTypeId: "po_production",
};

const linkType = {
  id: "po_production",
  displayName: "Purchase Order Production",
  sourceTypeId: "PurchaseOrder",
  targetTypeId: "ProductionOrder",
  cardinality: "ONE_TO_ONE",
};

const result = {
  typeId: "ProductionOrder",
  items: [],
  offset: 0,
  limit: 100,
  total: 0,
};

describe("loadCelanworksmithLinkMetadata", () => {
  it("calls the Link Type API for a source object type", () => {
    const iterator = loadCelanworksmithLinkMetadata(
      celanworksmithLinkMetadataLoadRequested("PurchaseOrder"),
    );

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithLinkMetadata, "PurchaseOrder"),
    );
    expect(iterator.next(undefined).value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.getLinkTypes],
        "PurchaseOrder",
      ),
    );
    expect(
      iterator.next({ responseMeta: { success: true }, data: [linkType] })
        .value,
    ).toEqual(
      put(celanworksmithLinkMetadataLoadSuccess("PurchaseOrder", [linkType])),
    );
    iterator.next();
  });

  it("loads metadata after Redux marks the initial request as loading", () => {
    const iterator = loadCelanworksmithLinkMetadata(
      celanworksmithLinkMetadataLoadRequested("PurchaseOrder"),
    );

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithLinkMetadata, "PurchaseOrder"),
    );
    expect(iterator.next({ status: "loading" }).value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.getLinkTypes],
        "PurchaseOrder",
      ),
    );
    expect(
      iterator.next({ responseMeta: { success: true }, data: [linkType] })
        .value,
    ).toEqual(
      put(celanworksmithLinkMetadataLoadSuccess("PurchaseOrder", [linkType])),
    );
    iterator.next();
  });

  it("normalizes metadata errors", () => {
    const iterator = loadCelanworksmithLinkMetadata(
      celanworksmithLinkMetadataLoadRequested("PurchaseOrder"),
    );

    iterator.next();
    iterator.next(undefined);

    expect(iterator.throw(new Error("Network Error")).value).toEqual(
      put(
        celanworksmithLinkMetadataLoadError("PurchaseOrder", {
          code: "NETWORK_ERROR",
          message: "The runtime service could not be reached.",
        }),
      ),
    );
    iterator.next();
  });
});

describe("loadCelanworksmithLink", () => {
  it("calls the linked-object API with its key and runtime query", () => {
    const action = celanworksmithLinkLoadRequested(request);
    const iterator = loadCelanworksmithLink(action);

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithLinkEntry, request),
    );
    expect(iterator.next(undefined).value).toEqual(
      put(celanworksmithLinkLoadStart(request)),
    );
    expect(iterator.next().value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.getLinkedObjects],
        "PurchaseOrder",
        "PO001",
        "po_production",
        { offset: 0, limit: 100 },
      ),
    );
    expect(
      iterator.next({ responseMeta: { success: true }, data: result }).value,
    ).toEqual(put(celanworksmithLinkLoadSuccess(request, result)));
    iterator.next();
  });

  it("does not reload an in-flight link key", () => {
    const iterator = loadCelanworksmithLink(
      celanworksmithLinkLoadRequested(request),
    );

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithLinkEntry, request),
    );
    expect(iterator.next(undefined).value).toEqual(
      put(celanworksmithLinkLoadStart(request)),
    );

    const duplicateIterator = loadCelanworksmithLink(
      celanworksmithLinkLoadRequested(request),
    );

    duplicateIterator.next();
    expect(duplicateIterator.next({ status: "loading" }).done).toBe(true);

    expect(iterator.next().value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.getLinkedObjects],
        "PurchaseOrder",
        "PO001",
        "po_production",
        { offset: 0, limit: 100 },
      ),
    );
    expect(
      iterator.next({ responseMeta: { success: true }, data: result }).value,
    ).toEqual(put(celanworksmithLinkLoadSuccess(request, result)));
    iterator.next();
  });

  it("does not reload a cached link unless forced", () => {
    const iterator = loadCelanworksmithLink(
      celanworksmithLinkLoadRequested(request),
    );

    iterator.next();
    expect(iterator.next({ status: "ready", result }).done).toBe(true);
  });

  it("reloads a cached link when forced", () => {
    const iterator = loadCelanworksmithLink(
      celanworksmithLinkLoadRequested({ ...request, force: true }),
    );

    iterator.next();
    expect(iterator.next({ status: "ready", result }).value).toEqual(
      put(celanworksmithLinkLoadStart({ ...request, force: true })),
    );
    expect(iterator.next().value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.getLinkedObjects],
        "PurchaseOrder",
        "PO001",
        "po_production",
        { offset: 0, limit: 100 },
      ),
    );
    iterator.return(undefined);
  });

  it("loads a prefetched link with the same API request", () => {
    const prefetchedRequest = { ...request, prefetch: true };
    const iterator = loadCelanworksmithLink(
      celanworksmithLinkLoadRequested(prefetchedRequest),
    );

    iterator.next();
    expect(iterator.next(undefined).value).toEqual(
      put(celanworksmithLinkLoadStart(prefetchedRequest)),
    );
    expect(iterator.next().value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.getLinkedObjects],
        "PurchaseOrder",
        "PO001",
        "po_production",
        { offset: 0, limit: 100 },
      ),
    );
    iterator.return(undefined);
  });

  it("normalizes linked-object errors", () => {
    const iterator = loadCelanworksmithLink(
      celanworksmithLinkLoadRequested(request),
    );

    iterator.next();
    iterator.next(undefined);
    iterator.next();

    expect(iterator.throw(new Error("Network Error")).value).toEqual(
      put(
        celanworksmithLinkLoadError(request, {
          code: "NETWORK_ERROR",
          message: "The runtime service could not be reached.",
        }),
      ),
    );
    iterator.next();
  });
});

describe("celanworksmithLinksSaga", () => {
  it("watches metadata and link requests", () => {
    const iterator = celanworksmithLinksSaga();

    expect(iterator.next().value).toEqual(
      all([
        takeEvery(
          ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_REQUESTED,
          expect.any(Function),
        ),
        takeEvery(
          ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_REQUESTED,
          expect.any(Function),
        ),
      ]),
    );
  });
});
