import CelanworksmithAPI, {
  normalizeCelanworksmithError,
  type CelanworksmithAction,
  type CelanworksmithActionResult,
  type CelanworksmithExecutionError,
  type CelanworksmithFunction,
} from "api/CelanworksmithAPI";
import type { ApiResponse } from "api/ApiResponses";
import {
  celanworksmithActionFailed,
  celanworksmithActionQueued,
  celanworksmithActionRetrying,
  celanworksmithActionRunning,
  celanworksmithActionSucceeded,
  celanworksmithFunctionFailed,
  celanworksmithFunctionQueued,
  celanworksmithFunctionRunning,
  celanworksmithFunctionSucceeded,
  getCelanworksmithFunctionCacheKey,
  type CelanworksmithActionRequestPayload,
  type CelanworksmithActionRetryAction,
  type CelanworksmithActionRunAction,
  type CelanworksmithFunctionRequestPayload,
  type CelanworksmithFunctionRetryAction,
  type CelanworksmithFunctionRunAction,
} from "actions/celanworksmithExecutionActions";
import {
  celanworksmithObjectTypesRefreshRequested,
  getChangedObjectTypeIds,
} from "actions/celanworksmithObjectActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type { CelanworksmithExecutionState } from "reducers/celanworksmithExecutionReducer";
import {
  getCelanworksmithExecutionState,
  getCelanworksmithOntologyState,
} from "selectors/celanworksmithSelectors";
import {
  all,
  call,
  delay,
  put,
  race,
  select,
  take,
  takeEvery,
} from "redux-saga/effects";

export const CELANWORKSMITH_FUNCTION_TIMEOUT_MS = 10_000;
export const CELANWORKSMITH_ACTION_TIMEOUT_MS =
  CELANWORKSMITH_FUNCTION_TIMEOUT_MS;
export const CELANWORKSMITH_FUNCTION_CACHE_TTL_MS = 30_000;
const CELANWORKSMITH_FUNCTION_MAX_ATTEMPTS = 2;
const CELANWORKSMITH_ACTION_MAX_ATTEMPTS = 2;

type CelanworksmithFunctionExecutionAction =
  | CelanworksmithFunctionRunAction
  | CelanworksmithFunctionRetryAction;

type CelanworksmithActionExecutionAction =
  | CelanworksmithActionRunAction
  | CelanworksmithActionRetryAction;

interface ValidatedCelanworksmithActionRun {
  action: CelanworksmithAction;
  request: CelanworksmithActionRequestPayload["request"];
}

const assertApiSuccess = <T>(response: ApiResponse<T>): T => {
  if (!response?.responseMeta?.success) throw response;

  return response.data;
};

const invalidArgument = (message: string): CelanworksmithExecutionError => ({
  code: "INVALID_ARGUMENT",
  message,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && !!value.trim();

const validateParameterType = (value: unknown, dataType: string) => {
  switch (dataType) {
    case "INTEGER":
      return typeof value === "number" && Number.isInteger(value);
    case "DECIMAL":
      return typeof value === "number" && Number.isFinite(value);
    case "BOOLEAN":
      return typeof value === "boolean";
    case "STRING":
    case "ENUM":
    case "REFERENCE":
    case "DATETIME":
      return typeof value === "string";
    default:
      return true;
  }
};

const validateFunctionRun = (
  functionId: string,
  parameters: Record<string, unknown>,
  functions: CelanworksmithFunction[],
): CelanworksmithFunction | CelanworksmithExecutionError => {
  const functionMetadata = functions.find(
    (candidate) => candidate.id === functionId,
  );

  if (!functionMetadata) {
    return {
      code: "UNKNOWN_FUNCTION",
      message: "The requested function is not available.",
    };
  }

  for (const parameter of functionMetadata.parameters) {
    const value = parameters[parameter.id];
    const isMissing = value === undefined || value === null || value === "";

    if (parameter.required && isMissing) {
      return invalidArgument(`${parameter.displayName} is required.`);
    }

    if (!isMissing && !validateParameterType(value, parameter.dataType)) {
      return invalidArgument(
        `${parameter.displayName} must be a ${parameter.dataType} value.`,
      );
    }
  }

  return functionMetadata;
};

const validateActionRun = (
  actionId: string,
  request: unknown,
  actions: CelanworksmithAction[],
): ValidatedCelanworksmithActionRun | CelanworksmithExecutionError => {
  const actionMetadata = actions.find((candidate) => candidate.id === actionId);

  if (!actionMetadata) {
    return {
      code: "UNKNOWN_ACTION",
      message: "The requested action is not available.",
    };
  }

  if (!isRecord(request)) {
    return invalidArgument("The Action request must be an object.");
  }

  const { objectId, objectTypeId } = request;
  const parameters = request.parameters === undefined ? {} : request.parameters;

  if (!isNonEmptyString(objectTypeId) || !isNonEmptyString(objectId)) {
    return invalidArgument("objectTypeId and objectId are required.");
  }

  if (objectTypeId !== actionMetadata.objectTypeId) {
    return invalidArgument(
      `${actionMetadata.displayName} requires a ${actionMetadata.objectTypeId} object.`,
    );
  }

  if (!isRecord(parameters)) {
    return invalidArgument("Action parameters must be an object.");
  }

  for (const parameter of actionMetadata.parameters) {
    const value = parameters[parameter.id];
    const isMissing = value === undefined || value === null || value === "";

    if (parameter.required && isMissing) {
      return invalidArgument(`${parameter.displayName} is required.`);
    }

    if (!isMissing && !validateParameterType(value, parameter.dataType)) {
      return invalidArgument(
        `${parameter.displayName} must be a ${parameter.dataType} value.`,
      );
    }
  }

  return {
    action: actionMetadata,
    request: { objectTypeId, objectId, parameters },
  };
};

const isExecutionError = (
  value:
    | CelanworksmithAction
    | CelanworksmithFunction
    | ValidatedCelanworksmithActionRun
    | CelanworksmithExecutionError,
): value is CelanworksmithExecutionError => "code" in value;

const isTransientError = (error: CelanworksmithExecutionError) =>
  error.code === "NETWORK_ERROR" ||
  error.code === "PROVIDER_UNAVAILABLE" ||
  error.code === "TIMEOUT";

const isFunctionCancellation = (
  action: { type?: string; payload?: { requestId?: string } },
  requestId: string,
) =>
  action.type === ReduxActionTypes.CELANWORKSMITH_FUNCTION_CANCEL &&
  action.payload?.requestId === requestId;

const isActionCancellation = (
  action: { type?: string; payload?: { requestId?: string } },
  requestId: string,
) =>
  action.type === ReduxActionTypes.CELANWORKSMITH_ACTION_CANCEL &&
  action.payload?.requestId === requestId;

const isRequestCancelled = (
  executionState: CelanworksmithExecutionState,
  requestId: string,
) => executionState.requests[requestId]?.status === "cancelled";

const completeFunctionFailure = function* (
  payload: CelanworksmithFunctionRequestPayload,
  error: CelanworksmithExecutionError,
) {
  yield put(celanworksmithFunctionFailed(payload, error));
  yield put({ type: ReduxActionTypes.TRIGGER_EVAL });
};

const completeActionFailure = function* (
  payload: CelanworksmithActionRequestPayload,
  error: CelanworksmithExecutionError,
) {
  yield put(celanworksmithActionFailed(payload, error));
  yield put({ type: ReduxActionTypes.TRIGGER_EVAL });
};

const isActionResult = (
  value: unknown,
): value is CelanworksmithActionResult => {
  if (!isRecord(value)) return false;

  return (
    typeof value.success === "boolean" &&
    isNonEmptyString(value.message) &&
    isNonEmptyString(value.executionId) &&
    Array.isArray(value.changedObjects) &&
    value.changedObjects.every(
      (changedObject) =>
        isRecord(changedObject) &&
        isNonEmptyString(changedObject.id) &&
        isNonEmptyString(changedObject.typeId) &&
        isRecord(changedObject.properties),
    ) &&
    Array.isArray(value.sideEffects) &&
    value.sideEffects.every(isRecord)
  );
};

const isMatchingObjectTypesRefreshComplete = (
  action: {
    type?: string;
    payload?: unknown;
    meta?: { correlationId?: string };
  },
  typeIds: string[],
  correlationId: string,
) =>
  action.type ===
    ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPES_REFRESH_COMPLETE &&
  action.meta?.correlationId === correlationId &&
  Array.isArray(action.payload) &&
  action.payload.length === typeIds.length &&
  action.payload.every((typeId) => typeIds.includes(typeId));

export function* executeCelanworksmithFunction(
  action: CelanworksmithFunctionExecutionAction,
) {
  const payload = action.payload;
  const ontologyState = yield select(getCelanworksmithOntologyState);
  const validationResult = validateFunctionRun(
    payload.functionId,
    payload.parameters,
    ontologyState.functions,
  );

  if (isExecutionError(validationResult)) {
    yield* completeFunctionFailure(payload, validationResult);

    return;
  }

  let executionState: CelanworksmithExecutionState = yield select(
    getCelanworksmithExecutionState,
  );

  if (isRequestCancelled(executionState, payload.requestId)) {
    yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

    return;
  }

  yield put(celanworksmithFunctionQueued(payload));

  executionState = yield select(getCelanworksmithExecutionState);
  const cacheKey = getCelanworksmithFunctionCacheKey(
    payload.functionId,
    payload.parametersHash,
  );
  const cacheEntry = executionState.functionCache[cacheKey];

  if (validationResult.sideEffectFree && cacheEntry?.expiresAt > Date.now()) {
    yield put(celanworksmithFunctionSucceeded(payload, cacheEntry.data));
    yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

    return;
  }

  yield put(celanworksmithFunctionRunning(payload));

  for (
    let attempt = 1;
    attempt <= CELANWORKSMITH_FUNCTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const abortController = new AbortController();

    try {
      const outcome: {
        response?: ApiResponse<unknown>;
        timeout?: true;
        cancellation?: { type: string; payload?: { requestId?: string } };
      } = yield race({
        response: call(
          [CelanworksmithAPI, CelanworksmithAPI.callFunction],
          payload.functionId,
          payload.parameters,
          abortController.signal,
        ),
        timeout: delay(CELANWORKSMITH_FUNCTION_TIMEOUT_MS),
        cancellation: take((cancelAction) =>
          isFunctionCancellation(cancelAction, payload.requestId),
        ),
      });

      if (outcome.cancellation) {
        abortController.abort();
        yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

        return;
      }

      if (outcome.timeout) {
        abortController.abort();

        if (attempt < CELANWORKSMITH_FUNCTION_MAX_ATTEMPTS) {
          yield put(celanworksmithFunctionRunning(payload));
          executionState = yield select(getCelanworksmithExecutionState);

          if (isRequestCancelled(executionState, payload.requestId)) {
            yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

            return;
          }

          continue;
        }

        yield* completeFunctionFailure(payload, {
          code: "TIMEOUT",
          message: "The runtime request timed out.",
        });

        return;
      }

      const data = assertApiSuccess(outcome.response as ApiResponse<unknown>);
      const cacheExpiresAt = validationResult.sideEffectFree
        ? Date.now() + CELANWORKSMITH_FUNCTION_CACHE_TTL_MS
        : undefined;

      yield put(celanworksmithFunctionSucceeded(payload, data, cacheExpiresAt));
      yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

      return;
    } catch (error) {
      const normalizedError = normalizeCelanworksmithError(error);

      if (
        attempt < CELANWORKSMITH_FUNCTION_MAX_ATTEMPTS &&
        isTransientError(normalizedError)
      ) {
        yield put(celanworksmithFunctionRunning(payload));
        executionState = yield select(getCelanworksmithExecutionState);

        if (isRequestCancelled(executionState, payload.requestId)) {
          yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

          return;
        }

        continue;
      }

      yield* completeFunctionFailure(payload, normalizedError);

      return;
    }
  }
}

export function* executeCelanworksmithAction(
  action: CelanworksmithActionExecutionAction,
) {
  const payload = action.payload;
  let executionState: CelanworksmithExecutionState = yield select(
    getCelanworksmithExecutionState,
  );

  if (executionState.requests[payload.requestId]?.status !== "queued") {
    yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

    return;
  }

  const ontologyState = yield select(getCelanworksmithOntologyState);
  const validationResult = validateActionRun(
    payload.actionId,
    payload.request,
    ontologyState.actions,
  );

  if (isExecutionError(validationResult)) {
    yield* completeActionFailure(payload, validationResult);

    return;
  }

  yield put(celanworksmithActionQueued(payload));

  executionState = yield select(getCelanworksmithExecutionState);

  if (isRequestCancelled(executionState, payload.requestId)) {
    yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

    return;
  }

  yield put(celanworksmithActionRunning(payload));

  for (
    let attempt = 1;
    attempt <= CELANWORKSMITH_ACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const abortController = new AbortController();

    try {
      const outcome: {
        response?: ApiResponse<CelanworksmithActionResult>;
        timeout?: true;
        cancellation?: { type: string; payload?: { requestId?: string } };
      } = yield race({
        response: call(
          [CelanworksmithAPI, CelanworksmithAPI.executeAction],
          payload.actionId,
          validationResult.request,
          abortController.signal,
          payload.applicationId,
        ),
        timeout: delay(CELANWORKSMITH_ACTION_TIMEOUT_MS),
        cancellation: take((cancelAction) =>
          isActionCancellation(cancelAction, payload.requestId),
        ),
      });

      if (outcome.cancellation) {
        abortController.abort();
        yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

        return;
      }

      if (outcome.timeout) {
        abortController.abort();

        if (attempt < CELANWORKSMITH_ACTION_MAX_ATTEMPTS) {
          yield put(celanworksmithActionRetrying(payload));
          executionState = yield select(getCelanworksmithExecutionState);

          if (isRequestCancelled(executionState, payload.requestId)) {
            yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

            return;
          }

          continue;
        }

        yield* completeActionFailure(payload, {
          code: "TIMEOUT",
          message: "The runtime request timed out.",
        });

        return;
      }

      const data = assertApiSuccess(
        outcome.response as ApiResponse<CelanworksmithActionResult>,
      );

      if (!isActionResult(data)) {
        yield* completeActionFailure(payload, {
          code: "BACKEND_ERROR",
          message: "The runtime returned an invalid action result.",
        });

        return;
      }

      yield put(celanworksmithActionSucceeded(payload, data));
      const changedObjectTypeIds = getChangedObjectTypeIds(data.changedObjects);

      if (changedObjectTypeIds.length) {
        yield put(
          celanworksmithObjectTypesRefreshRequested(
            changedObjectTypeIds,
            payload.requestId,
          ),
        );
        yield take((refreshAction) =>
          isMatchingObjectTypesRefreshComplete(
            refreshAction,
            changedObjectTypeIds,
            payload.requestId,
          ),
        );
      }

      yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

      return;
    } catch (error) {
      abortController.abort();
      const normalizedError = normalizeCelanworksmithError(error);

      if (
        attempt < CELANWORKSMITH_ACTION_MAX_ATTEMPTS &&
        isTransientError(normalizedError)
      ) {
        yield put(celanworksmithActionRetrying(payload));
        executionState = yield select(getCelanworksmithExecutionState);

        if (isRequestCancelled(executionState, payload.requestId)) {
          yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

          return;
        }

        continue;
      }

      yield* completeActionFailure(payload, normalizedError);

      return;
    }
  }
}

export default function* celanworksmithExecutionSaga() {
  yield all([
    takeEvery(
      [
        ReduxActionTypes.CELANWORKSMITH_FUNCTION_RUN,
        ReduxActionTypes.CELANWORKSMITH_FUNCTION_RETRY,
      ],
      executeCelanworksmithFunction,
    ),
    takeEvery(
      [
        ReduxActionTypes.CELANWORKSMITH_ACTION_RUN,
        ReduxActionTypes.CELANWORKSMITH_ACTION_RETRY,
      ],
      executeCelanworksmithAction,
    ),
  ]);
}
