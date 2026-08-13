import type {
  CelanworksmithActionResult,
  CelanworksmithExecutionError,
  CelanworksmithExecutionMeta,
  CelanworksmithExecutionStatus,
  CelanworksmithObjectInstance,
} from "api/CelanworksmithAPI";
import type {
  CelanworksmithActionFailurePayload,
  CelanworksmithActionRequestPayload,
  CelanworksmithActionSuccessPayload,
  CelanworksmithFunctionFailurePayload,
  CelanworksmithFunctionRequestPayload,
  CelanworksmithFunctionSuccessPayload,
} from "actions/celanworksmithExecutionActions";
import { getCelanworksmithFunctionCacheKey } from "actions/celanworksmithExecutionActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { createReducer } from "utils/ReducerUtils";
import {
  preserveCelanworksmithLocalInput,
  type CelanworksmithInputState,
} from "utils/celanworksmithInputPreservation";

export interface CelanworksmithFunctionExecutionState {
  data?: unknown;
  meta: CelanworksmithExecutionMeta;
  lastSuccessfulRequestId?: string;
}

export interface CelanworksmithActionExecutionState {
  data?: CelanworksmithActionResult;
  changedObjects: CelanworksmithObjectInstance[];
  sideEffects: Record<string, unknown>[];
  objectTypeId: string;
  objectId: string;
  meta: CelanworksmithExecutionMeta;
  lastSuccessfulRequestId?: string;
}

export interface CelanworksmithRequestState {
  requestId: string;
  kind: "function" | "action";
  entityId: string;
  status: CelanworksmithExecutionStatus;
  parametersHash: string;
  startedAt?: number;
  completedAt?: number;
  error?: CelanworksmithExecutionError;
  progress?: number;
  retryCount?: number;
  abortController?: AbortController;
}

export interface CelanworksmithExecutionState {
  functions: Record<string, CelanworksmithFunctionExecutionState>;
  actions: Record<string, CelanworksmithActionExecutionState>;
  requests: Record<string, CelanworksmithRequestState>;
  functionCache: Record<string, { data: unknown; expiresAt: number }>;
  inputs: Record<string, CelanworksmithInputState>;
}

const initialState: CelanworksmithExecutionState = {
  functions: {},
  actions: {},
  requests: {},
  functionCache: {},
  inputs: {},
};

const createMeta = (
  payload: CelanworksmithFunctionRequestPayload,
  status: CelanworksmithExecutionStatus,
): CelanworksmithExecutionMeta => ({
  status,
  requestId: payload.requestId,
  parametersHash: payload.parametersHash,
});

const createRequest = (
  payload: CelanworksmithFunctionRequestPayload,
  status: CelanworksmithExecutionStatus,
): CelanworksmithRequestState => ({
  requestId: payload.requestId,
  kind: "function",
  entityId: payload.functionId,
  status,
  parametersHash: payload.parametersHash,
  retryCount: 0,
});

const createActionMeta = (
  payload: CelanworksmithActionRequestPayload,
  status: CelanworksmithExecutionStatus,
): CelanworksmithExecutionMeta => ({
  status,
  requestId: payload.requestId,
  parametersHash: payload.parametersHash,
  progress: status === "queued" ? 0 : status === "running" ? 50 : 100,
});

const createActionRequest = (
  payload: CelanworksmithActionRequestPayload,
  status: CelanworksmithExecutionStatus,
): CelanworksmithRequestState => ({
  requestId: payload.requestId,
  kind: "action",
  entityId: payload.actionId,
  status,
  parametersHash: payload.parametersHash,
  retryCount: 0,
  progress: status === "queued" ? 0 : status === "running" ? 50 : 100,
});

const queueFunction = (
  state: CelanworksmithExecutionState,
  payload: CelanworksmithFunctionRequestPayload,
) => {
  const existingRequest = state.requests[payload.requestId];

  if (existingRequest?.status === "cancelled") return state;

  const currentFunction = state.functions[payload.functionId];
  const isAlreadyQueued =
    currentFunction?.meta.requestId === payload.requestId &&
    currentFunction.meta.status === "queued" &&
    existingRequest?.status === "queued";

  if (isAlreadyQueued) return state;

  const functionCache = Object.fromEntries(
    Object.entries(state.functionCache).filter(
      ([, entry]) => entry.expiresAt > Date.now(),
    ),
  );

  return {
    ...state,
    functionCache,
    functions: {
      ...state.functions,
      [payload.functionId]: {
        data: currentFunction?.data,
        lastSuccessfulRequestId: currentFunction?.lastSuccessfulRequestId,
        meta: createMeta(payload, "queued"),
      },
    },
    requests: {
      ...state.requests,
      [payload.requestId]: createRequest(payload, "queued"),
    },
  };
};

const queueAction = (
  state: CelanworksmithExecutionState,
  payload: CelanworksmithActionRequestPayload,
) => {
  const existingRequest = state.requests[payload.requestId];

  if (existingRequest?.status === "cancelled") return state;

  const currentAction = state.actions[payload.actionId];
  const isSameQueuedRequest =
    currentAction?.meta.requestId === payload.requestId &&
    currentAction.meta.status === "queued" &&
    existingRequest?.status === "queued";

  if (isSameQueuedRequest) return state;

  const isActionInFlight =
    currentAction?.meta.status === "queued" ||
    currentAction?.meta.status === "running";

  if (isActionInFlight) {
    if (currentAction.meta.requestId === payload.requestId) return state;

    const completedAt = Date.now();
    const error: CelanworksmithExecutionError = {
      code: "DUPLICATE_REQUEST",
      message: "An identical action is already running.",
    };

    return {
      ...state,
      requests: {
        ...state.requests,
        [payload.requestId]: {
          ...createActionRequest(payload, "failed"),
          completedAt,
          error,
        },
      },
    };
  }

  return {
    ...state,
    actions: {
      ...state.actions,
      [payload.actionId]: {
        data: currentAction?.data,
        changedObjects: currentAction?.changedObjects || [],
        sideEffects: currentAction?.sideEffects || [],
        objectTypeId: payload.request?.objectTypeId || "",
        objectId: payload.request?.objectId || "",
        meta: createActionMeta(payload, "queued"),
        lastSuccessfulRequestId: currentAction?.lastSuccessfulRequestId,
      },
    },
    requests: {
      ...state.requests,
      [payload.requestId]: createActionRequest(payload, "queued"),
    },
  };
};

const isCurrentFunctionRequest = (
  state: CelanworksmithExecutionState,
  payload: CelanworksmithFunctionRequestPayload,
) => state.functions[payload.functionId]?.meta.requestId === payload.requestId;

const isCurrentActionRequest = (
  state: CelanworksmithExecutionState,
  payload: CelanworksmithActionRequestPayload,
) => state.actions[payload.actionId]?.meta.requestId === payload.requestId;

const updateRequestStatus = (
  request: CelanworksmithRequestState,
  status: CelanworksmithExecutionStatus,
  updates: Partial<CelanworksmithRequestState> = {},
) => ({ ...request, ...updates, status });

const celanworksmithExecutionReducer = createReducer(initialState, {
  [ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED]: (
    state: CelanworksmithExecutionState,
    action: ReduxAction<{ applicationId?: string } | undefined>,
  ) => {
    const applicationId = action.payload?.applicationId;

    if (!applicationId) return { ...state, functionCache: {} };

    const prefix = `${applicationId}:`;

    return {
      ...state,
      functionCache: Object.fromEntries(
        Object.entries(state.functionCache).filter(
          ([key]) => !key.startsWith(prefix),
        ),
      ),
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST]: () =>
    initialState,
  [ReduxActionTypes.CELANWORKSMITH_FUNCTION_RUN]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithFunctionRequestPayload },
  ) => queueFunction(state, action.payload),
  [ReduxActionTypes.CELANWORKSMITH_FUNCTION_RETRY]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithFunctionRequestPayload },
  ) => queueFunction(state, action.payload),
  [ReduxActionTypes.CELANWORKSMITH_FUNCTION_QUEUED]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithFunctionRequestPayload },
  ) => queueFunction(state, action.payload),
  [ReduxActionTypes.CELANWORKSMITH_FUNCTION_RUNNING]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithFunctionRequestPayload },
  ) => {
    const request = state.requests[action.payload.requestId];

    if (!request || request.status === "cancelled") return state;

    const startedAt = Date.now();
    const requests = {
      ...state.requests,
      [request.requestId]: updateRequestStatus(request, "running", {
        startedAt,
        completedAt: undefined,
        error: undefined,
        retryCount:
          request.status === "running" ? (request.retryCount || 0) + 1 : 0,
      }),
    };

    if (!isCurrentFunctionRequest(state, action.payload)) {
      return { ...state, requests };
    }

    const currentFunction = state.functions[action.payload.functionId];

    return {
      ...state,
      functions: {
        ...state.functions,
        [action.payload.functionId]: {
          ...currentFunction,
          meta: {
            ...createMeta(action.payload, "running"),
            startedAt,
          },
        },
      },
      requests,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_FUNCTION_SUCCEEDED]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithFunctionSuccessPayload },
  ) => {
    const { cacheExpiresAt, data, functionId, requestId } = action.payload;
    const request = state.requests[requestId];

    if (!request || request.status === "cancelled") return state;

    const completedAt = Date.now();
    const requests = {
      ...state.requests,
      [requestId]: updateRequestStatus(request, "succeeded", {
        completedAt,
        error: undefined,
      }),
    };

    if (!isCurrentFunctionRequest(state, action.payload)) {
      return { ...state, requests };
    }

    const functionCache = cacheExpiresAt
      ? {
          ...state.functionCache,
          [getCelanworksmithFunctionCacheKey(
            functionId,
            action.payload.parametersHash,
            action.payload.applicationId,
          )]: {
            data,
            expiresAt: cacheExpiresAt,
          },
        }
      : state.functionCache;

    return {
      ...state,
      functionCache,
      functions: {
        ...state.functions,
        [functionId]: {
          data,
          lastSuccessfulRequestId: requestId,
          meta: {
            ...createMeta(action.payload, "succeeded"),
            completedAt,
          },
        },
      },
      requests,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_FUNCTION_FAILED]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithFunctionFailurePayload },
  ) => {
    const { error, functionId, requestId } = action.payload;
    const request = state.requests[requestId];

    if (!request || request.status === "cancelled") return state;

    const completedAt = Date.now();
    const requests = {
      ...state.requests,
      [requestId]: updateRequestStatus(request, "failed", {
        completedAt,
        error,
      }),
    };

    if (!isCurrentFunctionRequest(state, action.payload)) {
      return { ...state, requests };
    }

    const currentFunction = state.functions[functionId];

    return {
      ...state,
      functions: {
        ...state.functions,
        [functionId]: {
          ...currentFunction,
          meta: {
            ...createMeta(action.payload, "failed"),
            completedAt,
            error,
          },
        },
      },
      requests,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_FUNCTION_CANCEL]: (
    state: CelanworksmithExecutionState,
    action: { payload: { requestId: string } },
  ) => {
    const request = state.requests[action.payload.requestId];

    if (
      !request ||
      request.kind !== "function" ||
      (request.status !== "queued" && request.status !== "running")
    ) {
      return state;
    }

    const completedAt = Date.now();
    const requests = {
      ...state.requests,
      [request.requestId]: updateRequestStatus(request, "cancelled", {
        completedAt,
        error: undefined,
      }),
    };
    const currentFunction = state.functions[request.entityId];

    if (currentFunction?.meta.requestId !== request.requestId) {
      return { ...state, requests };
    }

    return {
      ...state,
      functions: {
        ...state.functions,
        [request.entityId]: {
          ...currentFunction,
          meta: {
            ...currentFunction.meta,
            status: "cancelled",
            completedAt,
            error: undefined,
          },
        },
      },
      requests,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_ACTION_RUN]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithActionRequestPayload },
  ) => queueAction(state, action.payload),
  [ReduxActionTypes.CELANWORKSMITH_ACTION_RETRY]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithActionRequestPayload },
  ) => queueAction(state, action.payload),
  [ReduxActionTypes.CELANWORKSMITH_ACTION_QUEUED]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithActionRequestPayload },
  ) => queueAction(state, action.payload),
  [ReduxActionTypes.CELANWORKSMITH_ACTION_RUNNING]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithActionRequestPayload },
  ) => {
    const request = state.requests[action.payload.requestId];

    if (!request || request.kind !== "action" || request.status !== "queued") {
      return state;
    }

    const startedAt = Date.now();
    const requests = {
      ...state.requests,
      [request.requestId]: updateRequestStatus(request, "running", {
        startedAt,
        completedAt: undefined,
        error: undefined,
        progress: 50,
      }),
    };

    if (!isCurrentActionRequest(state, action.payload)) {
      return { ...state, requests };
    }

    const currentAction = state.actions[action.payload.actionId];

    return {
      ...state,
      actions: {
        ...state.actions,
        [action.payload.actionId]: {
          ...currentAction,
          meta: {
            ...createActionMeta(action.payload, "running"),
            startedAt,
          },
        },
      },
      requests,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_ACTION_RETRYING]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithActionRequestPayload },
  ) => {
    const request = state.requests[action.payload.requestId];

    if (
      !request ||
      request.kind !== "action" ||
      request.status !== "running" ||
      !isCurrentActionRequest(state, action.payload)
    ) {
      return state;
    }

    return {
      ...state,
      requests: {
        ...state.requests,
        [request.requestId]: {
          ...request,
          retryCount: (request.retryCount || 0) + 1,
        },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_ACTION_SUCCEEDED]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithActionSuccessPayload },
  ) => {
    const { data, requestId } = action.payload;
    const request = state.requests[requestId];

    if (
      !request ||
      request.kind !== "action" ||
      (request.status !== "queued" && request.status !== "running")
    ) {
      return state;
    }

    const completedAt = Date.now();
    const requests = {
      ...state.requests,
      [requestId]: updateRequestStatus(request, "succeeded", {
        completedAt,
        error: undefined,
        progress: 100,
      }),
    };

    if (!isCurrentActionRequest(state, action.payload)) {
      return { ...state, requests };
    }

    return {
      ...state,
      actions: {
        ...state.actions,
        [action.payload.actionId]: {
          data,
          changedObjects: data.changedObjects,
          sideEffects: data.sideEffects,
          objectTypeId: action.payload.request.objectTypeId,
          objectId: action.payload.request.objectId,
          lastSuccessfulRequestId: requestId,
          meta: {
            ...createActionMeta(action.payload, "succeeded"),
            executionId: data.executionId,
            completedAt,
          },
        },
      },
      requests,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_ACTION_FAILED]: (
    state: CelanworksmithExecutionState,
    action: { payload: CelanworksmithActionFailurePayload },
  ) => {
    const { error, requestId } = action.payload;
    const request = state.requests[requestId];

    if (
      !request ||
      request.kind !== "action" ||
      (request.status !== "queued" && request.status !== "running")
    ) {
      return state;
    }

    const completedAt = Date.now();
    const requests = {
      ...state.requests,
      [requestId]: updateRequestStatus(request, "failed", {
        completedAt,
        error,
        progress: 100,
      }),
    };

    if (!isCurrentActionRequest(state, action.payload)) {
      return { ...state, requests };
    }

    const currentAction = state.actions[action.payload.actionId];

    return {
      ...state,
      actions: {
        ...state.actions,
        [action.payload.actionId]: {
          ...currentAction,
          meta: {
            ...createActionMeta(action.payload, "failed"),
            completedAt,
            error,
          },
        },
      },
      requests,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_ACTION_CANCEL]: (
    state: CelanworksmithExecutionState,
    action: { payload: { requestId: string } },
  ) => {
    const request = state.requests[action.payload.requestId];

    if (
      !request ||
      request.kind !== "action" ||
      (request.status !== "queued" && request.status !== "running")
    ) {
      return state;
    }

    const completedAt = Date.now();
    const requests = {
      ...state.requests,
      [request.requestId]: updateRequestStatus(request, "cancelled", {
        completedAt,
        error: undefined,
        progress: 100,
      }),
    };
    const currentAction = state.actions[request.entityId];

    if (currentAction?.meta.requestId !== request.requestId) {
      return { ...state, requests };
    }

    return {
      ...state,
      actions: {
        ...state.actions,
        [request.entityId]: {
          ...currentAction,
          meta: {
            ...currentAction.meta,
            status: "cancelled",
            completedAt,
            error: undefined,
          },
        },
      },
      requests,
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_INPUT_COMMITTED]: (
    state: CelanworksmithExecutionState,
    action: { payload: { path: string; serverValue: unknown } },
  ) => {
    const { path, serverValue } = action.payload;

    return {
      ...state,
      inputs: {
        ...state.inputs,
        [path]: {
          path,
          localValue: serverValue,
          remoteValue: serverValue,
          dirty: false,
          conflict: false,
          updatedAt: Date.now(),
        },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_INPUT_CHANGED]: (
    state: CelanworksmithExecutionState,
    action: { payload: { path: string; localValue: unknown } },
  ) => {
    const { localValue, path } = action.payload;
    const current = state.inputs[path];
    const remoteValue = current?.remoteValue;
    const dirty = !Object.is(localValue, remoteValue);

    return {
      ...state,
      inputs: {
        ...state.inputs,
        [path]: {
          path,
          localValue,
          remoteValue,
          dirty,
          conflict: dirty && current?.conflict === true,
          updatedAt: Date.now(),
        },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_INPUT_REFRESH_OBSERVED]: (
    state: CelanworksmithExecutionState,
    action: { payload: { path: string; remoteValue: unknown } },
  ) => {
    const { path, remoteValue } = action.payload;
    const current = state.inputs[path];
    const fallback: CelanworksmithInputState = {
      path,
      localValue: remoteValue,
      remoteValue,
      dirty: false,
      conflict: false,
      updatedAt: Date.now(),
    };

    return {
      ...state,
      inputs: {
        ...state.inputs,
        [path]: preserveCelanworksmithLocalInput(
          current || fallback,
          remoteValue,
        ),
      },
    };
  },
});

export default celanworksmithExecutionReducer;
