import {
  celanworksmithActionCancel,
  celanworksmithActionFailed,
  celanworksmithActionRun,
  celanworksmithActionRetrying,
  celanworksmithActionRunning,
  celanworksmithActionSucceeded,
  celanworksmithFunctionCancel,
  celanworksmithFunctionRun,
  celanworksmithFunctionRunning,
  celanworksmithFunctionSucceeded,
  celanworksmithFunctionFailed,
  celanworksmithInputChanged,
  celanworksmithInputCommitted,
  celanworksmithInputRefreshObserved,
  getCelanworksmithFunctionCacheKey,
  hashCelanworksmithParameters,
} from "actions/celanworksmithExecutionActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import reducer from "./celanworksmithExecutionReducer";

const functionId = "CalculateDelayDays";
const requestId = "function-request-1";
const parameters = { poId: "PO001" };
const actionId = "UpdateProductionSchedule";
const actionRequest = {
  objectTypeId: "PurchaseOrder",
  objectId: "PO001",
  parameters: { newScheduleDate: "2026-03-15" },
};
const actionResult = {
  success: true,
  message: "Action executed",
  executionId: "execution-1",
  changedObjects: [
    {
      id: "PR001",
      typeId: "ProductionOrder",
      properties: { scheduleDate: "2026-03-15" },
    },
  ],
  sideEffects: [{ type: "NOTIFICATION", recipient: "production-team" }],
};

describe("celanworksmithExecutionReducer", () => {
  it("creates a request ID and transitions a Function through queued and running", () => {
    const run = celanworksmithFunctionRun(functionId, parameters, requestId);
    const queuedState = reducer(undefined, run);
    const runningState = reducer(
      queuedState,
      celanworksmithFunctionRunning(run.payload),
    );

    expect(run.payload).toMatchObject({
      functionId,
      parameters,
      requestId,
      parametersHash: expect.any(String),
    });
    expect(queuedState.functions[functionId]).toMatchObject({
      meta: {
        status: "queued",
        requestId,
        parametersHash: run.payload.parametersHash,
      },
    });
    expect(queuedState.requests[requestId]).toMatchObject({
      kind: "function",
      entityId: functionId,
      status: "queued",
      parametersHash: run.payload.parametersHash,
    });
    expect(runningState.functions[functionId].meta).toMatchObject({
      status: "running",
      requestId,
      startedAt: expect.any(Number),
    });
    expect(runningState.requests[requestId]).toMatchObject({
      status: "running",
      startedAt: expect.any(Number),
    });
  });

  it("stores successful Function data and remembers its request", () => {
    const run = celanworksmithFunctionRun(functionId, parameters, requestId);
    const succeededState = reducer(
      reducer(
        reducer(undefined, run),
        celanworksmithFunctionRunning(run.payload),
      ),
      celanworksmithFunctionSucceeded(run.payload, 3),
    );

    expect(succeededState.functions[functionId]).toMatchObject({
      data: 3,
      lastSuccessfulRequestId: requestId,
      meta: {
        status: "succeeded",
        requestId,
        completedAt: expect.any(Number),
      },
    });
    expect(succeededState.requests[requestId]).toMatchObject({
      status: "succeeded",
      completedAt: expect.any(Number),
    });
  });

  it("preserves previous successful data when a later Function run fails", () => {
    const successfulRun = celanworksmithFunctionRun(
      functionId,
      parameters,
      "function-request-success",
    );
    const failedRun = celanworksmithFunctionRun(
      functionId,
      { poId: "PO002" },
      "function-request-failure",
    );
    const successfulState = reducer(
      reducer(
        reducer(undefined, successfulRun),
        celanworksmithFunctionRunning(successfulRun.payload),
      ),
      celanworksmithFunctionSucceeded(successfulRun.payload, 5),
    );
    const failedState = reducer(
      reducer(
        reducer(successfulState, failedRun),
        celanworksmithFunctionRunning(failedRun.payload),
      ),
      celanworksmithFunctionFailed(failedRun.payload, {
        code: "NETWORK_ERROR",
        message: "The runtime service could not be reached.",
      }),
    );

    expect(failedState.functions[functionId]).toMatchObject({
      data: 5,
      lastSuccessfulRequestId: "function-request-success",
      meta: {
        status: "failed",
        requestId: "function-request-failure",
        error: {
          code: "NETWORK_ERROR",
          message: "The runtime service could not be reached.",
        },
      },
    });
  });

  it("marks a Function request cancelled without changing prior data", () => {
    const successfulRun = celanworksmithFunctionRun(
      functionId,
      parameters,
      "function-request-success",
    );
    const cancelledRun = celanworksmithFunctionRun(
      functionId,
      { poId: "PO003" },
      "function-request-cancelled",
    );
    const successfulState = reducer(
      reducer(
        reducer(undefined, successfulRun),
        celanworksmithFunctionRunning(successfulRun.payload),
      ),
      celanworksmithFunctionSucceeded(successfulRun.payload, 4),
    );
    const cancelledState = reducer(
      reducer(successfulState, cancelledRun),
      celanworksmithFunctionCancel(cancelledRun.payload.requestId),
    );

    expect(cancelledState.functions[functionId]).toMatchObject({
      data: 4,
      lastSuccessfulRequestId: "function-request-success",
      meta: {
        status: "cancelled",
        requestId: "function-request-cancelled",
        completedAt: expect.any(Number),
      },
    });
    expect(
      cancelledState.requests[cancelledRun.payload.requestId],
    ).toMatchObject({
      status: "cancelled",
      completedAt: expect.any(Number),
    });
  });

  it("uses a stable parameter hash and prunes expired Function cache entries", () => {
    const firstParameters = {
      poId: "PO001",
      options: { includeArchived: false, region: "CN" },
    };
    const secondParameters = {
      options: { region: "CN", includeArchived: false },
      poId: "PO001",
    };
    const stateWithExpiredCache = {
      ...reducer(undefined, { type: "@@INIT", payload: undefined }),
      functionCache: {
        expired: { data: 1, expiresAt: Date.now() - 1 },
        fresh: { data: 2, expiresAt: Date.now() + 30_000 },
      },
    };
    const nextState = reducer(
      stateWithExpiredCache,
      celanworksmithFunctionRun(functionId, firstParameters, "request-cache"),
    );

    expect(hashCelanworksmithParameters(firstParameters)).toBe(
      hashCelanworksmithParameters(secondParameters),
    );
    expect(nextState.functionCache).toEqual({
      fresh: { data: 2, expiresAt: expect.any(Number) },
    });
  });

  it("isolates cached Function results by application", () => {
    const appRun = celanworksmithFunctionRun(
      functionId,
      parameters,
      "request-app-a",
      "app-a",
    );
    const state = reducer(undefined, appRun);
    const completed = reducer(
      state,
      celanworksmithFunctionSucceeded(appRun.payload, 7, Date.now() + 30_000),
    );

    expect(completed.functionCache).toHaveProperty(
      getCelanworksmithFunctionCacheKey(
        functionId,
        appRun.payload.parametersHash,
        "app-a",
      ),
    );
    expect(completed.functionCache).not.toHaveProperty(
      getCelanworksmithFunctionCacheKey(
        functionId,
        appRun.payload.parametersHash,
        "app-b",
      ),
    );
  });

  it("clears Function response cache when the runtime cache is cleared", () => {
    const run = celanworksmithFunctionRun(
      functionId,
      parameters,
      "request-cache-clear",
      "app-a",
    );
    const cached = reducer(
      reducer(undefined, run),
      celanworksmithFunctionSucceeded(run.payload, 9, Date.now() + 30_000),
    );
    const cleared = reducer(cached, {
      type: ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED,
      payload: { applicationId: "app-a" },
    });

    expect(cached.functionCache).not.toEqual({});
    expect(cleared.functionCache).toEqual({});
  });

  it("retains Function cache entries for other applications when the runtime cache is cleared", () => {
    const runA = celanworksmithFunctionRun(
      functionId,
      parameters,
      "request-cache-clear-a",
      "app-a",
    );
    const runB = celanworksmithFunctionRun(
      functionId,
      parameters,
      "request-cache-clear-b",
      "app-b",
    );
    let state = reducer(
      reducer(undefined, runA),
      celanworksmithFunctionSucceeded(runA.payload, 9, Date.now() + 30_000),
    );

    state = reducer(
      reducer(state, runB),
      celanworksmithFunctionSucceeded(runB.payload, 9, Date.now() + 30_000),
    );

    const cleared = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED,
      payload: { applicationId: "app-a" },
    });

    expect(cleared.functionCache).not.toHaveProperty(
      getCelanworksmithFunctionCacheKey(
        functionId,
        runA.payload.parametersHash,
        "app-a",
      ),
    );
    expect(cleared.functionCache).toHaveProperty(
      getCelanworksmithFunctionCacheKey(
        functionId,
        runB.payload.parametersHash,
        "app-b",
      ),
    );
  });

  it("does not clear Function cache entries of applications sharing a key prefix", () => {
    const runA = celanworksmithFunctionRun(
      functionId,
      parameters,
      "request-cache-prefix-a",
      "app-a",
    );
    const runAB = celanworksmithFunctionRun(
      functionId,
      parameters,
      "request-cache-prefix-ab",
      "app-ab",
    );
    let state = reducer(
      reducer(undefined, runA),
      celanworksmithFunctionSucceeded(runA.payload, 9, Date.now() + 30_000),
    );

    state = reducer(
      reducer(state, runAB),
      celanworksmithFunctionSucceeded(runAB.payload, 9, Date.now() + 30_000),
    );

    const cleared = reducer(state, {
      type: ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED,
      payload: { applicationId: "app-a" },
    });

    expect(cleared.functionCache).not.toHaveProperty(
      getCelanworksmithFunctionCacheKey(
        functionId,
        runA.payload.parametersHash,
        "app-a",
      ),
    );
    expect(cleared.functionCache).toHaveProperty(
      getCelanworksmithFunctionCacheKey(
        functionId,
        runAB.payload.parametersHash,
        "app-ab",
      ),
    );
  });

  it("does not cache a stale concurrent Function response", () => {
    const firstRun = celanworksmithFunctionRun(
      functionId,
      { poId: "PO001" },
      "request-first",
    );
    const secondRun = celanworksmithFunctionRun(
      functionId,
      { poId: "PO002" },
      "request-second",
    );
    const stateWithCurrentSecondRequest = reducer(
      reducer(
        reducer(undefined, firstRun),
        celanworksmithFunctionRunning(firstRun.payload),
      ),
      secondRun,
    );
    const stateAfterStaleSuccess = reducer(
      stateWithCurrentSecondRequest,
      celanworksmithFunctionSucceeded(firstRun.payload, 3, Date.now() + 30_000),
    );

    expect(stateAfterStaleSuccess.functions[functionId].meta).toMatchObject({
      status: "queued",
      requestId: "request-second",
    });
    expect(stateAfterStaleSuccess.requests["request-first"]).toMatchObject({
      status: "succeeded",
    });
    expect(stateAfterStaleSuccess.functionCache).not.toHaveProperty(
      getCelanworksmithFunctionCacheKey(
        functionId,
        firstRun.payload.parametersHash,
      ),
    );
  });

  it("ignores cancellation after a Function request reaches a terminal state", () => {
    const successfulRun = celanworksmithFunctionRun(
      functionId,
      parameters,
      "request-successful",
    );
    const failedRun = celanworksmithFunctionRun(
      functionId,
      parameters,
      "request-failed",
    );
    const cancelledRun = celanworksmithFunctionRun(
      functionId,
      parameters,
      "request-cancelled",
    );
    const successfulState = reducer(
      reducer(undefined, successfulRun),
      celanworksmithFunctionSucceeded(successfulRun.payload, 3),
    );
    const failedState = reducer(
      reducer(undefined, failedRun),
      celanworksmithFunctionFailed(failedRun.payload, {
        code: "NETWORK_ERROR",
        message: "The runtime service could not be reached.",
      }),
    );
    const cancelledState = reducer(
      reducer(undefined, cancelledRun),
      celanworksmithFunctionCancel(cancelledRun.payload.requestId),
    );

    expect(
      reducer(
        successfulState,
        celanworksmithFunctionCancel("request-successful"),
      ),
    ).toBe(successfulState);
    expect(
      reducer(failedState, celanworksmithFunctionCancel("request-failed")),
    ).toBe(failedState);
    expect(
      reducer(
        cancelledState,
        celanworksmithFunctionCancel("request-cancelled"),
      ),
    ).toBe(cancelledState);
  });

  it("stores the complete successful Action result and execution metadata", () => {
    const run = celanworksmithActionRun(
      actionId,
      actionRequest,
      "action-request-success",
    );
    const succeededState = reducer(
      reducer(
        reducer(undefined, run),
        celanworksmithActionRunning(run.payload),
      ),
      celanworksmithActionSucceeded(run.payload, actionResult),
    );

    expect(succeededState.actions[actionId]).toMatchObject({
      data: actionResult,
      changedObjects: actionResult.changedObjects,
      sideEffects: actionResult.sideEffects,
      meta: {
        status: "succeeded",
        requestId: "action-request-success",
        executionId: "execution-1",
        completedAt: expect.any(Number),
      },
    });
    expect(succeededState.requests["action-request-success"]).toMatchObject({
      kind: "action",
      entityId: actionId,
      status: "succeeded",
    });
  });

  it("tracks Action execution progress through the shared metadata", () => {
    const run = celanworksmithActionRun(
      actionId,
      actionRequest,
      "action-request-progress",
    );
    const queuedState = reducer(undefined, run);
    const runningState = reducer(
      queuedState,
      celanworksmithActionRunning(run.payload),
    );
    const succeededState = reducer(
      runningState,
      celanworksmithActionSucceeded(run.payload, actionResult),
    );

    expect(queuedState.actions[actionId].meta).toMatchObject({
      status: "queued",
      progress: 0,
      requestId: "action-request-progress",
    });
    expect(runningState.actions[actionId].meta).toMatchObject({
      status: "running",
      progress: 50,
      requestId: "action-request-progress",
    });
    expect(succeededState.actions[actionId].meta).toMatchObject({
      status: "succeeded",
      progress: 100,
      requestId: "action-request-progress",
      executionId: "execution-1",
    });
  });

  it("keeps the last successful Action result after a business rejection", () => {
    const successfulRun = celanworksmithActionRun(
      actionId,
      actionRequest,
      "action-request-successful-business",
    );
    const rejectedRun = celanworksmithActionRun(
      actionId,
      actionRequest,
      "action-request-rejected-business",
    );
    const successfulState = reducer(
      reducer(
        reducer(undefined, successfulRun),
        celanworksmithActionRunning(successfulRun.payload),
      ),
      celanworksmithActionSucceeded(successfulRun.payload, actionResult),
    );
    const rejectedState = reducer(
      reducer(successfulState, rejectedRun),
      celanworksmithActionFailed(rejectedRun.payload, {
        code: "BUSINESS_REJECTED",
        message: "The schedule is locked.",
      }),
    );

    expect(rejectedState.actions[actionId]).toMatchObject({
      data: actionResult,
      lastSuccessfulRequestId: "action-request-successful-business",
      meta: {
        status: "failed",
        progress: 100,
        requestId: "action-request-rejected-business",
        error: {
          code: "BUSINESS_REJECTED",
          message: "The schedule is locked.",
        },
      },
    });
  });

  it("records a duplicate Action request without replacing the running Action", () => {
    const firstRun = celanworksmithActionRun(
      actionId,
      actionRequest,
      "action-request-running",
    );
    const duplicateRun = celanworksmithActionRun(
      actionId,
      { ...actionRequest, objectId: "PO002" },
      "action-request-duplicate",
    );
    const runningState = reducer(
      reducer(undefined, firstRun),
      celanworksmithActionRunning(firstRun.payload),
    );
    const duplicateState = reducer(runningState, duplicateRun);

    expect(duplicateState.actions[actionId].meta).toMatchObject({
      status: "running",
      requestId: "action-request-running",
    });
    expect(duplicateState.requests["action-request-duplicate"]).toMatchObject({
      kind: "action",
      entityId: actionId,
      status: "failed",
      error: { code: "DUPLICATE_REQUEST" },
    });
  });

  it("increments retry count without leaving an Action request running", () => {
    const run = celanworksmithActionRun(
      actionId,
      actionRequest,
      "action-request-retrying",
    );
    const runningState = reducer(
      reducer(undefined, run),
      celanworksmithActionRunning(run.payload),
    );
    const retryingState = reducer(
      runningState,
      celanworksmithActionRetrying(run.payload),
    );

    expect(retryingState.actions[actionId].meta).toMatchObject({
      status: "running",
      requestId: "action-request-retrying",
    });
    expect(retryingState.requests["action-request-retrying"]).toMatchObject({
      status: "running",
      retryCount: 1,
    });
  });

  it("cancels only a non-terminal Action request without removing its prior result", () => {
    const successfulRun = celanworksmithActionRun(
      actionId,
      actionRequest,
      "action-request-prior-success",
    );
    const cancelledRun = celanworksmithActionRun(
      actionId,
      { ...actionRequest, objectId: "PO002" },
      "action-request-cancelled",
    );
    const successfulState = reducer(
      reducer(
        reducer(undefined, successfulRun),
        celanworksmithActionRunning(successfulRun.payload),
      ),
      celanworksmithActionSucceeded(successfulRun.payload, actionResult),
    );
    const cancelledState = reducer(
      reducer(successfulState, cancelledRun),
      celanworksmithActionCancel(cancelledRun.payload.requestId),
    );

    expect(cancelledState.actions[actionId]).toMatchObject({
      data: actionResult,
      changedObjects: actionResult.changedObjects,
      sideEffects: actionResult.sideEffects,
      meta: {
        status: "cancelled",
        requestId: "action-request-cancelled",
      },
    });
    expect(
      reducer(
        cancelledState,
        celanworksmithActionCancel(cancelledRun.payload.requestId),
      ),
    ).toBe(cancelledState);
  });

  it("records the target object identity for Action execution state", () => {
    const run = celanworksmithActionRun(
      actionId,
      actionRequest,
      "action-request-object-identity",
    );
    const state = reducer(undefined, run);

    expect(state.actions[actionId]).toMatchObject({
      objectTypeId: "PurchaseOrder",
      objectId: "PO001",
      meta: {
        parametersHash: run.payload.parametersHash,
      },
    });
  });

  it("ignores cancellation after an Action request reaches a terminal state", () => {
    const successfulRun = celanworksmithActionRun(
      actionId,
      actionRequest,
      "action-request-successful",
    );
    const failedRun = celanworksmithActionRun(
      actionId,
      actionRequest,
      "action-request-failed",
    );
    const successfulState = reducer(
      reducer(
        reducer(undefined, successfulRun),
        celanworksmithActionRunning(successfulRun.payload),
      ),
      celanworksmithActionSucceeded(successfulRun.payload, actionResult),
    );
    const failedState = reducer(
      reducer(undefined, failedRun),
      celanworksmithActionFailed(failedRun.payload, {
        code: "NETWORK_ERROR",
        message: "The runtime service could not be reached.",
      }),
    );

    expect(
      reducer(
        successfulState,
        celanworksmithActionCancel(successfulRun.payload.requestId),
      ),
    ).toBe(successfulState);
    expect(
      reducer(
        failedState,
        celanworksmithActionCancel(failedRun.payload.requestId),
      ),
    ).toBe(failedState);
  });

  it("persists a Function retry count while keeping the request running", () => {
    const run = celanworksmithFunctionRun(
      functionId,
      parameters,
      "function-retry-count",
    );
    const runningState = reducer(
      reducer(undefined, run),
      celanworksmithFunctionRunning(run.payload),
    );
    const retriedState = reducer(
      runningState,
      celanworksmithFunctionRunning(run.payload),
    );

    expect(retriedState.requests[run.payload.requestId]).toMatchObject({
      status: "running",
      retryCount: 1,
    });
  });

  it("adopts a committed server value and clears input state", () => {
    const state = reducer(
      undefined,
      celanworksmithInputCommitted("Input1", "saved"),
    );

    expect(state.inputs.Input1).toMatchObject({
      path: "Input1",
      localValue: "saved",
      remoteValue: "saved",
      dirty: false,
      conflict: false,
    });
  });

  it("preserves dirty local input and marks a changed remote value as conflict", () => {
    const dirtyState = reducer(
      reducer(undefined, celanworksmithInputCommitted("Input1", "remote")),
      celanworksmithInputChanged("Input1", "local"),
    );

    const state = reducer(
      dirtyState,
      celanworksmithInputRefreshObserved("Input1", "other remote"),
    );

    expect(state.inputs.Input1).toMatchObject({
      localValue: "local",
      remoteValue: "other remote",
      dirty: true,
      conflict: true,
    });
  });

  it("keeps local input unchanged when a failed submission is reduced", () => {
    const dirtyState = reducer(
      reducer(undefined, celanworksmithInputCommitted("Input1", "remote")),
      celanworksmithInputChanged("Input1", "local"),
    );
    const state = reducer(
      dirtyState,
      celanworksmithFunctionFailed(
        celanworksmithFunctionRun(functionId, parameters, "failed-input")
          .payload,
        { code: "BUSINESS_ERROR", message: "Rejected" },
      ),
    );

    expect(state.inputs.Input1).toMatchObject({
      localValue: "local",
      remoteValue: "remote",
      dirty: true,
    });
  });
});
