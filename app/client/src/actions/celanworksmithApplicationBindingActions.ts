import type {
  CelanworksmithApplicationBinding,
  CelanworksmithApplicationBindingRequest,
  CelanworksmithExecutionError,
  CelanworksmithOntologyProjectSummary,
} from "api/CelanworksmithAPI";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";

export const celanworksmithApplicationBindingLoadRequest = (
  applicationId: string,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST,
  payload: { applicationId },
});

export const celanworksmithApplicationBindingLoadSuccess = (
  applicationId: string,
  binding: CelanworksmithApplicationBinding | null,
  projects: CelanworksmithOntologyProjectSummary[] = [],
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_SUCCESS,
  payload: { applicationId, binding, projects },
});

export const celanworksmithApplicationBindingLoadError = (
  applicationId: string,
  error: CelanworksmithExecutionError,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_ERROR,
  payload: { applicationId, error },
});

export const celanworksmithApplicationBindingSaveRequest = (
  applicationId: string,
  request: CelanworksmithApplicationBindingRequest,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_SAVE_REQUEST,
  payload: { applicationId, request },
});
