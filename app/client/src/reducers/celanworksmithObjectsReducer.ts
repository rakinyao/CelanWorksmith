import type {
  CelanworksmithObjectInstance,
  CelanworksmithObjectType,
  CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";
import { createReducer } from "utils/ReducerUtils";
import type { ReduxAction } from "actions/ReduxActionTypes";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";

export type CelanworksmithObjectLoadStatus =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error";

export interface CelanworksmithObjectError {
  code: string;
  message: string;
}

export interface CelanworksmithObjectTypeState {
  metadata?: CelanworksmithObjectType;
  items: CelanworksmithObjectInstance[];
  total: number;
  offset: number;
  limit: number;
  status: CelanworksmithObjectLoadStatus;
  updatedAt?: number;
  error?: CelanworksmithObjectError;
}

export interface CelanworksmithObjectsState {
  status: CelanworksmithObjectLoadStatus;
  types: Record<string, CelanworksmithObjectTypeState>;
  error?: CelanworksmithObjectError;
  updatedAt?: number;
}

const initialState: CelanworksmithObjectsState = {
  status: "idle",
  types: {},
};

const getOverallStatus = (
  types: Record<string, CelanworksmithObjectTypeState>,
): CelanworksmithObjectLoadStatus => {
  const values = Object.values(types);

  if (values.some((type) => type.status === "error")) return "error";

  if (values.some((type) => type.status === "loading")) return "loading";

  if (!values.length || values.every((type) => type.status === "empty")) {
    return values.length ? "empty" : "idle";
  }

  return "ready";
};

const initialTypeState = (
  metadata?: CelanworksmithObjectType,
): CelanworksmithObjectTypeState => ({
  metadata,
  items: [],
  total: 0,
  offset: 0,
  limit: 100,
  status: "loading",
});

const celanworksmithObjectsReducer = createReducer(initialState, {
  [ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST]: () =>
    initialState,
  [ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED]: (
    state: CelanworksmithObjectsState,
  ) => {
    const types = Object.fromEntries(
      Object.entries(state.types).map(([typeId, typeState]) => [
        typeId,
        {
          ...typeState,
          items: [],
          total: 0,
          offset: 0,
          status: "idle" as const,
          error: undefined,
          updatedAt: undefined,
        },
      ]),
    );

    return {
      ...state,
      types,
      status: "idle",
      error: undefined,
      updatedAt: undefined,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECTS_LOAD_INIT]: (
    state: CelanworksmithObjectsState,
  ) => ({
    ...state,
    status: Object.keys(state.types).length
      ? getOverallStatus(state.types)
      : "loading",
    error: undefined,
  }),
  [ReduxActionTypes.CELANWORKSMITH_OBJECTS_METADATA_SUCCESS]: (
    state: CelanworksmithObjectsState,
    action: ReduxAction<CelanworksmithObjectType[]>,
  ) => {
    const types = Object.fromEntries(
      action.payload.map((metadata) => [
        metadata.id,
        initialTypeState(metadata),
      ]),
    );

    return {
      ...state,
      types,
      status: getOverallStatus(types),
      error: undefined,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_START]: (
    state: CelanworksmithObjectsState,
    action: ReduxAction<string>,
  ) => {
    const current = state.types[action.payload] || initialTypeState();
    const nextTypes: Record<string, CelanworksmithObjectTypeState> = {
      ...state.types,
      [action.payload]: { ...current, status: "loading", error: undefined },
    };

    return { ...state, types: nextTypes, status: "loading" };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_REFRESH_START]: (
    state: CelanworksmithObjectsState,
    action: ReduxAction<string>,
  ) => {
    const current = state.types[action.payload] || initialTypeState();
    const nextTypes: Record<string, CelanworksmithObjectTypeState> = {
      ...state.types,
      [action.payload]: { ...current, status: "loading", error: undefined },
    };

    return { ...state, types: nextTypes, status: getOverallStatus(nextTypes) };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_SUCCESS]: (
    state: CelanworksmithObjectsState,
    action: ReduxAction<{ typeId: string; result: CelanworksmithObjectSet }>,
  ) => {
    const { result, typeId } = action.payload;
    const current = state.types[typeId] || initialTypeState();
    const items = result.items || [];
    const updatedAt = Date.now();
    const nextTypes: Record<string, CelanworksmithObjectTypeState> = {
      ...state.types,
      [typeId]: {
        ...current,
        items,
        total: result.total ?? items.length,
        offset: result.offset ?? 0,
        limit: result.limit ?? 100,
        status: items.length ? "ready" : "empty",
        updatedAt,
        error: undefined,
      },
    };

    return {
      ...state,
      types: nextTypes,
      status: getOverallStatus(nextTypes),
      updatedAt,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_ERROR]: (
    state: CelanworksmithObjectsState,
    action: ReduxAction<{
      typeId: string;
      error: CelanworksmithObjectError;
    }>,
  ) => {
    const { error, typeId } = action.payload;
    const current = state.types[typeId] || initialTypeState();
    const nextTypes: Record<string, CelanworksmithObjectTypeState> = {
      ...state.types,
      [typeId]: { ...current, status: "error", error },
    };

    return { ...state, types: nextTypes, status: "error", error };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECTS_LOAD_ERROR]: (
    state: CelanworksmithObjectsState,
    action: ReduxAction<CelanworksmithObjectError>,
  ) => ({ ...state, status: "error", error: action.payload }),
});

export default celanworksmithObjectsReducer;
