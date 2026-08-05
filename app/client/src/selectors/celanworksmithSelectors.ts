import type { DefaultRootState } from "react-redux";
import type {
  CelanworksmithExecutionState,
  CelanworksmithFunctionExecutionState,
} from "reducers/celanworksmithExecutionReducer";
import type { CelanworksmithOntologyState } from "reducers/celanworksmithOntologyReducer";

const initialOntologyState: CelanworksmithOntologyState = {
  status: "idle",
  functions: [],
  actions: [],
};

const initialExecutionState: CelanworksmithExecutionState = {
  functions: {},
  actions: {},
  requests: {},
  functionCache: {},
  inputs: {},
};

export const getCelanworksmithOntologyState = (
  state: DefaultRootState,
): CelanworksmithOntologyState =>
  (state.celanworksmithOntology as CelanworksmithOntologyState | undefined) ||
  initialOntologyState;

export const getCelanworksmithExecutionState = (
  state: DefaultRootState,
): CelanworksmithExecutionState =>
  (state.celanworksmithExecution as CelanworksmithExecutionState | undefined) ||
  initialExecutionState;

export const getCelanworksmithFunctionExecutionState = (
  state: DefaultRootState,
  functionId: string,
): CelanworksmithFunctionExecutionState | undefined =>
  getCelanworksmithExecutionState(state).functions[functionId];
