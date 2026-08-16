import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ApplicationReleasesAPI from "api/ApplicationReleasesAPI";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { useDispatch, useSelector } from "react-redux";
import ApplicationReleasePanel from ".";

jest.mock("api/ApplicationReleasesAPI", () => ({
  __esModule: true,
  default: {
    activate: jest.fn(),
    create: jest.fn(),
    getActive: jest.fn(),
    list: jest.fn(),
    preflight: jest.fn(),
    rollback: jest.fn(),
  },
}));

jest.mock("react-redux", () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "release.severity.BLOCKING": "Blocking",
        "release.severity.INFO": "Info",
        "release.statusLabel": "Status",
        "release.status.SNAPSHOT_CREATED": "Snapshot created",
      })[key] || key,
  }),
}));

const dispatch = jest.fn();
const useSelectorMock = useSelector as jest.Mock;
const api = ApplicationReleasesAPI as jest.Mocked<
  typeof ApplicationReleasesAPI
>;

const preflight = {
  applicationId: "app-1",
  baseRevisionId: "revision-1",
  valid: true,
  diagnostics: [],
};

const release = {
  releaseId: "release-2",
  applicationId: "app-1",
  workspaceId: "workspace-1",
  baseRevisionId: "revision-2",
  releaseSchemaVersion: "1",
  createdBy: "user-1",
  createdAt: "2026-08-15T10:00:00Z",
  contentDigest: "sha256:1234567890abcdef",
  applicationContent: {},
  datasourcePins: [],
  diagnostics: [],
  status: "SNAPSHOT_CREATED",
};

const response = <T,>(data: T, success = true, status = 200) => ({
  responseMeta: {
    status,
    success,
    ...(success ? {} : { error: { code: "RELEASE_REQUEST_FAILED" } }),
  },
  data,
});

const renderPanel = (applicationRelease = {}, onPublish = jest.fn()) => {
  useSelectorMock.mockImplementation((selector: (state: unknown) => unknown) =>
    selector({
      ui: {
        applicationRelease: {
          loading: false,
          error: null,
          preflight: null,
          releases: [],
          activeReleaseId: null,
          ...applicationRelease,
        },
      },
    }),
  );

  return {
    onPublish,
    ...render(
      <ApplicationReleasePanel
        applicationId="app-1"
        isOpen
        onClose={jest.fn()}
        onPublish={onPublish}
      />,
    ),
  };
};

describe("ApplicationReleasePanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDispatch as jest.Mock).mockReturnValue(dispatch);
    api.preflight.mockResolvedValue(response(preflight) as never);
    api.list.mockResolvedValue(response([release]) as never);
    api.getActive.mockResolvedValue(response(release) as never);
    api.create.mockResolvedValue(response(release) as never);
    api.activate.mockResolvedValue(response(release) as never);
    api.rollback.mockResolvedValue(response(release) as never);
  });

  it("loads preflight and history on open and dispatches success actions", async () => {
    renderPanel();

    await waitFor(() => expect(api.preflight).toHaveBeenCalledWith("app-1"));
    expect(api.list).toHaveBeenCalledWith("app-1");
    expect(api.getActive).toHaveBeenCalledWith("app-1");
    expect(dispatch).toHaveBeenCalledWith({
      type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_SUCCESS,
      payload: preflight,
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: ReduxActionTypes.APPLICATION_RELEASE_LIST_SUCCESS,
      payload: { releases: [release], activeReleaseId: "release-2" },
    });
  });

  it("refreshes preflight and history through the same request chain", async () => {
    renderPanel();
    await waitFor(() => expect(api.preflight).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "release.preflight" }));

    await waitFor(() => expect(api.preflight).toHaveBeenCalledTimes(2));
    expect(api.list).toHaveBeenCalledTimes(2);
    expect(api.getActive).toHaveBeenCalledTimes(2);
  });

  it("dispatches a preflight error and exposes the request failure state", async () => {
    const error = new Error("preflight failed");

    api.preflight.mockRejectedValueOnce(error);

    renderPanel();

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({
        type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_ERROR,
        payload: error,
      }),
    );
  });

  it("treats a fulfilled unsuccessful ApiResponse as a preflight error", async () => {
    const failure = response(
      {
        applicationId: "app-1",
        baseRevisionId: null,
        valid: false,
        diagnostics: [],
      },
      false,
      422,
    );

    api.preflight.mockResolvedValueOnce(failure as never);

    renderPanel();

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_ERROR,
        }),
      ),
    );
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: ReduxActionTypes.APPLICATION_RELEASE_PREFLIGHT_SUCCESS,
        payload: undefined,
      }),
    );
  });

  it("renders the reducer request failure state", async () => {
    renderPanel({ error: new Error("request failed") });

    expect(await screen.findByText("release.requestFailed")).toBeTruthy();
  });

  it("renders the release status label as text", async () => {
    renderPanel({ preflight, releases: [release] });

    expect(await screen.findByText("Status: Snapshot created")).toBeTruthy();
  });

  it("creates a release through the API without invoking native publish", async () => {
    const onPublish = jest.fn();

    renderPanel({ preflight }, onPublish);
    await waitFor(() => expect(api.getActive).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "release.create" }));

    await waitFor(() => expect(api.create).toHaveBeenCalledWith("app-1"));
    expect(dispatch).toHaveBeenCalledWith({
      type: ReduxActionTypes.APPLICATION_RELEASE_CREATE_SUCCESS,
      payload: release,
    });
    expect(onPublish).not.toHaveBeenCalled();
  });

  it("calls the activate endpoint for history activation", async () => {
    renderPanel({ preflight, releases: [release] });
    await waitFor(() => expect(api.getActive).toHaveBeenCalled());

    fireEvent.click(
      screen.getAllByRole("button", { name: "release.activate" })[0],
    );

    await waitFor(() =>
      expect(api.activate).toHaveBeenCalledWith("app-1", "release-2"),
    );
    expect(api.rollback).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      type: ReduxActionTypes.APPLICATION_RELEASE_ACTIVATE_SUCCESS,
      payload: release,
    });
  });

  it("calls the rollback endpoint and dispatches rollback actions", async () => {
    renderPanel({ preflight, releases: [release] });
    await waitFor(() => expect(api.getActive).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "release.rollback" }));

    await waitFor(() =>
      expect(api.rollback).toHaveBeenCalledWith("app-1", "release-2"),
    );
    expect(api.activate).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      type: ReduxActionTypes.APPLICATION_RELEASE_ROLLBACK_SUCCESS,
      payload: release,
    });
  });

  it("gates history commands and native publish until warnings are acknowledged", async () => {
    const onPublish = jest.fn();

    renderPanel(
      {
        preflight: {
          ...preflight,
          diagnostics: [
            {
              severity: "WARNING",
              code: "STALE_PROVIDER",
              path: "datasources.orders",
              message: "The provider is stale.",
              details: {},
            },
          ],
        },
        releases: [release],
      },
      onPublish,
    );
    await waitFor(() => expect(api.getActive).toHaveBeenCalled());

    expect(
      screen.getAllByRole("button", { name: "release.activate" })[0],
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: "release.rollback" }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: "release.publish" }),
    ).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "release.publish" }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it("does not block INFO diagnostics and maps severity and status through i18n", async () => {
    renderPanel({
      preflight: {
        ...preflight,
        diagnostics: [
          {
            severity: "INFO",
            code: "NOTICE",
            path: "application",
            message: "Informational notice.",
            details: {},
          },
        ],
      },
      releases: [release],
    });
    await waitFor(() => expect(api.getActive).toHaveBeenCalled());

    expect(screen.getByText("Info")).toBeTruthy();
    expect(screen.getByText(/Snapshot created/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "release.publish" }),
    ).toHaveProperty("disabled", false);
  });

  it("renders loading, empty, error, and success states from reducer data", async () => {
    const { rerender } = renderPanel({ loading: true });

    expect(screen.getByText("release.loading")).toBeTruthy();
    await waitFor(() => expect(api.getActive).toHaveBeenCalled());

    useSelectorMock.mockImplementation(
      (selector: (state: unknown) => unknown) =>
        selector({
          ui: {
            applicationRelease: {
              loading: false,
              error: null,
              preflight: null,
              releases: [],
              activeReleaseId: null,
            },
          },
        }),
    );

    rerender(
      <ApplicationReleasePanel
        applicationId="app-1"
        isOpen
        onClose={jest.fn()}
        onPublish={jest.fn()}
      />,
    );
    expect(screen.getByText("release.empty")).toBeTruthy();
  });
});
