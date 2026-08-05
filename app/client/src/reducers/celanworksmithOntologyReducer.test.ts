import {
  celanworksmithOntologyLoadError,
  celanworksmithOntologyLoadRequest,
  celanworksmithOntologyLoadSuccess,
} from "actions/celanworksmithOntologyActions";
import reducer from "./celanworksmithOntologyReducer";

const functions = [
  {
    id: "CalculateDelayDays",
    displayName: "Calculate Delay Days",
    returnType: "INTEGER",
    parameters: [],
    sideEffectFree: true,
  },
];

const actions = [
  {
    id: "UpdateDeliveryDate",
    displayName: "Update Delivery Date",
    objectTypeId: "PurchaseOrder",
    parameters: [],
    requiresConfirmation: true,
  },
];

describe("celanworksmithOntologyReducer", () => {
  it("replaces Function and Action metadata together after loading", () => {
    const loadingState = reducer(
      undefined,
      celanworksmithOntologyLoadRequest(),
    );
    const readyState = reducer(
      loadingState,
      celanworksmithOntologyLoadSuccess(functions, actions),
    );

    expect(loadingState).toMatchObject({
      status: "loading",
      functions: [],
      actions: [],
    });
    expect(readyState).toMatchObject({
      status: "ready",
      functions,
      actions,
      error: undefined,
    });
    expect(readyState.updatedAt).toEqual(expect.any(Number));
  });

  it("keeps the previous metadata when a reload fails", () => {
    const readyState = reducer(
      reducer(undefined, celanworksmithOntologyLoadRequest()),
      celanworksmithOntologyLoadSuccess(functions, actions),
    );
    const error = { code: "UNKNOWN_FUNCTION" as const, message: "Missing" };
    const failedState = reducer(
      reducer(readyState, celanworksmithOntologyLoadRequest()),
      celanworksmithOntologyLoadError(error),
    );

    expect(failedState).toMatchObject({
      status: "error",
      functions,
      actions,
      error,
    });
    expect(failedState.updatedAt).toBe(readyState.updatedAt);
  });
});
