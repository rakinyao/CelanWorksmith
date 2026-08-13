import React from "react";
import { fireEvent, render } from "test/testUtils";
import CelanworksmithApplicationBindingPanel from "./CelanworksmithApplicationBindingPanel";
import { celanworksmithApplicationBindingSaveRequest } from "actions/celanworksmithApplicationBindingActions";

const dispatch = jest.fn();
const state = {
  status: "unbound",
  applicationId: "app-1",
  binding: null,
  projects: [
    {
      projectId: "celanworksmith-demo",
      version: "1.0.0",
      schemaVersion: 1,
      objectTypeCount: 2,
      linkTypeCount: 1,
      functionCount: 1,
      actionCount: 1,
    },
  ],
  versions: [],
  error: undefined as { code: string; message: string } | undefined,
};

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => dispatch,
  useSelector: (selector: (value: unknown) => unknown) =>
    selector({
      celanworksmithApplicationBinding: state,
    }),
}));

describe("CelanworksmithApplicationBindingPanel", () => {
  beforeEach(() => {
    dispatch.mockClear();
    state.status = "unbound";
    state.binding = null;
    state.error = undefined;
  });

  it("saves the selected project and version", () => {
    const view = render(
      <CelanworksmithApplicationBindingPanel applicationId="app-1" />,
    );

    fireEvent.change(view.getByTestId("t--celanworksmith-binding-project"), {
      target: { value: "celanworksmith-demo:1.0.0" },
    });
    fireEvent.click(view.getByText("Bind / 绑定"));

    expect(dispatch).toHaveBeenCalledWith(
      celanworksmithApplicationBindingSaveRequest("app-1", {
        projectId: "celanworksmith-demo",
        projectVersion: "1.0.0",
        providerId: "mongodb-readonly",
      }),
    );
  });

  it("shows a retry action on binding errors", () => {
    state.status = "error";
    state.error = { code: "BINDING_ERROR", message: "Load failed" };
    const view = render(
      <CelanworksmithApplicationBindingPanel applicationId="app-1" />,
    );

    fireEvent.click(view.getByText("Retry / 重试"));

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { applicationId: "app-1" },
      }),
    );
  });

  it("shows safe binding diagnostics and copies the stable binding key", async () => {
    state.status = "ready";
    state.binding = {
      applicationId: "app-1",
      projectId: "celanworksmith-demo",
      projectVersion: "1.0.0",
      providerId: "mongodb-readonly",
    };
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });

    const view = render(
      <CelanworksmithApplicationBindingPanel
        applicationId="app-1"
        objectTypeIds={["PurchaseOrder"]}
      />,
    );

    expect(view.getByTestId("t--celanworksmith-debug-panel")).toBeTruthy();
    expect(view.getByText("celanworksmith-demo / 1.0.0")).toBeTruthy();
    expect(view.getByText("mongodb-readonly")).toBeTruthy();
    expect(view.getByText("PurchaseOrder")).toBeTruthy();
    expect(view.queryByText(/mongodb:\/\//i)).toBeNull();

    fireEvent.click(view.getByTestId("t--celanworksmith-debug-copy"));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "app-1|celanworksmith-demo|1.0.0|mongodb-readonly",
    );
  });

  it("retries a single binding node from the debug panel", () => {
    state.status = "ready";
    state.binding = {
      applicationId: "app-1",
      projectId: "celanworksmith-demo",
      projectVersion: "1.0.0",
      providerId: "mongodb-readonly",
    };

    const view = render(
      <CelanworksmithApplicationBindingPanel applicationId="app-1" />,
    );

    fireEvent.click(view.getByTestId("t--celanworksmith-debug-retry"));

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { applicationId: "app-1" },
      }),
    );
  });

  it("uses the metadata retry callback for debug retries", () => {
    const onDebugRetry = jest.fn();

    state.status = "ready";
    state.binding = {
      applicationId: "app-1",
      projectId: "celanworksmith-demo",
      projectVersion: "1.0.0",
      providerId: "mongodb-readonly",
    };

    const view = render(
      <CelanworksmithApplicationBindingPanel
        applicationId="app-1"
        onDebugRetry={onDebugRetry}
      />,
    );

    fireEvent.click(view.getByTestId("t--celanworksmith-debug-retry"));

    expect(onDebugRetry).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("clears the runtime cache from the debug panel", () => {
    const onClearCache = jest.fn();

    state.status = "ready";
    state.binding = {
      applicationId: "app-1",
      projectId: "celanworksmith-demo",
      projectVersion: "1.0.0",
      providerId: "mongodb-readonly",
    };

    const view = render(
      <CelanworksmithApplicationBindingPanel
        applicationId="app-1"
        onClearCache={onClearCache}
      />,
    );

    fireEvent.click(view.getByTestId("t--celanworksmith-debug-clear-cache"));

    expect(onClearCache).toHaveBeenCalledTimes(1);
  });

  it("does not expose or copy a sensitive binding key", () => {
    state.status = "ready";
    state.binding = {
      applicationId: "app-1",
      projectId: "celanworksmith-demo",
      projectVersion: "1.0.0",
      providerId: "token/secret-provider",
    };

    const view = render(
      <CelanworksmithApplicationBindingPanel applicationId="app-1" />,
    );

    expect(view.getAllByText("[redacted]").length).toBeGreaterThan(0);
    expect(view.queryByTestId("t--celanworksmith-debug-copy")).toBeNull();
  });
});
