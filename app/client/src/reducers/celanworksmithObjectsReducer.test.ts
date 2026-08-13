import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import reducer from "./celanworksmithObjectsReducer";

describe("celanworksmithObjectsReducer", () => {
  it("tracks metadata and loaded object type state", () => {
    let state = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECTS_LOAD_INIT,
      payload: undefined,
    });

    state = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECTS_METADATA_SUCCESS,
      payload: [{ id: "Supplier", displayName: "Supplier", properties: [] }],
    });

    expect(state.status).toBe("loading");
    expect(state.types.Supplier.status).toBe("loading");

    state = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_SUCCESS,
      payload: {
        typeId: "Supplier",
        result: {
          typeId: "Supplier",
          items: [
            { id: "S001", typeId: "Supplier", properties: { name: "One" } },
          ],
          offset: 0,
          limit: 100,
          total: 1,
        },
      },
    });

    expect(state.status).toBe("ready");
    expect(state.types.Supplier.items).toHaveLength(1);

    const cachedState = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECTS_LOAD_INIT,
      payload: undefined,
    });

    expect(cachedState.types.Supplier.items).toHaveLength(1);
    expect(cachedState.status).toBe("ready");
  });

  it("clears runtime object data while retaining metadata", () => {
    let state = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECTS_METADATA_SUCCESS,
      payload: [
        {
          id: "Supplier",
          displayName: "Supplier",
          properties: [],
        },
      ],
    });

    state = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_SUCCESS,
      payload: {
        typeId: "Supplier",
        result: {
          typeId: "Supplier",
          items: [
            { id: "S001", typeId: "Supplier", properties: { name: "One" } },
          ],
          offset: 0,
          limit: 100,
          total: 1,
        },
      },
    });

    const cleared = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED,
      payload: { applicationId: "app-1" },
    });

    expect(cleared.types.Supplier).toMatchObject({
      metadata: { id: "Supplier" },
      items: [],
      status: "idle",
      total: 0,
    });
  });

  it("distinguishes empty and failed types", () => {
    const state = reducer(
      {
        status: "loading",
        types: {
          Supplier: {
            items: [],
            total: 0,
            offset: 0,
            limit: 100,
            status: "loading",
          },
        },
      },
      {
        type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_ERROR,
        payload: {
          typeId: "Supplier",
          error: { code: "FORBIDDEN", message: "Access denied" },
        },
      },
    );

    expect(state.status).toBe("error");
    expect(state.types.Supplier.error?.code).toBe("FORBIDDEN");
  });

  it("marks only refreshed object types as loading", () => {
    const state = reducer(
      {
        status: "ready",
        types: {
          ProductionOrder: {
            items: [
              {
                id: "PR001",
                typeId: "ProductionOrder",
                properties: { scheduleDate: "2026-03-01" },
              },
            ],
            total: 1,
            offset: 0,
            limit: 100,
            status: "ready",
          },
          Supplier: {
            items: [
              {
                id: "S001",
                typeId: "Supplier",
                properties: { name: "Unchanged Supplier" },
              },
            ],
            total: 1,
            offset: 0,
            limit: 100,
            status: "ready",
          },
        },
      },
      {
        type: "CELANWORKSMITH_OBJECT_TYPE_REFRESH_START" as never,
        payload: "ProductionOrder",
      },
    );

    expect(state.types.ProductionOrder).toMatchObject({
      status: "loading",
      items: [
        {
          id: "PR001",
          typeId: "ProductionOrder",
          properties: { scheduleDate: "2026-03-01" },
        },
      ],
    });
    expect(state.types.Supplier).toEqual({
      items: [
        {
          id: "S001",
          typeId: "Supplier",
          properties: { name: "Unchanged Supplier" },
        },
      ],
      total: 1,
      offset: 0,
      limit: 100,
      status: "ready",
    });
  });
});
