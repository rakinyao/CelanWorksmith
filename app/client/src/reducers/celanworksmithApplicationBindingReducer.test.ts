import reducer from "./celanworksmithApplicationBindingReducer";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";

describe("celanworksmithApplicationBindingReducer", () => {
  it("stores a ready binding for the current application", () => {
    const state = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_SUCCESS,
      payload: {
        applicationId: "app-1",
        binding: {
          applicationId: "app-1",
          projectId: "demo",
          projectVersion: "1.0.0",
          providerId: "mongodb-readonly",
        },
      },
    });

    expect(state.status).toBe("ready");
    expect(state.applicationId).toBe("app-1");
    expect(state.binding?.projectId).toBe("demo");
  });

  it("clears old binding data when the application changes", () => {
    const ready = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_SUCCESS,
      payload: { applicationId: "app-1", binding: null },
    });
    const loading = reducer(ready, {
      type: ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST,
      payload: { applicationId: "app-2" },
    });

    expect(loading).toMatchObject({
      applicationId: "app-2",
      status: "loading",
      binding: null,
    });
    expect(loading.error).toBeUndefined();
  });

  it("retains a structured retryable error", () => {
    const state = reducer(undefined, {
      type: ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_ERROR,
      payload: {
        applicationId: "app-1",
        error: { code: "NETWORK_ERROR", message: "retry me" },
      },
    });

    expect(state).toMatchObject({
      applicationId: "app-1",
      status: "error",
      error: { code: "NETWORK_ERROR", message: "retry me" },
    });
  });
});
