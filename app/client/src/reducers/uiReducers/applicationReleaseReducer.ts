import type { ReduxAction } from "actions/ReduxActionTypes";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type {
  ApplicationReleaseSnapshot,
  ReleasePreflightResponse,
} from "api/ApplicationReleasesAPI";
import { createReducer } from "utils/ReducerUtils";

export interface ApplicationReleaseState {
  loading: boolean;
  error: unknown;
  preflight: ReleasePreflightResponse | null;
  releases: ApplicationReleaseSnapshot[];
  activeReleaseId: string | null;
}

const initialState: ApplicationReleaseState = {
  loading: false,
  error: null,
  preflight: null,
  releases: [],
  activeReleaseId: null,
};

const withRelease = (
  releases: ApplicationReleaseSnapshot[],
  release: ApplicationReleaseSnapshot,
) => [
  release,
  ...releases.filter((item) => item.releaseId !== release.releaseId),
];

const applicationReleaseReducer = createReducer(initialState, {
  [ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_INIT]: (
    state: ApplicationReleaseState,
  ) => ({ ...state, loading: true, error: null, preflight: null }),
  [ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_SUCCESS]: (
    state: ApplicationReleaseState,
    action: ReduxAction<ReleasePreflightResponse>,
  ) => ({ ...state, loading: false, error: null, preflight: action.payload }),
  [ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_ERROR]: (
    state: ApplicationReleaseState,
    action: ReduxAction<unknown>,
  ) => ({ ...state, loading: false, error: action.payload, preflight: null }),
  [ReduxActionTypes.APPLICATION_RELEASE_CREATE_INIT]: (
    state: ApplicationReleaseState,
  ) => ({ ...state, loading: true, error: null }),
  [ReduxActionTypes.APPLICATION_RELEASE_CREATE_SUCCESS]: (
    state: ApplicationReleaseState,
    action: ReduxAction<ApplicationReleaseSnapshot>,
  ) => ({
    ...state,
    loading: false,
    error: null,
    releases: withRelease(state.releases, action.payload),
  }),
  [ReduxActionTypes.APPLICATION_RELEASE_CREATE_ERROR]: (
    state: ApplicationReleaseState,
    action: ReduxAction<unknown>,
  ) => ({ ...state, loading: false, error: action.payload }),
  [ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_INIT]: (
    state: ApplicationReleaseState,
  ) => ({ ...state, loading: true, error: null }),
  [ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_SUCCESS]: (
    state: ApplicationReleaseState,
    action: ReduxAction<ApplicationReleaseSnapshot>,
  ) => ({
    ...state,
    loading: false,
    error: null,
    releases: withRelease(state.releases, action.payload),
    activeReleaseId: action.payload.releaseId,
  }),
  [ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_ERROR]: (
    state: ApplicationReleaseState,
    action: ReduxAction<unknown>,
  ) => ({ ...state, loading: false, error: action.payload }),
  [ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_INIT]: (
    state: ApplicationReleaseState,
  ) => ({ ...state, loading: true, error: null }),
  [ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_SUCCESS]: (
    state: ApplicationReleaseState,
    action: ReduxAction<ApplicationReleaseSnapshot>,
  ) => ({
    ...state,
    loading: false,
    error: null,
    releases: withRelease(state.releases, action.payload),
    activeReleaseId: action.payload.releaseId,
  }),
  [ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_ERROR]: (
    state: ApplicationReleaseState,
    action: ReduxAction<unknown>,
  ) => ({ ...state, loading: false, error: action.payload }),
  [ReduxActionTypes.APPLICATION_RELEASE_LIST_INIT]: (
    state: ApplicationReleaseState,
  ) => ({ ...state, loading: true, error: null }),
  [ReduxActionTypes.APPLICATION_RELEASE_LIST_ERROR]: (
    state: ApplicationReleaseState,
    action: ReduxAction<unknown>,
  ) => ({ ...state, loading: false, error: action.payload }),
  [ReduxActionTypes.APPLICATION_RELEASE_ACTIVE_INIT]: (
    state: ApplicationReleaseState,
  ) => ({ ...state, loading: true, error: null }),
  [ReduxActionTypes.APPLICATION_RELEASE_ACTIVE_SUCCESS]: (
    state: ApplicationReleaseState,
    action: ReduxAction<ApplicationReleaseSnapshot>,
  ) => ({
    ...state,
    loading: false,
    error: null,
    activeReleaseId: action.payload.releaseId,
  }),
  [ReduxActionTypes.APPLICATION_RELEASE_ACTIVE_ERROR]: (
    state: ApplicationReleaseState,
    action: ReduxAction<unknown>,
  ) => ({ ...state, loading: false, error: action.payload }),
  [ReduxActionTypes.APPLICATION_RELEASE_LIST_SUCCESS]: (
    state: ApplicationReleaseState,
    action: ReduxAction<{
      releases: ApplicationReleaseSnapshot[];
      activeReleaseId?: string | null;
    }>,
  ) => ({
    ...state,
    loading: false,
    error: null,
    releases: action.payload.releases,
    activeReleaseId:
      action.payload.activeReleaseId === undefined
        ? state.activeReleaseId
        : action.payload.activeReleaseId,
  }),
});

export default applicationReleaseReducer;
