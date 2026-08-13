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

  it("shows the bound project and version in ready state", () => {
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

    expect(view.getByText(/celanworksmith-demo/)).toBeTruthy();
    expect(view.getByText(/1.0.0/)).toBeTruthy();
  });

  it("calls the cache clear callback when provided", () => {
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

    expect(view.queryByText("Clear cache / 清除缓存")).toBeNull();
    fireEvent.click(view.getByText("Developer tools / 开发工具"));
    fireEvent.click(view.getByText("Clear cache / 清除缓存"));

    expect(onClearCache).toHaveBeenCalledTimes(1);
  });

  it("uses the metadata retry callback when provided", () => {
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

    expect(view.queryByText("Retry / 重试")).toBeNull();
    fireEvent.click(view.getByText("Developer tools / 开发工具"));
    fireEvent.click(view.getByText("Retry / 重试"));

    expect(onDebugRetry).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
