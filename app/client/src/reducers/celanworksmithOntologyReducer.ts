import type {
  CelanworksmithAction,
  CelanworksmithExecutionError,
  CelanworksmithFunction,
} from "api/CelanworksmithAPI";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type { CelanworksmithObjectError } from "reducers/celanworksmithObjectsReducer";
import { createReducer } from "utils/ReducerUtils";

export interface CelanworksmithOntologyState {
  status: "idle" | "loading" | "ready" | "error";
  functions: CelanworksmithFunction[];
  actions: CelanworksmithAction[];
  error?: CelanworksmithObjectError;
  updatedAt?: number;
}

const initialState: CelanworksmithOntologyState = {
  status: "idle",
  functions: [],
  actions: [],
};

const celanworksmithOntologyReducer = createReducer(initialState, {
  [ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST]: (
    state: CelanworksmithOntologyState,
  ) => ({ ...state, status: "loading", error: undefined }),
  [ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_SUCCESS]: (
    _state: CelanworksmithOntologyState,
    action: {
      payload: {
        functions: CelanworksmithFunction[];
        actions: CelanworksmithAction[];
      };
    },
  ) => ({
    status: "ready",
    functions: action.payload.functions,
    actions: action.payload.actions,
    error: undefined,
    updatedAt: Date.now(),
  }),
  [ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_ERROR]: (
    state: CelanworksmithOntologyState,
    action: { payload: CelanworksmithExecutionError },
  ) => ({ ...state, status: "error", error: action.payload }),
});

export default celanworksmithOntologyReducer;
