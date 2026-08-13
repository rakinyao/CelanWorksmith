import type {
  CelanworksmithAction,
  CelanworksmithExecutionError,
  CelanworksmithFunction,
} from "api/CelanworksmithAPI";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";

export const celanworksmithOntologyLoadRequest = (
  applicationId?: string,
): {
  type: typeof ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST;
  payload?: { applicationId?: string };
} => ({
  type: ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST,
  ...(applicationId ? { payload: { applicationId } } : {}),
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
