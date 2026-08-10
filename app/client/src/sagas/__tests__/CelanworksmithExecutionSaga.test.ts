import CelanworksmithAPI, {
  type CelanworksmithAction,
  type CelanworksmithFunction,
} from "api/CelanworksmithAPI";
import {
  celanworksmithActionCancel,
  celanworksmithActionRetry,
  celanworksmithActionRun,
  celanworksmithFunctionCancel,
  celanworksmithFunctionRun,
  getCelanworksmithFunctionCacheKey,
  hashCelanworksmithParameters,
} from "actions/celanworksmithExecutionActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import reducer, {
  type CelanworksmithExecutionState,
} from "reducers/celanworksmithExecutionReducer";
import celanworksmithObjectsReducer from "reducers/celanworksmithObjectsReducer";
import { runSaga, stdChannel } from "redux-saga";
import { all, call } from "redux-saga/effects";
import celanworksmithExecutionSaga, {
  CELANWORKSMITH_ACTION_TIMEOUT_MS,
  CELANWORKSMITH_FUNCTION_TIMEOUT_MS,
} from "../CelanworksmithExecutionSaga";
import celanworksmithObjectsSaga from "../CelanworksmithObjectsSaga";

const sideEffectFreeFunction: CelanworksmithFunction = {
  id: "CalculateDelayDays",
  displayName: "Calculate Delay Days",
  returnType: "INTEGER",
  parameters: [
    {
      id: "poId",
      displayName: "Purchase Order",
      dataType: "STRING",
      required: true,
      readOnly: false,
      derived: false,
    },
  ],
  sideEffectFree: true,
};

const sideEffectingFunction: CelanworksmithFunction = {
  ...sideEffectFreeFunction,
  id: "CalculateLiveDelayDays",
  sideEffectFree: false,
};

const integerFunction: CelanworksmithFunction = {
  ...sideEffectFreeFunction,
  id: "CalculateQuantity",
  parameters: [
    {
      id: "quantity",
      displayName: "Quantity",
      dataType: "INTEGER",
      required: true,
      readOnly: false,
      derived: false,
    },
  ],
};

const productionScheduleAction: CelanworksmithAction = {
  id: "UpdateProductionSchedule",
  displayName: "Update Production Schedule",
  objectTypeId: "PurchaseOrder",
  parameters: [
    {
      id: "newScheduleDate",
      displayName: "New Schedule Date",
      dataType: "DATETIME",
      required: true,
      readOnly: false,
      derived: false,
    },
  ],
  requiresConfirmation: true,
};

const productionCapacityAction: CelanworksmithAction = {
  ...productionScheduleAction,
  id: "UpdateProductionCapacity",
  displayName: "Update Production Capacity",
};

const successfulActionResult = {
  success: true,
  message: "Action executed",
  executionId: "execution-123",
  changedObjects: [
    {
      id: "PR001",
      typeId: "ProductionOrder",
      properties: { scheduleDate: "2026-03-15" },
    },
  ],
  sideEffects: [{ type: "NOTIFICATION", recipient: "production-team" }],
};

const successfulResponse = (data: unknown) => ({
  responseMeta: { status: 200, success: true },
  data,
});

const failedResponse = (code: string, message: string) => ({
  responseMeta: {
    status: 503,
    success: false,
    error: { code, message },
  },
  data: undefined,
});

function* celanworksmithTestSaga() {
  yield all([
    call(celanworksmithExecutionSaga),
    call(celanworksmithObjectsSaga),
  ]);
}

const createHarness = (
  functions: CelanworksmithFunction[] = [sideEffectFreeFunction],
  executionState?: CelanworksmithExecutionState,
  actions: CelanworksmithAction[] = [],
) => {
  let state = {
    celanworksmithOntology: {
      status: "ready" as const,
      functions,
      actions,
    },
    celanworksmithExecution:
      executionState ||
      reducer(undefined, { type: "@@INIT", payload: undefined }),
    celanworksmithObjects: celanworksmithObjectsReducer(undefined, {
      type: "@@INIT",
      payload: undefined,
    }),
  };
  const channel = stdChannel();
  const dispatched: Array<{ type: string; payload?: unknown }> = [];
  let resolveEvaluation: () => void = () => undefined;
  const evaluationComplete = new Promise<void>((resolve) => {
    resolveEvaluation = resolve;
  });
  const task = runSaga(
    {
      channel,
      dispatch: (action) => {
        state = {
          ...state,
          celanworksmithExecution: reducer(
            state.celanworksmithExecution,
            action,
          ),
          celanworksmithObjects: celanworksmithObjectsReducer(
            state.celanworksmithObjects,
            action,
          ),
        };
        dispatched.push(action);
        channel.put(action);

        if (action.type === ReduxActionTypes.TRIGGER_EVAL) {
          resolveEvaluation();
        }
      },
      getState: () => state,
    },
    celanworksmithTestSaga,
  );

  const dispatch = (action: { type: string; payload?: unknown }) => {
    state = {
      ...state,
      celanworksmithExecution: reducer(state.celanworksmithExecution, action),
      celanworksmithObjects: celanworksmithObjectsReducer(
        state.celanworksmithObjects,
        action,
      ),
    };
    channel.put(action);
  };

  return {
    dispatch,
    dispatched,
    evaluationComplete,
    getState: () => state,
    task,
  };
};

const waitFor = async (predicate: () => boolean) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;

    await Promise.resolve();
  }

  throw new Error("Timed out waiting for Saga work");
};

describe("celanworksmithExecutionSaga", () => {
  beforeEach(() => {
    jest
      .spyOn(CelanworksmithAPI, "queryObjects")
      .mockImplementation(async (typeId) =>
        successfulResponse({
          typeId,
          items: [],
          offset: 0,
          limit: 100,
          total: 0,
        }),
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("executes a valid Function and evaluates the stored result", async () => {
    const callFunction = jest
      .spyOn(CelanworksmithAPI, "callFunction")
      .mockImplementation(async function (this: typeof CelanworksmithAPI) {
        if (this !== CelanworksmithAPI) {
          throw new Error("CelanworksmithAPI context was not preserved");
        }

        return successfulResponse(3);
      });
    const harness = createHarness();
    const run = celanworksmithFunctionRun(
      sideEffectFreeFunction.id,
      { poId: "PO001" },
      "request-success",
    );

    try {
      harness.dispatch(run);
      await harness.evaluationComplete;

      expect(callFunction).toHaveBeenCalledWith(
        sideEffectFreeFunction.id,
        { poId: "PO001" },
        expect.any(AbortSignal),
      );
      expect(
        harness.getState().celanworksmithExecution.functions,
      ).toMatchObject({
        [sideEffectFreeFunction.id]: {
          data: 3,
          meta: { status: "succeeded", requestId: "request-success" },
        },
      });
      expect(harness.dispatched.map((action) => action.type)).toEqual(
        expect.arrayContaining([
          ReduxActionTypes.CELANWORKSMITH_FUNCTION_QUEUED,
          ReduxActionTypes.CELANWORKSMITH_FUNCTION_RUNNING,
          ReduxActionTypes.CELANWORKSMITH_FUNCTION_SUCCEEDED,
          ReduxActionTypes.TRIGGER_EVAL,
        ]),
      );
      const cacheEntry =
        harness.getState().celanworksmithExecution.functionCache[
          getCelanworksmithFunctionCacheKey(
            sideEffectFreeFunction.id,
            run.payload.parametersHash,
          )
        ];

      expect(cacheEntry).toMatchObject({
        data: 3,
        expiresAt: expect.any(Number),
      });
      expect(cacheEntry.expiresAt).toBeGreaterThan(Date.now());
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("passes application context to Function execution and cache", async () => {
    const callFunction = jest
      .spyOn(CelanworksmithAPI, "callFunction")
      .mockResolvedValue(successfulResponse(3));
    const harness = createHarness();
    const run = celanworksmithFunctionRun(
      sideEffectFreeFunction.id,
      { poId: "PO001" },
      "request-app-a",
      "app-a",
    );

    try {
      harness.dispatch(run);
      await harness.evaluationComplete;

      expect(callFunction).toHaveBeenCalledWith(
        sideEffectFreeFunction.id,
        { poId: "PO001" },
        expect.any(AbortSignal),
        "app-a",
      );
      expect(
        harness.getState().celanworksmithExecution.functionCache,
      ).toHaveProperty(
        getCelanworksmithFunctionCacheKey(
          sideEffectFreeFunction.id,
          run.payload.parametersHash,
          "app-a",
        ),
      );
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("normalizes a failed Function response without replacing prior data", async () => {
    const callFunction = jest
      .spyOn(CelanworksmithAPI, "callFunction")
      .mockResolvedValue(
        failedResponse("FUNCTION_NOT_FOUND", "Missing Function"),
      );
    const priorRun = celanworksmithFunctionRun(
      sideEffectFreeFunction.id,
      { poId: "PO000" },
      "prior-success",
    );
    const priorExecutionState = reducer(
      reducer(reducer(undefined, priorRun), {
        type: ReduxActionTypes.CELANWORKSMITH_FUNCTION_RUNNING,
        payload: priorRun.payload,
      }),
      {
        type: ReduxActionTypes.CELANWORKSMITH_FUNCTION_SUCCEEDED,
        payload: { ...priorRun.payload, data: 4 },
      },
    );
    const harness = createHarness(
      [sideEffectFreeFunction],
      priorExecutionState,
    );

    try {
      harness.dispatch(
        celanworksmithFunctionRun(
          sideEffectFreeFunction.id,
          { poId: "PO001" },
          "request-failure",
        ),
      );
      await harness.evaluationComplete;

      expect(callFunction).toHaveBeenCalledTimes(1);
      expect(
        harness.getState().celanworksmithExecution.functions[
          sideEffectFreeFunction.id
        ],
      ).toMatchObject({
        data: 4,
        meta: {
          status: "failed",
          error: { code: "UNKNOWN_FUNCTION", message: "Missing Function" },
        },
      });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("retries one transient Function failure before recording the final error", async () => {
    const callFunction = jest
      .spyOn(CelanworksmithAPI, "callFunction")
      .mockResolvedValue(
        failedResponse("PROVIDER_UNAVAILABLE", "Provider unavailable"),
      );
    const harness = createHarness();

    try {
      harness.dispatch(
        celanworksmithFunctionRun(
          sideEffectFreeFunction.id,
          { poId: "PO001" },
          "request-retry",
        ),
      );
      await harness.evaluationComplete;

      expect(callFunction).toHaveBeenCalledTimes(2);
      expect(
        harness.getState().celanworksmithExecution.functions[
          sideEffectFreeFunction.id
        ].meta,
      ).toMatchObject({
        status: "failed",
        error: {
          code: "PROVIDER_UNAVAILABLE",
          message: "Provider unavailable",
        },
      });
      expect(
        harness.getState().celanworksmithExecution.requests["request-retry"],
      ).toMatchObject({ status: "failed", retryCount: 1 });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("times out a Function request and aborts its request signal", async () => {
    jest.useFakeTimers();
    const requestSignals: AbortSignal[] = [];

    jest
      .spyOn(CelanworksmithAPI, "callFunction")
      .mockImplementation(async (_functionId, _parameters, signal) => {
        requestSignals.push(signal);

        return new Promise(() => undefined);
      });
    const harness = createHarness();

    try {
      harness.dispatch(
        celanworksmithFunctionRun(
          sideEffectFreeFunction.id,
          { poId: "PO001" },
          "request-timeout",
        ),
      );
      await waitFor(() => requestSignals.length === 1);
      jest.advanceTimersByTime(CELANWORKSMITH_FUNCTION_TIMEOUT_MS);
      await waitFor(() => requestSignals.length === 2);
      jest.advanceTimersByTime(CELANWORKSMITH_FUNCTION_TIMEOUT_MS);
      await harness.evaluationComplete;

      expect(requestSignals).toHaveLength(2);
      expect(requestSignals.every((signal) => signal.aborted)).toBe(true);
      expect(
        harness.getState().celanworksmithExecution.functions[
          sideEffectFreeFunction.id
        ].meta,
      ).toMatchObject({
        status: "failed",
        error: { code: "TIMEOUT" },
      });
      expect(
        harness.getState().celanworksmithExecution.requests["request-timeout"],
      ).toMatchObject({ retryCount: 1 });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("cancels a running Function without storing a successful response", async () => {
    let requestSignal: AbortSignal | undefined;

    jest
      .spyOn(CelanworksmithAPI, "callFunction")
      .mockImplementation(async (_functionId, _parameters, signal) => {
        requestSignal = signal;

        return new Promise(() => undefined);
      });
    const harness = createHarness();
    const run = celanworksmithFunctionRun(
      sideEffectFreeFunction.id,
      { poId: "PO001" },
      "request-cancelled",
    );

    try {
      harness.dispatch(run);
      await waitFor(() => !!requestSignal);
      harness.dispatch(celanworksmithFunctionCancel(run.payload.requestId));
      await harness.evaluationComplete;

      expect(requestSignal?.aborted).toBe(true);
      expect(
        harness.getState().celanworksmithExecution.functions[
          sideEffectFreeFunction.id
        ],
      ).toMatchObject({
        data: undefined,
        meta: { status: "cancelled", requestId: "request-cancelled" },
      });
      expect(harness.dispatched.map((action) => action.type)).not.toContain(
        ReduxActionTypes.CELANWORKSMITH_FUNCTION_SUCCEEDED,
      );
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("uses a fresh cache entry for a side-effect-free Function", async () => {
    const parameters = { poId: "PO001" };
    const parametersHash = hashCelanworksmithParameters(parameters);
    const executionState = {
      ...reducer(undefined, { type: "@@INIT", payload: undefined }),
      functionCache: {
        [getCelanworksmithFunctionCacheKey(
          sideEffectFreeFunction.id,
          parametersHash,
        )]: { data: 7, expiresAt: Date.now() + 30_000 },
      },
    };
    const callFunction = jest.spyOn(CelanworksmithAPI, "callFunction");
    const harness = createHarness([sideEffectFreeFunction], executionState);

    try {
      harness.dispatch(
        celanworksmithFunctionRun(
          sideEffectFreeFunction.id,
          parameters,
          "request-cached",
        ),
      );
      await harness.evaluationComplete;

      expect(callFunction).not.toHaveBeenCalled();
      expect(
        harness.getState().celanworksmithExecution.functions[
          sideEffectFreeFunction.id
        ],
      ).toMatchObject({
        data: 7,
        meta: { status: "succeeded", requestId: "request-cached" },
      });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("calls the runtime API when a side-effect-free Function cache entry has expired", async () => {
    const parameters = { poId: "PO001" };
    const parametersHash = hashCelanworksmithParameters(parameters);
    const executionState = {
      ...reducer(undefined, { type: "@@INIT", payload: undefined }),
      functionCache: {
        [getCelanworksmithFunctionCacheKey(
          sideEffectFreeFunction.id,
          parametersHash,
        )]: { data: 7, expiresAt: Date.now() - 1 },
      },
    };
    const callFunction = jest
      .spyOn(CelanworksmithAPI, "callFunction")
      .mockResolvedValue(successfulResponse(9));
    const harness = createHarness([sideEffectFreeFunction], executionState);

    try {
      harness.dispatch(
        celanworksmithFunctionRun(
          sideEffectFreeFunction.id,
          parameters,
          "request-expired-cache",
        ),
      );
      await harness.evaluationComplete;

      expect(callFunction).toHaveBeenCalledTimes(1);
      expect(
        harness.getState().celanworksmithExecution.functions[
          sideEffectFreeFunction.id
        ].data,
      ).toBe(9);
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("bypasses the cache for a side-effecting Function", async () => {
    const parameters = { poId: "PO001" };
    const parametersHash = hashCelanworksmithParameters(parameters);
    const executionState = {
      ...reducer(undefined, { type: "@@INIT", payload: undefined }),
      functionCache: {
        [getCelanworksmithFunctionCacheKey(
          sideEffectingFunction.id,
          parametersHash,
        )]: { data: 7, expiresAt: Date.now() + 30_000 },
      },
    };
    const callFunction = jest
      .spyOn(CelanworksmithAPI, "callFunction")
      .mockResolvedValue(successfulResponse(8));
    const harness = createHarness([sideEffectingFunction], executionState);

    try {
      harness.dispatch(
        celanworksmithFunctionRun(
          sideEffectingFunction.id,
          parameters,
          "request-uncached",
        ),
      );
      await harness.evaluationComplete;

      expect(callFunction).toHaveBeenCalledTimes(1);
      expect(
        harness.getState().celanworksmithExecution.functions[
          sideEffectingFunction.id
        ].data,
      ).toBe(8);
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("rejects unknown, missing, and invalid Function parameters locally", async () => {
    const callFunction = jest.spyOn(CelanworksmithAPI, "callFunction");
    const harness = createHarness();

    try {
      harness.dispatch(
        celanworksmithFunctionRun("UnknownFunction", {}, "request-unknown"),
      );
      await harness.evaluationComplete;
      expect(
        harness.getState().celanworksmithExecution.functions.UnknownFunction
          .meta,
      ).toMatchObject({
        status: "failed",
        error: { code: "UNKNOWN_FUNCTION" },
      });

      harness.dispatch(
        celanworksmithFunctionRun(
          sideEffectFreeFunction.id,
          {},
          "request-missing-parameter",
        ),
      );
      await waitFor(
        () =>
          harness.getState().celanworksmithExecution.requests[
            "request-missing-parameter"
          ]?.status === "failed",
      );
      expect(
        harness.getState().celanworksmithExecution.functions[
          sideEffectFreeFunction.id
        ].meta,
      ).toMatchObject({
        status: "failed",
        error: { code: "INVALID_ARGUMENT" },
      });

      harness.dispatch(
        celanworksmithFunctionRun(
          sideEffectFreeFunction.id,
          { poId: 1 },
          "request-invalid-parameter",
        ),
      );
      await waitFor(
        () =>
          harness.getState().celanworksmithExecution.requests[
            "request-invalid-parameter"
          ]?.status === "failed",
      );
      expect(callFunction).not.toHaveBeenCalled();
      expect(
        harness.getState().celanworksmithExecution.functions[
          sideEffectFreeFunction.id
        ].meta,
      ).toMatchObject({
        status: "failed",
        error: { code: "INVALID_ARGUMENT" },
      });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("rejects fractional values for INTEGER Function parameters locally", async () => {
    const callFunction = jest
      .spyOn(CelanworksmithAPI, "callFunction")
      .mockResolvedValue(successfulResponse(3));
    const harness = createHarness([integerFunction]);

    try {
      harness.dispatch(
        celanworksmithFunctionRun(
          integerFunction.id,
          { quantity: 1.5 },
          "request-fractional-integer",
        ),
      );
      await harness.evaluationComplete;

      expect(callFunction).not.toHaveBeenCalled();
      expect(
        harness.getState().celanworksmithExecution.functions[integerFunction.id]
          .meta,
      ).toMatchObject({
        status: "failed",
        error: { code: "INVALID_ARGUMENT" },
      });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("executes a valid Action and stores its result before evaluation", async () => {
    const executeAction = jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockImplementation(async function (this: typeof CelanworksmithAPI) {
        if (this !== CelanworksmithAPI) {
          throw new Error("CelanworksmithAPI context was not preserved");
        }

        return successfulResponse(successfulActionResult);
      });
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);
    const run = celanworksmithActionRun(
      productionScheduleAction.id,
      {
        objectTypeId: "PurchaseOrder",
        objectId: "PO001",
        parameters: { newScheduleDate: "2026-03-15" },
      },
      "action-success",
    );

    try {
      harness.dispatch(run);
      await harness.evaluationComplete;

      expect(executeAction).toHaveBeenCalledWith(
        productionScheduleAction.id,
        run.payload.request,
        expect.any(AbortSignal),
        undefined,
      );
      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ],
      ).toMatchObject({
        data: successfulActionResult,
        changedObjects: successfulActionResult.changedObjects,
        sideEffects: successfulActionResult.sideEffects,
        meta: {
          status: "succeeded",
          requestId: "action-success",
          executionId: "execution-123",
        },
      });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("passes the bound application ID to Action execution", async () => {
    const executeAction = jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockResolvedValue(successfulResponse(successfulActionResult));
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);
    const run = celanworksmithActionRun(
      productionScheduleAction.id,
      {
        objectTypeId: "PurchaseOrder",
        objectId: "PO001",
        parameters: { newScheduleDate: "2026-03-15" },
      },
      "action-application-id",
      "application-123",
    );

    try {
      harness.dispatch(run);
      await harness.evaluationComplete;

      expect(executeAction).toHaveBeenCalledWith(
        productionScheduleAction.id,
        run.payload.request,
        expect.any(AbortSignal),
        "application-123",
      );
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("refreshes only deduplicated changed object types before evaluating", async () => {
    const actionResult = {
      ...successfulActionResult,
      changedObjects: [
        ...successfulActionResult.changedObjects,
        {
          id: "DO001",
          typeId: "DeliveryOrder",
          properties: { status: "Scheduled" },
        },
        {
          id: "PR002",
          typeId: "ProductionOrder",
          properties: { scheduleDate: "2026-03-16" },
        },
      ],
    };
    jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockResolvedValue(successfulResponse(actionResult));
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);

    try {
      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          {
            objectTypeId: "PurchaseOrder",
            objectId: "PO001",
            parameters: { newScheduleDate: "2026-03-15" },
          },
          "action-refresh-scope",
        ),
      );
      await harness.evaluationComplete;

      expect(CelanworksmithAPI.queryObjects).toHaveBeenCalledTimes(2);
      expect(CelanworksmithAPI.queryObjects).toHaveBeenNthCalledWith(
        1,
        "ProductionOrder",
        { offset: 0, limit: 100 },
      );
      expect(CelanworksmithAPI.queryObjects).toHaveBeenNthCalledWith(
        2,
        "DeliveryOrder",
        { offset: 0, limit: 100 },
      );
      const dispatchedTypes = harness.dispatched.map((action) => action.type);
      const refreshRequestIndex = dispatchedTypes.indexOf(
        ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPES_REFRESH_REQUESTED,
      );
      const refreshCompleteIndex = dispatchedTypes.indexOf(
        ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPES_REFRESH_COMPLETE,
      );
      const evaluationIndex = dispatchedTypes.lastIndexOf(
        ReduxActionTypes.TRIGGER_EVAL,
      );

      expect(
        harness.dispatched.find(
          (action) =>
            action.type ===
            ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPES_REFRESH_REQUESTED,
        )?.payload,
      ).toEqual(["ProductionOrder", "DeliveryOrder"]);
      expect(refreshRequestIndex).toBeGreaterThan(
        dispatchedTypes.indexOf(
          ReduxActionTypes.CELANWORKSMITH_ACTION_SUCCEEDED,
        ),
      );
      expect(refreshCompleteIndex).toBeGreaterThan(refreshRequestIndex);
      expect(evaluationIndex).toBeGreaterThan(refreshCompleteIndex);
      expect(
        dispatchedTypes.filter(
          (type) => type === ReduxActionTypes.TRIGGER_EVAL,
        ),
      ).toHaveLength(1);
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("waits for each concurrent scoped refresh before evaluating its Action", async () => {
    const refreshResolvers: Array<
      (response: ReturnType<typeof successfulResponse>) => void
    > = [];
    jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockResolvedValue(successfulResponse(successfulActionResult));
    jest.spyOn(CelanworksmithAPI, "queryObjects").mockImplementation(
      () =>
        new Promise((resolve) => {
          refreshResolvers.push(resolve);
        }),
    );
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
      productionCapacityAction,
    ]);
    const request = {
      objectTypeId: "PurchaseOrder",
      objectId: "PO001",
      parameters: { newScheduleDate: "2026-03-15" },
    };

    try {
      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          request,
          "action-concurrent-first",
        ),
      );
      harness.dispatch(
        celanworksmithActionRun(
          productionCapacityAction.id,
          request,
          "action-concurrent-second",
        ),
      );
      await waitFor(() => refreshResolvers.length === 2);

      const refreshRequests = harness.dispatched.filter(
        (dispatchedAction) =>
          dispatchedAction.type ===
          ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPES_REFRESH_REQUESTED,
      );

      expect(refreshRequests).toHaveLength(2);
      expect(
        refreshRequests.map((refreshAction) => refreshAction.payload),
      ).toEqual([["ProductionOrder"], ["ProductionOrder"]]);
      expect(
        new Set(
          refreshRequests.map(
            (refreshAction) =>
              (refreshAction as { meta?: { correlationId?: string } }).meta
                ?.correlationId,
          ),
        ),
      ).toEqual(
        new Set(["action-concurrent-first", "action-concurrent-second"]),
      );

      refreshResolvers[0](
        successfulResponse({
          typeId: "ProductionOrder",
          items: [],
          offset: 0,
          limit: 100,
          total: 0,
        }),
      );
      await waitFor(
        () =>
          harness.dispatched.filter(
            (dispatchedAction) =>
              dispatchedAction.type ===
              ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPES_REFRESH_COMPLETE,
          ).length === 1,
      );

      expect(
        harness.dispatched.filter(
          (dispatchedAction) =>
            dispatchedAction.type === ReduxActionTypes.TRIGGER_EVAL,
        ),
      ).toHaveLength(1);

      refreshResolvers[1](
        successfulResponse({
          typeId: "ProductionOrder",
          items: [],
          offset: 0,
          limit: 100,
          total: 0,
        }),
      );
      await waitFor(
        () =>
          harness.dispatched.filter(
            (dispatchedAction) =>
              dispatchedAction.type === ReduxActionTypes.TRIGGER_EVAL,
          ).length === 2,
      );

      const refreshCompletions = harness.dispatched.filter(
        (dispatchedAction) =>
          dispatchedAction.type ===
          ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPES_REFRESH_COMPLETE,
      );

      expect(
        new Set(
          refreshCompletions.map(
            (refreshAction) =>
              (refreshAction as { meta?: { correlationId?: string } }).meta
                ?.correlationId,
          ),
        ),
      ).toEqual(
        new Set(["action-concurrent-first", "action-concurrent-second"]),
      );
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("records a failed Action response and allows an explicit retry", async () => {
    const executeAction = jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockResolvedValueOnce(
        failedResponse("ACTION_NOT_FOUND", "Missing Action"),
      )
      .mockResolvedValueOnce(successfulResponse(successfulActionResult));
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);
    const request = {
      objectTypeId: "PurchaseOrder",
      objectId: "PO001",
      parameters: { newScheduleDate: "2026-03-15" },
    };

    try {
      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          request,
          "action-failure",
        ),
      );
      await harness.evaluationComplete;
      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ].meta,
      ).toMatchObject({
        status: "failed",
        error: { code: "UNKNOWN_ACTION", message: "Missing Action" },
      });

      harness.dispatch(
        celanworksmithActionRetry(productionScheduleAction.id, request),
      );
      await waitFor(
        () =>
          harness.getState().celanworksmithExecution.actions[
            productionScheduleAction.id
          ]?.meta.status === "succeeded",
      );

      expect(executeAction).toHaveBeenCalledTimes(2);
      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ].meta,
      ).toMatchObject({ status: "succeeded", executionId: "execution-123" });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("retries a transient network Action failure once before succeeding", async () => {
    const executeAction = jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockRejectedValueOnce({ code: "ERR_NETWORK", message: "Network Error" })
      .mockResolvedValueOnce(successfulResponse(successfulActionResult));
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);

    try {
      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          {
            objectTypeId: "PurchaseOrder",
            objectId: "PO001",
            parameters: { newScheduleDate: "2026-03-15" },
          },
          "action-network-retry",
        ),
      );
      await harness.evaluationComplete;

      expect(executeAction).toHaveBeenCalledTimes(2);
      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ].meta,
      ).toMatchObject({ status: "succeeded", executionId: "execution-123" });
      expect(
        harness.getState().celanworksmithExecution.requests[
          "action-network-retry"
        ],
      ).toMatchObject({ status: "succeeded", retryCount: 1 });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("stops after one provider retry and permits an explicit Action retry", async () => {
    const executeAction = jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockResolvedValueOnce(
        failedResponse("PROVIDER_UNAVAILABLE", "Provider unavailable"),
      )
      .mockResolvedValueOnce(
        failedResponse("PROVIDER_UNAVAILABLE", "Provider unavailable"),
      )
      .mockResolvedValueOnce(successfulResponse(successfulActionResult));
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);
    const request = {
      objectTypeId: "PurchaseOrder",
      objectId: "PO001",
      parameters: { newScheduleDate: "2026-03-15" },
    };

    try {
      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          request,
          "action-provider-retry",
        ),
      );
      await harness.evaluationComplete;

      expect(executeAction).toHaveBeenCalledTimes(2);
      expect(
        harness.getState().celanworksmithExecution.requests[
          "action-provider-retry"
        ],
      ).toMatchObject({
        status: "failed",
        retryCount: 1,
        error: { code: "PROVIDER_UNAVAILABLE" },
      });

      harness.dispatch(
        celanworksmithActionRetry(productionScheduleAction.id, request),
      );
      await waitFor(
        () =>
          harness.getState().celanworksmithExecution.actions[
            productionScheduleAction.id
          ]?.meta.status === "succeeded",
      );

      expect(executeAction).toHaveBeenCalledTimes(3);
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("retries one timed out Action request and aborts both attempts", async () => {
    jest.useFakeTimers();
    const requestSignals: AbortSignal[] = [];

    jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockImplementation(async (_actionId, _request, signal) => {
        requestSignals.push(signal as AbortSignal);

        return new Promise(() => undefined);
      });
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);

    try {
      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          {
            objectTypeId: "PurchaseOrder",
            objectId: "PO001",
            parameters: { newScheduleDate: "2026-03-15" },
          },
          "action-timeout",
        ),
      );
      await waitFor(() => requestSignals.length === 1);
      jest.advanceTimersByTime(CELANWORKSMITH_ACTION_TIMEOUT_MS);
      await waitFor(() => requestSignals.length === 2);
      jest.advanceTimersByTime(CELANWORKSMITH_ACTION_TIMEOUT_MS);
      await harness.evaluationComplete;

      expect(requestSignals).toHaveLength(2);
      expect(requestSignals.every((signal) => signal.aborted)).toBe(true);
      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ].meta,
      ).toMatchObject({ status: "failed", error: { code: "TIMEOUT" } });
      expect(
        harness.getState().celanworksmithExecution.requests["action-timeout"],
      ).toMatchObject({ retryCount: 1 });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("cancels a running Action without recording a success", async () => {
    let requestSignal: AbortSignal | undefined;

    jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockImplementation(async (_actionId, _request, signal) => {
        requestSignal = signal;

        return new Promise(() => undefined);
      });
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);
    const run = celanworksmithActionRun(
      productionScheduleAction.id,
      {
        objectTypeId: "PurchaseOrder",
        objectId: "PO001",
        parameters: { newScheduleDate: "2026-03-15" },
      },
      "action-cancelled",
    );

    try {
      harness.dispatch(run);
      await waitFor(() => !!requestSignal);
      harness.dispatch(celanworksmithActionCancel(run.payload.requestId));
      await harness.evaluationComplete;

      expect(requestSignal?.aborted).toBe(true);
      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ].meta,
      ).toMatchObject({ status: "cancelled", requestId: "action-cancelled" });
      expect(harness.dispatched.map((action) => action.type)).not.toContain(
        ReduxActionTypes.CELANWORKSMITH_ACTION_SUCCEEDED,
      );
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("rejects a duplicate Action submission while preserving the running request", async () => {
    let resolveAction: (value: ReturnType<typeof successfulResponse>) => void;
    const pendingResponse = new Promise<ReturnType<typeof successfulResponse>>(
      (resolve) => {
        resolveAction = resolve;
      },
    );
    const executeAction = jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockReturnValue(pendingResponse);
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);
    const firstRun = celanworksmithActionRun(
      productionScheduleAction.id,
      {
        objectTypeId: "PurchaseOrder",
        objectId: "PO001",
        parameters: { newScheduleDate: "2026-03-15" },
      },
      "action-first",
    );
    const duplicateRun = celanworksmithActionRun(
      productionScheduleAction.id,
      {
        objectTypeId: "PurchaseOrder",
        objectId: "PO002",
        parameters: { newScheduleDate: "2026-03-16" },
      },
      "action-duplicate",
    );

    try {
      harness.dispatch(firstRun);
      await waitFor(() => executeAction.mock.calls.length === 1);
      harness.dispatch(duplicateRun);
      await waitFor(
        () =>
          harness.getState().celanworksmithExecution.requests[
            duplicateRun.payload.requestId
          ]?.status === "failed",
      );

      expect(executeAction).toHaveBeenCalledTimes(1);
      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ].meta,
      ).toMatchObject({ status: "running", requestId: "action-first" });
      expect(
        harness.getState().celanworksmithExecution.requests[
          duplicateRun.payload.requestId
        ],
      ).toMatchObject({
        status: "failed",
        error: { code: "DUPLICATE_REQUEST" },
      });

      resolveAction!(successfulResponse(successfulActionResult));
      await harness.evaluationComplete;
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("rejects invalid Action metadata locally before invoking the runtime", async () => {
    const executeAction = jest.spyOn(CelanworksmithAPI, "executeAction");
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);

    try {
      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          {
            objectTypeId: "Supplier",
            objectId: "S001",
            parameters: { newScheduleDate: "2026-03-15" },
          },
          "action-wrong-type",
        ),
      );
      await harness.evaluationComplete;
      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ].meta,
      ).toMatchObject({
        status: "failed",
        error: { code: "INVALID_ARGUMENT" },
      });

      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          {
            objectTypeId: "PurchaseOrder",
            objectId: "",
            parameters: {},
          },
          "action-invalid-request",
        ),
      );
      await waitFor(
        () =>
          harness.getState().celanworksmithExecution.requests[
            "action-invalid-request"
          ]?.status === "failed",
      );

      expect(executeAction).not.toHaveBeenCalled();
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("rejects an arbitrary Action request without throwing or leaving it queued", async () => {
    const executeAction = jest.spyOn(CelanworksmithAPI, "executeAction");
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);

    try {
      expect(() => {
        harness.dispatch(
          celanworksmithActionRun(
            productionScheduleAction.id,
            null as never,
            "action-null-request",
          ),
        );
      }).not.toThrow();
      await harness.evaluationComplete;

      expect(executeAction).not.toHaveBeenCalled();
      expect(
        harness.getState().celanworksmithExecution.requests[
          "action-null-request"
        ],
      ).toMatchObject({
        status: "failed",
        error: { code: "INVALID_ARGUMENT" },
      });
      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ].meta,
      ).toMatchObject({
        status: "failed",
        error: { code: "INVALID_ARGUMENT" },
      });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("rejects non-string Action identifiers before calling the runtime", async () => {
    const executeAction = jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockResolvedValue(successfulResponse(successfulActionResult));
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);

    try {
      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          {
            objectTypeId: "PurchaseOrder",
            objectId: { trim: () => "PO001" },
            parameters: { newScheduleDate: "2026-03-15" },
          } as never,
          "action-non-string-object-id",
        ),
      );
      await harness.evaluationComplete;

      expect(executeAction).not.toHaveBeenCalled();
      expect(
        harness.getState().celanworksmithExecution.requests[
          "action-non-string-object-id"
        ],
      ).toMatchObject({
        status: "failed",
        error: { code: "INVALID_ARGUMENT" },
      });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("rejects non-record Action parameters before calling the runtime", async () => {
    const parameterlessAction: CelanworksmithAction = {
      ...productionScheduleAction,
      id: "NoParameterAction",
      parameters: [],
    };
    const executeAction = jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockResolvedValue(successfulResponse(successfulActionResult));
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      parameterlessAction,
    ]);

    try {
      harness.dispatch(
        celanworksmithActionRun(
          parameterlessAction.id,
          {
            objectTypeId: "PurchaseOrder",
            objectId: "PO001",
            parameters: [],
          } as never,
          "action-array-parameters",
        ),
      );
      await harness.evaluationComplete;

      expect(executeAction).not.toHaveBeenCalled();
      expect(
        harness.getState().celanworksmithExecution.requests[
          "action-array-parameters"
        ],
      ).toMatchObject({
        status: "failed",
        error: { code: "INVALID_ARGUMENT" },
      });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("rejects an invalid successful Action response without storing partial data", async () => {
    jest.spyOn(CelanworksmithAPI, "executeAction").mockResolvedValue(
      successfulResponse({
        success: true,
        message: "Action executed",
        executionId: "execution-incomplete",
        changedObjects: [],
      }),
    );
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);

    try {
      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          {
            objectTypeId: "PurchaseOrder",
            objectId: "PO001",
            parameters: { newScheduleDate: "2026-03-15" },
          },
          "action-invalid-response",
        ),
      );
      await harness.evaluationComplete;

      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ],
      ).toMatchObject({
        data: undefined,
        changedObjects: [],
        sideEffects: [],
        meta: { status: "failed", error: { code: "BACKEND_ERROR" } },
      });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it("classifies a rejected Action result without retrying the runtime service", async () => {
    const executeAction = jest
      .spyOn(CelanworksmithAPI, "executeAction")
      .mockResolvedValue(
        successfulResponse({
          ...successfulActionResult,
          success: false,
          message: "Production is locked for this order.",
        }),
      );
    const harness = createHarness([sideEffectFreeFunction], undefined, [
      productionScheduleAction,
    ]);

    try {
      harness.dispatch(
        celanworksmithActionRun(
          productionScheduleAction.id,
          {
            objectTypeId: "PurchaseOrder",
            objectId: "PO001",
            parameters: { newScheduleDate: "2026-03-15" },
          },
          "action-business-rejected",
        ),
      );
      await harness.evaluationComplete;

      expect(executeAction).toHaveBeenCalledTimes(1);
      expect(
        harness.getState().celanworksmithExecution.actions[
          productionScheduleAction.id
        ].meta,
      ).toMatchObject({
        status: "failed",
        error: {
          code: "BUSINESS_REJECTED",
          message: "Production is locked for this order.",
        },
      });
    } finally {
      harness.task.cancel();
      await harness.task.toPromise();
    }
  });

  it.each([
    ["an empty message", { ...successfulActionResult, message: "" }],
    ["an empty execution ID", { ...successfulActionResult, executionId: "" }],
    [
      "a malformed changed object",
      {
        ...successfulActionResult,
        changedObjects: [
          { id: "PR001", typeId: "ProductionOrder", properties: [] },
        ],
      },
    ],
    [
      "a non-record side effect",
      { ...successfulActionResult, sideEffects: ["NOTIFICATION"] },
    ],
  ])(
    "rejects an invalid Action result with %s",
    async (_description, result) => {
      jest
        .spyOn(CelanworksmithAPI, "executeAction")
        .mockResolvedValue(successfulResponse(result));
      const harness = createHarness([sideEffectFreeFunction], undefined, [
        productionScheduleAction,
      ]);

      try {
        harness.dispatch(
          celanworksmithActionRun(
            productionScheduleAction.id,
            {
              objectTypeId: "PurchaseOrder",
              objectId: "PO001",
              parameters: { newScheduleDate: "2026-03-15" },
            },
            `action-invalid-result-${_description}`,
          ),
        );
        await harness.evaluationComplete;

        expect(
          harness.getState().celanworksmithExecution.actions[
            productionScheduleAction.id
          ],
        ).toMatchObject({
          data: undefined,
          meta: { status: "failed", error: { code: "BACKEND_ERROR" } },
        });
      } finally {
        harness.task.cancel();
        await harness.task.toPromise();
      }
    },
  );
});
