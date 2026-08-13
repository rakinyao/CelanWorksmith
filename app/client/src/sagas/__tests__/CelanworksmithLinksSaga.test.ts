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
import { runSaga, stdChannel } from "redux-saga";
import { all, call, put, select } from "redux-saga/effects";
import {
  loadCelanworksmithLink,
  loadCelanworksmithLinkMetadata,
  watchCelanworksmithLinkMetadataRequests,
  watchCelanworksmithLinkRequests,
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

const waitForCallCount = async (mock: jest.Mock, count: number) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (mock.mock.calls.length === count) return;

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  expect(mock).toHaveBeenCalledTimes(count);
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("loadCelanworksmithLinkMetadata", () => {
  it("passes application context to the metadata API", () => {
    const iterator = loadCelanworksmithLinkMetadata(
      celanworksmithLinkMetadataLoadRequested("PurchaseOrder", false, "app-1"),
    );

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithLinkMetadata, "PurchaseOrder", "app-1"),
    );
    expect(iterator.next(undefined).value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.getLinkTypes],
        "PurchaseOrder",
        "app-1",
      ),
    );
    expect(
      iterator.next({ responseMeta: { success: true }, data: [linkType] })
        .value,
    ).toEqual(
      put(
        celanworksmithLinkMetadataLoadSuccess(
          "PurchaseOrder",
          [linkType],
          "app-1",
        ),
      ),
    );
    iterator.next();
  });

  it("does not reuse metadata from another application with the same type", () => {
    const iterator = loadCelanworksmithLinkMetadata(
      celanworksmithLinkMetadataLoadRequested("PurchaseOrder", false, "app-2"),
    );

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithLinkMetadata, "PurchaseOrder", "app-2"),
    );
    expect(iterator.next(undefined).value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.getLinkTypes],
        "PurchaseOrder",
        "app-2",
      ),
    );
    iterator.return(undefined);
  });

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
  it("passes application context to the linked-object API", () => {
    const appRequest = { ...request, applicationId: "app-1" };
    const iterator = loadCelanworksmithLink(
      celanworksmithLinkLoadRequested(appRequest),
    );

    iterator.next();
    expect(iterator.next(undefined).value).toEqual(
      put(celanworksmithLinkLoadStart(appRequest)),
    );
    expect(iterator.next().value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.getLinkedObjects],
        "PurchaseOrder",
        "PO001",
        "po_production",
        { offset: 0, limit: 100 },
        "app-1",
      ),
    );
  });

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
    expect(iterator.next().value).toEqual(
      put({ type: ReduxActionTypes.TRIGGER_EVAL }),
    );
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

  it("replaces an in-flight link request when the same key is forced", async () => {
    let resolveFirstRequest: (value: unknown) => void = () => undefined;
    const firstRequest = new Promise((resolve) => {
      resolveFirstRequest = resolve;
    });
    const forcedResult = {
      ...result,
      items: [{ id: "PROD002", typeId: "ProductionOrder", properties: {} }],
      total: 1,
    };
    const getLinkedObjects = jest
      .spyOn(CelanworksmithAPI, "getLinkedObjects")
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
          celanworksmithLinks: { metadata: {}, entries: {} },
        }),
      },
      celanworksmithLinksSaga,
    );

    try {
      channel.put(celanworksmithLinkLoadRequested(request));
      await waitForCallCount(getLinkedObjects, 1);

      channel.put(celanworksmithLinkLoadRequested(request));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(getLinkedObjects).toHaveBeenCalledTimes(1);

      channel.put(celanworksmithLinkLoadRequested({ ...request, force: true }));
      await waitForCallCount(getLinkedObjects, 2);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        dispatched.filter(
          (action) =>
            action.type === ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_SUCCESS,
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
        data: result,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        dispatched.filter(
          (action) =>
            action.type === ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_SUCCESS,
        ),
      ).toHaveLength(1);
    } finally {
      task.cancel();
      await task.toPromise();
    }
  });

  it("replaces an in-flight metadata request when the same key is forced", async () => {
    let resolveFirstRequest: (value: unknown) => void = () => undefined;
    const firstRequest = new Promise((resolve) => {
      resolveFirstRequest = resolve;
    });
    const forcedLinkType = { ...linkType, displayName: "Updated Link" };
    const getLinkTypes = jest
      .spyOn(CelanworksmithAPI, "getLinkTypes")
      .mockImplementationOnce(() => firstRequest as never)
      .mockResolvedValueOnce({
        responseMeta: { status: 200, success: true },
        data: [forcedLinkType],
      });
    const channel = stdChannel();
    const dispatched: Array<{ type: string; payload?: unknown }> = [];
    const task = runSaga(
      {
        channel,
        dispatch: (action) => dispatched.push(action),
        getState: () => ({
          celanworksmithLinks: { metadata: {}, entries: {} },
        }),
      },
      celanworksmithLinksSaga,
    );

    try {
      channel.put(celanworksmithLinkMetadataLoadRequested("PurchaseOrder"));
      await waitForCallCount(getLinkTypes, 1);

      channel.put(celanworksmithLinkMetadataLoadRequested("PurchaseOrder"));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(getLinkTypes).toHaveBeenCalledTimes(1);

      channel.put(
        celanworksmithLinkMetadataLoadRequested("PurchaseOrder", true),
      );
      await waitForCallCount(getLinkTypes, 2);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        dispatched.filter(
          (action) =>
            action.type ===
            ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_SUCCESS,
        ),
      ).toEqual([
        expect.objectContaining({
          payload: expect.objectContaining({ links: [forcedLinkType] }),
        }),
      ]);

      resolveFirstRequest({
        responseMeta: { status: 200, success: true },
        data: [linkType],
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        dispatched.filter(
          (action) =>
            action.type ===
            ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_SUCCESS,
        ),
      ).toHaveLength(1);
    } finally {
      task.cancel();
      await task.toPromise();
    }
  });
});

describe("celanworksmithLinksSaga", () => {
  it("watches metadata and link requests", () => {
    const iterator = celanworksmithLinksSaga();

    expect(iterator.next().value).toEqual(
      all([
        call(watchCelanworksmithLinkMetadataRequests),
        call(watchCelanworksmithLinkRequests),
      ]),
    );
  });
});
