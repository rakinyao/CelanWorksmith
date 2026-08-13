import type {
  CelanworksmithApplicationBinding,
  CelanworksmithExecutionError,
  CelanworksmithOntologyProjectSummary,
} from "api/CelanworksmithAPI";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { createReducer } from "utils/ReducerUtils";

export type CelanworksmithApplicationBindingStatus =
  | "idle"
  | "loading"
  | "ready"
  | "unbound"
  | "error";

export interface CelanworksmithApplicationBindingState {
  status: CelanworksmithApplicationBindingStatus;
  applicationId?: string;
  binding: CelanworksmithApplicationBinding | null;
  projects: CelanworksmithOntologyProjectSummary[];
  versions: CelanworksmithOntologyProjectSummary[];
  error?: CelanworksmithExecutionError;
}

const initialState: CelanworksmithApplicationBindingState = {
  status: "idle",
  binding: null,
  projects: [],
  versions: [],
};

const celanworksmithApplicationBindingReducer = createReducer(initialState, {
  [ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST]: (
    _state: CelanworksmithApplicationBindingState,
    action: { payload: { applicationId: string } },
  ) => ({
    ...initialState,
    status: "loading",
    applicationId: action.payload.applicationId,
  }),
  [ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_SUCCESS]: (
    state: CelanworksmithApplicationBindingState,
    action: {
      payload: {
        applicationId: string;
        binding: CelanworksmithApplicationBinding | null;
        projects?: CelanworksmithOntologyProjectSummary[];
      };
    },
  ) => ({
    ...state,
    applicationId: action.payload.applicationId,
    status: action.payload.binding ? "ready" : "unbound",
    binding: action.payload.binding,
    projects: action.payload.projects || [],
    error: undefined,
  }),
  [ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_ERROR]: (
    state: CelanworksmithApplicationBindingState,
    action: {
      payload: { applicationId: string; error: CelanworksmithExecutionError };
    },
  ) => ({
    ...state,
    applicationId: action.payload.applicationId,
    status: "error",
    error: action.payload.error,
  }),
  [ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_SAVE_SUCCESS]: (
    state: CelanworksmithApplicationBindingState,
    action: {
      payload: {
        applicationId: string;
        binding: CelanworksmithApplicationBinding;
      };
    },
  ) =>
    state.applicationId !== action.payload.applicationId
      ? state
      : {
          ...state,
          status: "ready",
          binding: action.payload.binding,
          error: undefined,
        },
  [ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_SAVE_REQUEST]: (
    state: CelanworksmithApplicationBindingState,
  ) => ({ ...state, status: "loading", error: undefined }),
  [ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_SAVE_ERROR]: (
    state: CelanworksmithApplicationBindingState,
    action: {
      payload: CelanworksmithExecutionError & { applicationId?: string };
    },
  ) =>
    action.payload.applicationId &&
    action.payload.applicationId !== state.applicationId
      ? state
      : { ...state, status: "error", error: action.payload },
});

export default celanworksmithApplicationBindingReducer;
