import type {
  CelanworksmithActionExecutionRequest,
  CelanworksmithActionResult,
  CelanworksmithExecutionError,
  CelanworksmithExecutionMeta,
} from "api/CelanworksmithAPI";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";

export interface CelanworksmithFunctionRequestPayload {
  functionId: string;
  parameters: Record<string, unknown>;
  requestId: string;
  parametersHash: string;
}

interface CelanworksmithFunctionSuccessPayload
  extends CelanworksmithFunctionRequestPayload {
  data: unknown;
  cacheExpiresAt?: number;
}

interface CelanworksmithFunctionFailurePayload
  extends CelanworksmithFunctionRequestPayload {
  error: CelanworksmithExecutionError;
}

export interface CelanworksmithActionRequestPayload {
  actionId: string;
  request: CelanworksmithActionExecutionRequest;
  requestId: string;
  parametersHash: string;
}

interface CelanworksmithActionSuccessPayload
  extends CelanworksmithActionRequestPayload {
  data: CelanworksmithActionResult;
}

interface CelanworksmithActionFailurePayload
  extends CelanworksmithActionRequestPayload {
  error: CelanworksmithExecutionError;
}

let requestSequence = 0;

const stableValue = (value: unknown): unknown => {
  if (value instanceof Date) return value.toJSON();

  if (Array.isArray(value)) return value.map(stableValue);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, stableValue(nestedValue)]),
    );
  }

  return value;
};

const hashString = (value: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const hashCelanworksmithParameters = (
  parameters: Record<string, unknown>,
) => hashString(JSON.stringify(stableValue(parameters)) || "{}");

export const getCelanworksmithFunctionCacheKey = (
  functionId: string,
  parametersHash: string,
) => `${functionId}:${parametersHash}`;

export const createCelanworksmithRequestId = () => {
  requestSequence += 1;
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) return `celanworksmith-${randomUuid}`;

  return `celanworksmith-${Date.now().toString(36)}-${requestSequence.toString(
    36,
  )}-${Math.random().toString(36).slice(2)}`;
};

const createFunctionRequestPayload = (
  functionId: string,
  parameters: Record<string, unknown>,
  requestId?: string,
): CelanworksmithFunctionRequestPayload => ({
  functionId,
  parameters,
  requestId: requestId || createCelanworksmithRequestId(),
  parametersHash: hashCelanworksmithParameters(parameters),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const getActionParametersForHash = (request: unknown) => {
  if (!isRecord(request) || !isRecord(request.parameters)) return {};

  return request.parameters;
};

const createActionRequestPayload = (
  actionId: string,
  request: unknown,
  requestId?: string,
): CelanworksmithActionRequestPayload => ({
  actionId,
  request: request as CelanworksmithActionExecutionRequest,
  requestId: requestId || createCelanworksmithRequestId(),
  parametersHash: hashCelanworksmithParameters(
    getActionParametersForHash(request),
  ),
});

export const celanworksmithFunctionRun = (
  functionId: string,
  parameters: Record<string, unknown>,
  requestId?: string,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_FUNCTION_RUN,
  payload: createFunctionRequestPayload(functionId, parameters, requestId),
});

export const celanworksmithFunctionRetry = (
  functionId: string,
  parameters: Record<string, unknown>,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_FUNCTION_RETRY,
  payload: createFunctionRequestPayload(functionId, parameters),
});

export const celanworksmithFunctionCancel = (requestId: string) => ({
  type: ReduxActionTypes.CELANWORKSMITH_FUNCTION_CANCEL,
  payload: { requestId },
});

export const celanworksmithFunctionQueued = (
  payload: CelanworksmithFunctionRequestPayload,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_FUNCTION_QUEUED,
  payload,
});

export const celanworksmithFunctionRunning = (
  payload: CelanworksmithFunctionRequestPayload,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_FUNCTION_RUNNING,
  payload,
});

export const celanworksmithFunctionSucceeded = (
  payload: CelanworksmithFunctionRequestPayload,
  data: unknown,
  cacheExpiresAt?: number,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_FUNCTION_SUCCEEDED,
  payload: { ...payload, data, cacheExpiresAt },
});

export const celanworksmithFunctionFailed = (
  payload: CelanworksmithFunctionRequestPayload,
  error: CelanworksmithExecutionError,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_FUNCTION_FAILED,
  payload: { ...payload, error },
});

export const celanworksmithActionRun = (
  actionId: string,
  request: CelanworksmithActionExecutionRequest,
  requestId?: string,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_ACTION_RUN,
  payload: createActionRequestPayload(actionId, request, requestId),
});

export const celanworksmithActionRetry = (
  actionId: string,
  request: CelanworksmithActionExecutionRequest,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_ACTION_RETRY,
  payload: createActionRequestPayload(actionId, request),
});

export const celanworksmithActionCancel = (requestId: string) => ({
  type: ReduxActionTypes.CELANWORKSMITH_ACTION_CANCEL,
  payload: { requestId },
});

export const celanworksmithInputCommitted = (
  path: string,
  serverValue: unknown,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_INPUT_COMMITTED,
  payload: { path, serverValue },
});

export const celanworksmithInputChanged = (
  path: string,
  localValue: unknown,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_INPUT_CHANGED,
  payload: { path, localValue },
});

export const celanworksmithInputRefreshObserved = (
  path: string,
  remoteValue: unknown,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_INPUT_REFRESH_OBSERVED,
  payload: { path, remoteValue },
});

export const celanworksmithActionQueued = (
  payload: CelanworksmithActionRequestPayload,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_ACTION_QUEUED,
  payload,
});

export const celanworksmithActionRunning = (
  payload: CelanworksmithActionRequestPayload,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_ACTION_RUNNING,
  payload,
});

export const celanworksmithActionRetrying = (
  payload: CelanworksmithActionRequestPayload,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_ACTION_RETRYING,
  payload,
});

export const celanworksmithActionSucceeded = (
  payload: CelanworksmithActionRequestPayload,
  data: CelanworksmithActionResult,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_ACTION_SUCCEEDED,
  payload: { ...payload, data },
});

export const celanworksmithActionFailed = (
  payload: CelanworksmithActionRequestPayload,
  error: CelanworksmithExecutionError,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_ACTION_FAILED,
  payload: { ...payload, error },
});

export type CelanworksmithFunctionRunAction = ReturnType<
  typeof celanworksmithFunctionRun
>;
export type CelanworksmithFunctionRetryAction = ReturnType<
  typeof celanworksmithFunctionRetry
>;
export type CelanworksmithFunctionCancelAction = ReturnType<
  typeof celanworksmithFunctionCancel
>;
export type CelanworksmithFunctionQueuedAction = ReturnType<
  typeof celanworksmithFunctionQueued
>;
export type CelanworksmithFunctionRunningAction = ReturnType<
  typeof celanworksmithFunctionRunning
>;
export type CelanworksmithFunctionSucceededAction = ReturnType<
  typeof celanworksmithFunctionSucceeded
>;
export type CelanworksmithFunctionFailedAction = ReturnType<
  typeof celanworksmithFunctionFailed
>;
export type CelanworksmithActionRunAction = ReturnType<
  typeof celanworksmithActionRun
>;
export type CelanworksmithActionRetryAction = ReturnType<
  typeof celanworksmithActionRetry
>;
export type CelanworksmithActionCancelAction = ReturnType<
  typeof celanworksmithActionCancel
>;
export type CelanworksmithActionQueuedAction = ReturnType<
  typeof celanworksmithActionQueued
>;
export type CelanworksmithActionRunningAction = ReturnType<
  typeof celanworksmithActionRunning
>;
export type CelanworksmithActionRetryingAction = ReturnType<
  typeof celanworksmithActionRetrying
>;
export type CelanworksmithActionSucceededAction = ReturnType<
  typeof celanworksmithActionSucceeded
>;
export type CelanworksmithActionFailedAction = ReturnType<
  typeof celanworksmithActionFailed
>;

export type CelanworksmithFunctionExecutionAction =
  | CelanworksmithFunctionRunAction
  | CelanworksmithFunctionRetryAction
  | CelanworksmithFunctionCancelAction
  | CelanworksmithFunctionQueuedAction
  | CelanworksmithFunctionRunningAction
  | CelanworksmithFunctionSucceededAction
  | CelanworksmithFunctionFailedAction;

export type CelanworksmithActionExecutionAction =
  | CelanworksmithActionRunAction
  | CelanworksmithActionRetryAction
  | CelanworksmithActionCancelAction
  | CelanworksmithActionQueuedAction
  | CelanworksmithActionRunningAction
  | CelanworksmithActionRetryingAction
  | CelanworksmithActionSucceededAction
  | CelanworksmithActionFailedAction;

export type {
  CelanworksmithActionFailurePayload,
  CelanworksmithActionSuccessPayload,
  CelanworksmithFunctionFailurePayload,
  CelanworksmithFunctionSuccessPayload,
  CelanworksmithExecutionMeta,
};
