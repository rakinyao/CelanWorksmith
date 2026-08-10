import CelanworksmithAPI from "api/CelanworksmithAPI";
import {
  all,
  call,
  put,
  select,
  takeEvery,
  takeLeading,
} from "redux-saga/effects";
import {
  CELANWORKSMITH_OBJECT_QUERY_LIMIT,
  CELANWORKSMITH_OBJECT_LOAD_TRIGGERS,
  loadCelanworksmithObjects,
  loadCelanworksmithObjectType,
  default as celanworksmithObjectsSaga,
} from "../CelanworksmithObjectsSaga";
import {
  refreshCelanworksmithTernDefinitions,
  updateTernDefinitions,
} from "../PostEvaluationSagas";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import {
  celanworksmithObjectTypeLoadStart,
  celanworksmithObjectTypeLoadSuccess,
  celanworksmithObjectsLoadInit,
} from "actions/celanworksmithObjectActions";
import { getAllJSActionsData } from "ee/selectors/entitiesSelector";
import CodemirrorTernService from "utils/autocomplete/CodemirrorTernService";
import {
  getCelanworksmithObjectsDataTree,
  getCelanworksmithVariablesDataTree,
  getCelanworksmithObjectsState,
  getConfigTree,
  getDataTree,
} from "selectors/dataTreeSelectors";
import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithCurrentApplicationId,
} from "selectors/celanworksmithApplicationBindingSelectors";
import type { DataTree } from "entities/DataTree/dataTreeTypes";
import { DataTreeDiffEvent } from "ee/workers/Evaluation/evaluationUtils";

describe("loadCelanworksmithObjectType", () => {
  it("fetches all pages using the runtime limit", () => {
    const iterator = loadCelanworksmithObjectType("PurchaseOrder");
    const firstPage = {
      responseMeta: { status: 200, success: true },
      data: {
        typeId: "PurchaseOrder",
        items: Array.from({ length: 100 }, (_, index) => ({
          id: `PO${index + 1}`,
          typeId: "PurchaseOrder",
          properties: {},
        })),
        offset: 0,
        limit: CELANWORKSMITH_OBJECT_QUERY_LIMIT,
        total: 101,
      },
    };
    const secondPage = {
      responseMeta: { status: 200, success: true },
      data: {
        typeId: "PurchaseOrder",
        items: [{ id: "PO101", typeId: "PurchaseOrder", properties: {} }],
        offset: 100,
        limit: CELANWORKSMITH_OBJECT_QUERY_LIMIT,
        total: 101,
      },
    };

    expect(iterator.next().value).toEqual(
      put(celanworksmithObjectTypeLoadStart("PurchaseOrder")),
    );
    expect(iterator.next().value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.queryObjects],
        "PurchaseOrder",
        {
          offset: 0,
          limit: CELANWORKSMITH_OBJECT_QUERY_LIMIT,
        },
      ),
    );
    expect(iterator.next(firstPage).value).toEqual(
      call(
        [CelanworksmithAPI, CelanworksmithAPI.queryObjects],
        "PurchaseOrder",
        {
          offset: 100,
          limit: CELANWORKSMITH_OBJECT_QUERY_LIMIT,
        },
      ),
    );
    expect(iterator.next(secondPage).value).toEqual(
      put(
        celanworksmithObjectTypeLoadSuccess("PurchaseOrder", {
          typeId: "PurchaseOrder",
          items: [...firstPage.data.items, ...secondPage.data.items],
          offset: 0,
          limit: CELANWORKSMITH_OBJECT_QUERY_LIMIT,
          total: 101,
        }),
      ),
    );
    expect(iterator.next().done).toBe(true);
  });

  it("refreshes autocomplete definitions after object data loads", () => {
    const iterator = refreshCelanworksmithTernDefinitions();
    const dataTree = { $objects: {} } as unknown as DataTree;
    const jsData: Record<string, unknown> = {};

    expect(iterator.next().value).toEqual(select(getDataTree));
    expect(iterator.next(dataTree).value).toEqual(select(getAllJSActionsData));
    expect(iterator.next(jsData as unknown as DataTree).value).toEqual(
      call(
        updateTernDefinitions,
        dataTree,
        getConfigTree(),
        [],
        false,
        jsData,
        true,
      ),
    );
    expect(iterator.next().done).toBe(true);
  });

  it("refreshes definitions when an execution namespace is edited", () => {
    const iterator = updateTernDefinitions(
      {} as DataTree,
      {},
      [
        {
          event: DataTreeDiffEvent.EDIT,
          payload: { propertyPath: "$functions.CalculateDelayDays._meta" },
        },
      ],
      false,
    );

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithObjectsDataTree),
    );
  });

  it("builds Tern definitions from the plain DataTree refresh path", () => {
    const updateDef = jest
      .spyOn(CodemirrorTernService, "updateDef")
      .mockImplementation(() => undefined);

    try {
      const iterator = updateTernDefinitions(
        { Input1: { value: "text" } } as never,
        {},
        [
          {
            event: DataTreeDiffEvent.EDIT,
            payload: { propertyPath: "$actions.SaveOrder.data" },
          },
        ],
        false,
      );
      const celanworksmithObjects = {
        ENTITY_TYPE: "CELANWORKSMITH_OBJECTS",
      };
      const celanworksmithExecution = {
        $functions: {
          ENTITY_TYPE: "CELANWORKSMITH_FUNCTION",
          CalculateDelayDays: { data: 3 },
        },
        $actions: {
          ENTITY_TYPE: "CELANWORKSMITH_ACTION",
          SaveOrder: { data: {} },
        },
      };
      const celanworksmithVariables = {
        ENTITY_TYPE: "CELANWORKSMITH_VARIABLES",
        delayedOrders: [],
      };

      expect(iterator.next().value).toEqual(
        select(getCelanworksmithObjectsDataTree),
      );
      expect(iterator.next(celanworksmithObjects).value).toEqual(
        expect.objectContaining({
          type: "SELECT",
        }),
      );
      expect(iterator.next(celanworksmithExecution).value).toEqual(
        select(getCelanworksmithVariablesDataTree),
      );
      expect(iterator.next(celanworksmithVariables).done).toBe(true);
      expect(updateDef).toHaveBeenCalledWith(
        "DATA_TREE",
        expect.objectContaining({
          $functions: expect.any(Object),
          $actions: expect.any(Object),
          $variables: expect.any(Object),
        }),
        expect.any(Map),
      );
    } finally {
      updateDef.mockRestore();
    }
  });
});

describe("loadCelanworksmithObjects", () => {
  it("does not load legacy mock data for an unbound application", () => {
    const iterator = loadCelanworksmithObjects();

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithCurrentApplicationId),
    );
    expect(iterator.next("app-1").value).toEqual(
      select(getCelanworksmithApplicationBindingState),
    );
    expect(
      iterator.next({
        status: "unbound",
        applicationId: "app-1",
        binding: null,
        projects: [],
        versions: [],
      }).done,
    ).toBe(true);
  });

  it("calls the object type API with its class context", () => {
    const iterator = loadCelanworksmithObjects();

    iterator.next();
    iterator.next(undefined);
    iterator.next(undefined);
    iterator.next({ status: "idle", types: {} });

    expect(iterator.next().value).toEqual(
      call([CelanworksmithAPI, CelanworksmithAPI.getObjectTypes]),
    );
  });

  it("retries when the cached state is stuck in loading", () => {
    const iterator = loadCelanworksmithObjects();

    iterator.next();
    iterator.next(undefined);
    expect(iterator.next().value).toEqual(
      select(getCelanworksmithObjectsState),
    );
    expect(iterator.next({ status: "loading", types: {} }).value).toEqual(
      put(celanworksmithObjectsLoadInit()),
    );
  });
});

describe("celanworksmithObjectsSaga", () => {
  it("loads objects after editor initialization and page lifecycle events", () => {
    const iterator = celanworksmithObjectsSaga();

    expect(iterator.next().value).toEqual(
      all([
        takeLeading(CELANWORKSMITH_OBJECT_LOAD_TRIGGERS, expect.any(Function)),
        takeEvery(
          "CELANWORKSMITH_OBJECT_TYPES_REFRESH_REQUESTED",
          expect.any(Function),
        ),
      ]),
    );

    expect(CELANWORKSMITH_OBJECT_LOAD_TRIGGERS).toEqual(
      expect.arrayContaining([
        ReduxActionTypes.INITIALIZE_EDITOR_SUCCESS,
        ReduxActionTypes.INITIALIZE_PAGE_VIEWER_SUCCESS,
        ReduxActionTypes.FETCH_PAGE_INIT,
        ReduxActionTypes.FETCH_PAGE_SUCCESS,
      ]),
    );
  });
});
