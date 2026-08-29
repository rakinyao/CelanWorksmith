import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { Response } from "./Response";
import { type Action } from "entities/Action";
import { PluginType } from "entities/Plugin";
import { lightTheme } from "selectors/themeSelectors";
import { ThemeProvider } from "styled-components";
import { BrowserRouter as Router } from "react-router-dom";
import { getIDETestState } from "test/factories/AppIDEFactoryUtils";
import { EditorTheme } from "components/editorComponents/CodeEditor/EditorConfig";
import type { ActionResponse } from "api/ActionAPI";
import i18n from "i18n";

const mockStore = configureStore([]);

const defaultProps = {
  action: {
    id: "test-action-id",
    name: "Test Action",
    actionConfiguration: { pluginSpecifiedTemplates: [{ value: true }] },
    userPermissions: ["execute"],
  } as Action,
  isRunning: false,
  onRunClick: jest.fn(),
  theme: EditorTheme.LIGHT,
  isRunDisabled: false,
  responseTabHeight: 200,
};

// mock the postrunactionmap
jest.mock("ee/PluginActionEditor/components/PostActionRun", () => ({
  PostRunActionComponentMap: {
    test_modal: () => <div data-testid="t--post-run-action-test-modal-form" />,
  },
}));

jest.mock("../ResponseFormatTabs", () => ({
  ResponseFormatTabs: () => <div />,
}));

const storeData = getIDETestState({});

describe("Response", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;

  beforeEach(() => {
    store = mockStore(storeData);
    jest.clearAllMocks();
  });

  /** Test use prepared statement warning **/
  it("1. Prepared statement warning should not be showing", () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Router>
            <Response {...defaultProps} />
          </Router>
        </ThemeProvider>
      </Provider>,
    );

    // Check if the prepared statement warning is not showing
    expect(
      container.querySelector("[data-testid='t--prepared-statement-warning']"),
    ).toBeNull();
  });

  it("2. Check if prepared statement warning is not showing while running the query", () => {
    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Router>
            <Response {...defaultProps} isRunning />
          </Router>
        </ThemeProvider>
      </Provider>,
    );

    // Check if the prepared statement warning is showing
    expect(
      container.querySelector("[data-testid='t--prepared-statement-warning']"),
    ).toBeNull();
  });

  it("3. Check if prepared statement warning is not showing when run is successful", () => {
    store = mockStore({
      ...storeData,
      entities: {
        ...storeData.entities,
        actions: [
          {
            config: {
              id: "test-action-id",
              name: "Test Action",
            },
            isLoading: false,
            data: {
              body: [{ key: "value" }],
              isExecutionSuccess: true,
            },
          },
        ],
      },
    });

    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Router>
            <Response {...defaultProps} />
          </Router>
        </ThemeProvider>
      </Provider>,
    );

    // Check if the prepared statement warning is showing
    expect(
      container.querySelector("[data-testid='t--prepared-statement-warning']"),
    ).toBeNull();
  });

  it("4. Check if prepared statement warning is showing when run is failed", () => {
    store = mockStore({
      ...storeData,
      entities: {
        ...storeData.entities,
        actions: [
          {
            config: {
              id: "test-action-id",
              name: "Test Action",
            },
            isLoading: false,
            data: {
              body: "ERROR: relation 'userssss' does not exist Position: 15",
              isExecutionSuccess: false,
            },
          },
        ],
      },
    });

    const props = {
      ...defaultProps,
      action: {
        ...defaultProps.action,
        pluginType: PluginType.DB,
      } as Action,
      actionResponse: {
        isExecutionSuccess: false,
        readableError: "ERROR: relation 'userssss' does not exist Position: 15",
      } as ActionResponse,
    };

    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Router>
            <Response {...props} />
          </Router>
        </ThemeProvider>
      </Provider>,
    );

    // Check if the prepared statement warning is showing
    expect(
      container.querySelector("[data-testid='t--prepared-statement-warning']"),
    ).not.toBeNull();
  });

  it("5. Check if prepared statement warning is not showing when prepared statement is turned off", () => {
    store = mockStore({
      ...storeData,
      entities: {
        ...storeData.entities,
        actions: [
          {
            config: {
              id: "test-action-id",
              name: "Test Action",
            },
            isLoading: false,
            data: {
              body: "ERROR: relation 'userssss' does not exist Position: 15",
              isExecutionSuccess: false,
            },
          },
        ],
      },
    });

    const props = {
      ...defaultProps,
      action: {
        ...defaultProps.action,
        pluginType: PluginType.DB,
        actionConfiguration: { pluginSpecifiedTemplates: [{ value: false }] },
      } as Action,
      actionResponse: {
        isExecutionSuccess: false,
        readableError: "ERROR: relation 'userssss' does not exist Position: 15",
      } as ActionResponse,
    };

    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Router>
            <Response {...props} />
          </Router>
        </ThemeProvider>
      </Provider>,
    );

    // Check if the prepared statement warning is showing
    expect(
      container.querySelector("[data-testid='t--prepared-statement-warning']"),
    ).toBeNull();
  });

  it("6. Should show post run action container when post run action exists", () => {
    const postRunAction = {
      type: "FORM",
      name: "test_modal",
    };
    const actionResponse = {
      isExecutionSuccess: true,
      body: [{ key: "value" }],
      postRunAction,
      dataTypes: [{ dataType: "JSON" }],
      responseDisplayFormat: "JSON",
    } as unknown as ActionResponse;

    store = mockStore({
      ...storeData,
      entities: {
        ...storeData.entities,
        actions: [
          {
            config: {
              id: "test-action-id",
              name: "Test Action",
            },
            isLoading: false,
            data: actionResponse,
          },
        ],
      },
    });

    const props = {
      ...defaultProps,
      actionResponse,
      currentContentType: "JSON",
    };

    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Router>
            <Response {...props} />
          </Router>
        </ThemeProvider>
      </Provider>,
    );

    // Check if post run action container is showing
    expect(getByTestId("t--post-run-action-container")).not.toBeNull();
    expect(getByTestId("t--post-run-action-test-modal-form")).not.toBeNull();
  });

  it("7. Should not show post run action container when post run action doesn't exist", () => {
    const actionResponse = {
      isExecutionSuccess: true,
      body: [{ key: "value" }],
      dataTypes: [{ dataType: "JSON" }],
      responseDisplayFormat: "JSON",
    } as unknown as ActionResponse;

    store = mockStore({
      ...storeData,
      entities: {
        ...storeData.entities,
        actions: [
          {
            config: {
              id: "test-action-id",
              name: "Test Action",
            },
            isLoading: false,
            data: actionResponse,
          },
        ],
      },
    });

    const props = {
      ...defaultProps,
      actionResponse,
    };

    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Router>
            <Response {...props} />
          </Router>
        </ThemeProvider>
      </Provider>,
    );

    // Check if post run action container is not showing
    expect(
      container.querySelector("[data-testid='t--post-run-action-container']"),
    ).toBeNull();
  });

  it("8. Should not show post run action container when correct mapping is not found", () => {
    const postRunAction = {
      type: "FORM",
      name: "invalid_modal",
    };
    const actionResponse = {
      isExecutionSuccess: true,
      body: [{ key: "value" }],
      postRunAction,
      dataTypes: [{ dataType: "JSON" }],
      responseDisplayFormat: "JSON",
    } as unknown as ActionResponse;

    store = mockStore({
      ...storeData,
      entities: {
        ...storeData.entities,
        actions: [
          {
            config: {
              id: "test-action-id",
              name: "Test Action",
            },
            isLoading: false,
            data: actionResponse,
          },
        ],
      },
    });

    const props = {
      ...defaultProps,
      actionResponse,
    };

    const { container } = render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Router>
            <Response {...props} />
          </Router>
        </ThemeProvider>
      </Provider>,
    );

    // Check if post run action container is not showing
    expect(
      container.querySelector("[data-testid='t--post-run-action-container']"),
    ).toBeNull();
  });

  it("shows a successful zero-valued response instead of the empty response state", () => {
    const actionResponse = {
      body: 0,
      dataTypes: [{ dataType: "JSON" }],
      isExecutionSuccess: true,
      responseDisplayFormat: "JSON",
    } as unknown as ActionResponse;

    const { getByTestId, queryByAltText } = render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Router>
            <Response {...defaultProps} actionResponse={actionResponse} />
          </Router>
        </ThemeProvider>
      </Provider>,
    );

    expect(getByTestId("t--response-data-container")).not.toBeNull();
    expect(queryByAltText("no-response-yet")).toBeNull();
  });

  it.each([
    ["en-US", "Time to run: 1.2s", "Response size: 3.5kb", "Status: 200"],
    ["zh-CN", "运行耗时: 1.2s", "响应大小: 3.5kb", "状态: 200"],
  ])(
    "renders localized response status tooltip chrome in %s",
    async (locale, duration, size, status) => {
      await i18n.changeLanguage(locale);
      const actionResponse = {
        body: [{ key: "value" }],
        dataTypes: [{ dataType: "JSON" }],
        duration: 1200,
        isExecutionSuccess: true,
        responseDisplayFormat: "JSON",
        size: 3500,
        statusCode: 200,
      } as unknown as ActionResponse;

      const { getByTestId } = render(
        <Provider store={store}>
          <ThemeProvider theme={lightTheme}>
            <Router>
              <Response {...defaultProps} actionResponse={actionResponse} />
            </Router>
          </ThemeProvider>
        </Provider>,
      );

      fireEvent.mouseEnter(getByTestId("t--response-status-info"));
      expect(await screen.findByText(duration)).toBeTruthy();
      expect(screen.getByText(size)).toBeTruthy();
      expect(screen.getByText(status)).toBeTruthy();
    },
  );

  it.each([
    [
      "en-US",
      "An unexpected error occurred",
      "Error",
      "Request has failed to execute",
    ],
    ["zh-CN", "发生意外错误", "错误", "请求执行失败"],
  ])(
    "renders the localized unexpected error chrome in %s",
    async (locale, expected, errorLabel, requestFailedLabel) => {
      await i18n.changeLanguage(locale);
      const actionResponse = {
        body: "backend detail that must not be translated",
        isExecutionSuccess: false,
      } as ActionResponse;

      render(
        <Provider store={store}>
          <ThemeProvider theme={lightTheme}>
            <Router>
              <Response {...defaultProps} actionResponse={actionResponse} />
            </Router>
          </ThemeProvider>
        </Provider>,
      );

      expect(screen.getByTestId("t--response-error").textContent).toBe(
        expected,
      );
      expect(screen.getByText(errorLabel)).toBeTruthy();
      expect(
        screen.getByText(requestFailedLabel, { exact: false }),
      ).toBeTruthy();
    },
  );

  it.each([
    ["en-US", "2 records"],
    ["zh-CN", "2 条记录"],
  ])("renders localized record counts in %s", async (locale, expected) => {
    await i18n.changeLanguage(locale);
    const actionResponse = {
      body: [{ key: "one" }, { key: "two" }],
      dataTypes: [{ dataType: "JSON" }],
      isExecutionSuccess: true,
      responseDisplayFormat: "JSON",
    } as unknown as ActionResponse;
    const action = {
      ...defaultProps.action,
      pluginType: PluginType.DB,
    } as Action;

    const { getByTestId } = render(
      <Provider store={store}>
        <ThemeProvider theme={lightTheme}>
          <Router>
            <Response
              {...defaultProps}
              action={action}
              actionResponse={actionResponse}
            />
          </Router>
        </ThemeProvider>
      </Provider>,
    );

    expect(getByTestId("t--response-record-count").textContent).toBe(expected);
  });

  it.each(["en-US", "zh-CN"])(
    "keeps backend errors verbatim when the current locale is %s",
    async (locale) => {
      await i18n.changeLanguage(locale);
      const backendError = "queryResponse.unexpectedError";
      const actionResponse = {
        body: backendError,
        isExecutionSuccess: false,
      } as ActionResponse;
      const action = {
        ...defaultProps.action,
        pluginType: PluginType.DB,
      } as Action;

      render(
        <Provider store={store}>
          <ThemeProvider theme={lightTheme}>
            <Router>
              <Response
                {...defaultProps}
                action={action}
                actionResponse={actionResponse}
              />
            </Router>
          </ThemeProvider>
        </Provider>,
      );

      expect(screen.getByTestId("t--response-error").textContent).toBe(
        backendError,
      );
    },
  );
});
