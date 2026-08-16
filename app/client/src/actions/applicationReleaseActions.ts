import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type {
  ApplicationReleaseSnapshot,
  ReleaseDiagnostic,
  ReleasePreflightResponse,
} from "api/ApplicationReleasesAPI";

export const applicationReleasePreflightInit = () => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_INIT,
});

export const applicationReleasePreflightSuccess = (
  preflight: ReleasePreflightResponse,
) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_SUCCESS,
  payload: preflight,
});

export const applicationReleasePreflightError = (error: unknown) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_ERROR,
  payload: error,
});

export const applicationReleaseCreateInit = () => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_CREATE_INIT,
});

export const applicationReleaseCreateSuccess = (
  release: ApplicationReleaseSnapshot,
) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_CREATE_SUCCESS,
  payload: release,
});

export const applicationReleaseCreateError = (error: unknown) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_CREATE_ERROR,
  payload: error,
});

export const applicationReleaseActivateInit = (releaseId: string) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_INIT,
  payload: { releaseId },
});

export const applicationReleaseActivateSuccess = (
  release: ApplicationReleaseSnapshot,
) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_SUCCESS,
  payload: release,
});

export const applicationReleaseActivateError = (error: unknown) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_ERROR,
  payload: error,
});

export const applicationReleaseRollbackInit = (releaseId: string) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_INIT,
  payload: { releaseId },
});

export const applicationReleaseRollbackSuccess = (
  release: ApplicationReleaseSnapshot,
) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_SUCCESS,
  payload: release,
});

export const applicationReleaseRollbackError = (error: unknown) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_ERROR,
  payload: error,
});

export const applicationReleaseListError = (error: unknown) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_LIST_ERROR,
  payload: error,
});

export const applicationReleaseListInit = () => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_LIST_INIT,
});

export const applicationReleaseActiveInit = () => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_ACTIVE_INIT,
});

export const applicationReleaseActiveSuccess = (
  release: ApplicationReleaseSnapshot,
) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_ACTIVE_SUCCESS,
  payload: release,
});

export const applicationReleaseActiveError = (error: unknown) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_ACTIVE_ERROR,
  payload: error,
});

export const applicationReleaseListSuccess = (
  releases: ApplicationReleaseSnapshot[],
  activeReleaseId?: string | null,
) => ({
  type: ReduxActionTypes.APPLICATION_RELEASE_LIST_SUCCESS,
  payload: { releases, activeReleaseId },
});

export type ApplicationReleaseAction = ReturnType<
  | typeof applicationReleasePreflightInit
  | typeof applicationReleasePreflightSuccess
  | typeof applicationReleasePreflightError
  | typeof applicationReleaseCreateInit
  | typeof applicationReleaseCreateSuccess
  | typeof applicationReleaseCreateError
  | typeof applicationReleaseActivateInit
  | typeof applicationReleaseActivateSuccess
  | typeof applicationReleaseActivateError
  | typeof applicationReleaseRollbackInit
  | typeof applicationReleaseRollbackSuccess
  | typeof applicationReleaseRollbackError
  | typeof applicationReleaseListInit
  | typeof applicationReleaseListError
  | typeof applicationReleaseActiveInit
  | typeof applicationReleaseActiveSuccess
  | typeof applicationReleaseActiveError
  | typeof applicationReleaseListSuccess
> & { payload?: unknown };

export type { ReleaseDiagnostic };
