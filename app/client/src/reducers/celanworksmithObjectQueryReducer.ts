import type { CelanworksmithObjectSet } from "api/CelanworksmithAPI";
import type { ReduxAction } from "actions/ReduxActionTypes";
import {
  getCelanworksmithObjectQuerySignature,
  type CelanworksmithObjectQueryRequest,
} from "actions/celanworksmithObjectQueryActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { createReducer } from "utils/ReducerUtils";
import type { CelanworksmithObjectQueryError } from "actions/celanworksmithObjectQueryActions";

export type CelanworksmithObjectQueryStatus =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error";

export interface CelanworksmithObjectQueryEntry {
  request: CelanworksmithObjectQueryRequest;
  result?: CelanworksmithObjectSet;
  status: CelanworksmithObjectQueryStatus;
  error?: CelanworksmithObjectQueryError;
  updatedAt?: number;
}

export interface CelanworksmithObjectQueryState {
  entries: Record<string, CelanworksmithObjectQueryEntry>;
}

export const getObjectQueryKey = (request: CelanworksmithObjectQueryRequest) =>
  `${request.applicationId ? `${request.applicationId}/` : ""}${request.widgetId}/${request.typeId}/${getCelanworksmithObjectQuerySignature(request.query)}`;

const initialState: CelanworksmithObjectQueryState = { entries: {} };

const getCurrent = (
  state: CelanworksmithObjectQueryState,
  request: CelanworksmithObjectQueryRequest,
): CelanworksmithObjectQueryEntry =>
  state.entries[getObjectQueryKey(request)] || {
    request,
    status: "idle",
  };

const celanworksmithObjectQueryReducer = createReducer(initialState, {
  [ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST]: () =>
    initialState,
  [ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED]: (
    state: CelanworksmithObjectQueryState,
    action: ReduxAction<{ applicationId?: string } | undefined>,
  ) => {
    const applicationId = action.payload?.applicationId;

    if (!applicationId) return initialState;

    return {
      ...state,
      entries: Object.fromEntries(
        Object.entries(state.entries).filter(
          ([, entry]) => entry.request.applicationId !== applicationId,
        ),
      ),
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_REQUESTED]: (
    state: CelanworksmithObjectQueryState,
    action: ReduxAction<CelanworksmithObjectQueryRequest>,
  ) => {
    const key = getObjectQueryKey(action.payload);

    if (state.entries[key]) return state;

    return {
      ...state,
      entries: { ...state.entries, [key]: getCurrent(state, action.payload) },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START]: (
    state: CelanworksmithObjectQueryState,
    action: ReduxAction<CelanworksmithObjectQueryRequest>,
  ) => {
    const key = getObjectQueryKey(action.payload);
    const current = getCurrent(state, action.payload);

    return {
      ...state,
      entries: {
        ...state.entries,
        [key]: {
          ...current,
          request: action.payload,
          status: "loading",
          error: undefined,
        },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_SUCCESS]: (
    state: CelanworksmithObjectQueryState,
    action: ReduxAction<
      CelanworksmithObjectQueryRequest & { result: CelanworksmithObjectSet }
    >,
  ) => {
    const { result, ...request } = action.payload;
    const key = getObjectQueryKey(request);

    return {
      ...state,
      entries: {
        ...state.entries,
        [key]: {
          request,
          result,
          status: result.items.length ? "ready" : "empty",
          updatedAt: Date.now(),
        },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_ERROR]: (
    state: CelanworksmithObjectQueryState,
    action: ReduxAction<
      CelanworksmithObjectQueryRequest & {
        error: CelanworksmithObjectQueryError;
      }
    >,
  ) => {
    const { error, ...request } = action.payload;
    const key = getObjectQueryKey(request);
    const current = getCurrent(state, request);

    return {
      ...state,
      entries: {
        ...state.entries,
        [key]: { ...current, request, status: "error", error },
      },
    };
  },
});

export default celanworksmithObjectQueryReducer;
