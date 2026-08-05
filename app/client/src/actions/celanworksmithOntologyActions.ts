import type {
  CelanworksmithAction,
  CelanworksmithExecutionError,
  CelanworksmithFunction,
} from "api/CelanworksmithAPI";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";

export const celanworksmithOntologyLoadRequest = (): {
  type: typeof ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST;
} => ({
  type: ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST,
});

export const celanworksmithOntologyLoadSuccess = (
  functions: CelanworksmithFunction[],
  actions: CelanworksmithAction[],
): {
  type: typeof ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_SUCCESS;
  payload: {
    functions: CelanworksmithFunction[];
    actions: CelanworksmithAction[];
  };
} => ({
  type: ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_SUCCESS,
  payload: { functions, actions },
});

export const celanworksmithOntologyLoadError = (
  error: CelanworksmithExecutionError,
): {
  type: typeof ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_ERROR;
  payload: CelanworksmithExecutionError;
} => ({
  type: ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_ERROR,
  payload: error,
});
