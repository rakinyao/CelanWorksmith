import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import Api from "api/Api";
import ApplicationReleasesAPI from "api/ApplicationReleasesAPI";
import {
  applicationReleaseActivateError,
  applicationReleaseRollbackInit,
} from "actions/applicationReleaseActions";
import applicationReleaseReducer, {
  type ApplicationReleaseState,
} from "reducers/uiReducers/applicationReleaseReducer";

jest.mock("api/Api", () => {
  class MockApi {
    static get = jest.fn();
    static post = jest.fn();
  }

  return { __esModule: true, default: MockApi };
});

const diagnostic = {
  severity: "BLOCKING",
  code: "MISSING_PROPERTY",
  path: "datasources.orders.properties.total",
  message: "The referenced property is unavailable.",
  details: { propertyId: "total" },
};

const initialState: ApplicationReleaseState = {
  loading: false,
  error: null,
  preflight: null,
  releases: [],
  activeReleaseId: null,
};

describe("application release reducer", () => {
  it("defines the complete release action constant contract", () => {
    expect([
      ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_INIT,
      ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_SUCCESS,
      ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_ERROR,
      ReduxActionTypes.APPLICATION_RELEASE_CREATE_INIT,
      ReduxActionTypes.APPLICATION_RELEASE_CREATE_SUCCESS,
      ReduxActionTypes.APPLICATION_RELEASE_CREATE_ERROR,
      ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_INIT,
      ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_SUCCESS,
      ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_ERROR,
      ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_INIT,
      ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_SUCCESS,
      ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_ERROR,
      ReduxActionTypes.APPLICATION_RELEASE_LIST_INIT,
      ReduxActionTypes.APPLICATION_RELEASE_LIST_ERROR,
      ReduxActionTypes.APPLICATION_RELEASE_ACTIVE_INIT,
      ReduxActionTypes.APPLICATION_RELEASE_ACTIVE_SUCCESS,
      ReduxActionTypes.APPLICATION_RELEASE_ACTIVE_ERROR,
      ReduxActionTypes.APPLICATION_RELEASE_LIST_SUCCESS,
    ]).toEqual([
      "APPLICATION_RELEASE_PREFLIGHT_INIT",
      "APPLICATION_RELEASE_PREFLIGHT_SUCCESS",
      "APPLICATION_RELEASE_PREFLIGHT_ERROR",
      "APPLICATION_RELEASE_CREATE_INIT",
      "APPLICATION_RELEASE_CREATE_SUCCESS",
      "APPLICATION_RELEASE_CREATE_ERROR",
      "APPLICATION_RELEASE_ACTIVATE_INIT",
      "APPLICATION_RELEASE_ACTIVATE_SUCCESS",
      "APPLICATION_RELEASE_ACTIVATE_ERROR",
      "APPLICATION_RELEASE_ROLLBACK_INIT",
      "APPLICATION_RELEASE_ROLLBACK_SUCCESS",
      "APPLICATION_RELEASE_ROLLBACK_ERROR",
      "APPLICATION_RELEASE_LIST_INIT",
      "APPLICATION_RELEASE_LIST_ERROR",
      "APPLICATION_RELEASE_ACTIVE_INIT",
      "APPLICATION_RELEASE_ACTIVE_SUCCESS",
      "APPLICATION_RELEASE_ACTIVE_ERROR",
      "APPLICATION_RELEASE_LIST_SUCCESS",
    ]);
  });

  it("preserves structured blocking diagnostics from preflight", () => {
    const state = applicationReleaseReducer(initialState, {
      type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_SUCCESS,
      payload: {
        applicationId: "app-1",
        baseRevisionId: "revision-1",
        valid: false,
        diagnostics: [diagnostic],
      },
    });

    expect(state.preflight?.diagnostics).toEqual([diagnostic]);
    expect(state.preflight?.diagnostics[0]).toHaveProperty(
      "severity",
      "BLOCKING",
    );
    expect(state.preflight?.diagnostics[0]).toHaveProperty(
      "code",
      "MISSING_PROPERTY",
    );
    expect(state.preflight?.diagnostics[0]).toHaveProperty(
      "path",
      "datasources.orders.properties.total",
    );
    expect(state.preflight?.diagnostics[0]).toHaveProperty("message");
    expect(state.preflight?.diagnostics[0]).toHaveProperty("details", {
      propertyId: "total",
    });
  });

  it("invalidates an old preflight when a refresh fails", () => {
    const validState = applicationReleaseReducer(initialState, {
      type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_SUCCESS,
      payload: {
        applicationId: "app-1",
        baseRevisionId: "revision-1",
        valid: true,
        diagnostics: [],
      },
    });
    const failedState = applicationReleaseReducer(validState, {
      type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_INIT,
    });
    const finalState = applicationReleaseReducer(failedState, {
      type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_ERROR,
      payload: { code: "RELEASE_REQUEST_FAILED" },
    });

    expect(finalState.preflight).toBeNull();
    expect(finalState.error).toEqual({ code: "RELEASE_REQUEST_FAILED" });
  });

  it("retains the old active release while activation is in progress", () => {
    const state = applicationReleaseReducer(
      { ...initialState, activeReleaseId: "release-old" },
      {
        type: ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_INIT,
        payload: { releaseId: "release-new" },
      },
    );

    expect(state.activeReleaseId).toBe("release-old");
    expect(state.loading).toBe(true);
  });

  it("ends activation loading with an error without replacing the active release", () => {
    const state = applicationReleaseReducer(
      { ...initialState, activeReleaseId: "release-old", loading: true },
      applicationReleaseActivateError({ code: "PROVIDER_UNAVAILABLE" }),
    );

    expect(state.loading).toBe(false);
    expect(state.error).toEqual({ code: "PROVIDER_UNAVAILABLE" });
    expect(state.activeReleaseId).toBe("release-old");
  });

  it("has a distinct rollback action contract", () => {
    expect(applicationReleaseRollbackInit("release-old")).toEqual({
      type: ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_INIT,
      payload: { releaseId: "release-old" },
    });
  });

  it("replaces release history on a successful list response", () => {
    const releases = [{ releaseId: "release-new", status: "SNAPSHOT_CREATED" }];

    const state = applicationReleaseReducer(
      {
        ...initialState,
        releases: [{ releaseId: "release-old" }],
        activeReleaseId: "release-old",
      },
      {
        type: ReduxActionTypes.APPLICATION_RELEASE_LIST_SUCCESS,
        payload: { releases, activeReleaseId: "release-new" },
      },
    );

    expect(state.releases).toBe(releases);
    expect(state.activeReleaseId).toBe("release-new");
    expect(state.releases).not.toContainEqual({ releaseId: "release-old" });
  });
});

describe("ApplicationReleasesAPI", () => {
  afterEach(() => jest.restoreAllMocks());

  it("uses the server paths, methods, and request bodies", async () => {
    const post = Api.post as jest.Mock;
    const get = Api.get as jest.Mock;

    post.mockResolvedValue({});
    get.mockResolvedValue({});

    await ApplicationReleasesAPI.preflight("app/1", { message: "check" });
    await ApplicationReleasesAPI.create("app/1", { message: "publish" });
    await ApplicationReleasesAPI.list("app/1");
    await ApplicationReleasesAPI.getActive("app/1");
    await ApplicationReleasesAPI.activate("app/1", "release/1");
    await ApplicationReleasesAPI.rollback("app/1", "release/1");

    expect(post).toHaveBeenNthCalledWith(
      1,
      "v1/celanworksmith/applications/app%2F1/releases/preflight",
      { message: "check" },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "v1/celanworksmith/applications/app%2F1/releases",
      { message: "publish" },
    );
    expect(get).toHaveBeenNthCalledWith(
      1,
      "v1/celanworksmith/applications/app%2F1/releases",
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      "v1/celanworksmith/applications/app%2F1/releases/active",
    );
    expect(post).toHaveBeenNthCalledWith(
      3,
      "v1/celanworksmith/applications/app%2F1/releases/release%2F1/activate",
    );
    expect(post).toHaveBeenNthCalledWith(
      4,
      "v1/celanworksmith/applications/app%2F1/releases/release%2F1/rollback",
    );
  });
});
