import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import "@testing-library/jest-dom";
import ActionButtonComponent from "../component";

const mockStore = configureStore([]);
const action = {
  id: "update_schedule",
  displayName: "Update schedule",
  objectTypeId: "PurchaseOrder",
  parameters: [],
  requiresConfirmation: false,
};

const renderComponent = (execution = {}) => {
  const store = mockStore({
    celanworksmithOntology: {
      status: "ready",
      objectTypes: [],
      links: [],
      functions: [],
      actions: [action],
    },
    celanworksmithExecution: {
      functions: {},
      actions: execution,
      requests: {},
      functionCache: {},
      inputs: {},
    },
  });
  const updateWidgetMetaProperty = jest.fn();

  render(
    <Provider store={store}>
      <ActionButtonComponent
        actionId="update_schedule"
        label="Update schedule"
        objectData={{ id: "PO001", typeId: "PurchaseOrder" }}
        parameters={{ newScheduleDate: "2026-08-05" }}
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  return { store, updateWidgetMetaProperty };
};

describe("ActionButtonComponent", () => {
  test("dispatches the existing Action execution intent", () => {
    const { store } = renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "Update schedule" }));

    expect(store.getActions()[0]).toMatchObject({
      type: "CELANWORKSMITH_ACTION_RUN",
      payload: {
        actionId: "update_schedule",
        request: {
          objectTypeId: "PurchaseOrder",
          objectId: "PO001",
          parameters: { newScheduleDate: "2026-08-05" },
        },
      },
    });
  });

  test("does not display a failed execution before this widget runs", () => {
    renderComponent({
      update_schedule: {
        changedObjects: [],
        sideEffects: [],
        meta: {
          status: "failed",
          requestId: "request-1",
          parametersHash: "hash",
          error: { code: "UNKNOWN_ACTION", message: "Action failed" },
        },
      },
    });

    expect(screen.queryByText("Action failed")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("does not display another widget's execution state", () => {
    renderComponent({
      update_schedule: {
        changedObjects: [],
        sideEffects: [],
        meta: {
          status: "failed",
          requestId: "other-widget-request",
          parametersHash: "hash",
          error: { code: "UNKNOWN_ACTION", message: "Action failed" },
        },
      },
    });

    expect(screen.queryByText("Action failed")).not.toBeInTheDocument();
  });

  test("waits for explicit confirmation before dispatching a protected Action", () => {
    const store = mockStore({
      celanworksmithOntology: {
        status: "ready",
        objectTypes: [],
        links: [],
        functions: [],
        actions: [{ ...action, requiresConfirmation: true }],
      },
      celanworksmithExecution: {
        functions: {},
        actions: {},
        requests: {},
        functionCache: {},
        inputs: {},
      },
    });

    render(
      <Provider store={store}>
        <ActionButtonComponent
          actionId="update_schedule"
          label="Update schedule"
          objectData={{ id: "PO001", typeId: "PurchaseOrder" }}
          parameters={{ newScheduleDate: "2026-08-05" }}
          updateWidgetMetaProperty={jest.fn()}
        />
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update schedule" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Update schedule",
    );
    expect(store.getActions()).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(store.getActions()).toHaveLength(1);
    expect(store.getActions()[0]).toMatchObject({
      type: "CELANWORKSMITH_ACTION_RUN",
    });
  });

  test("dispatches the initial confirmation snapshot after its props change", () => {
    const store = mockStore({
      celanworksmithOntology: {
        status: "ready",
        objectTypes: [],
        links: [],
        functions: [],
        actions: [{ ...action, requiresConfirmation: true }],
      },
      celanworksmithExecution: {
        functions: {},
        actions: {},
        requests: {},
        functionCache: {},
        inputs: {},
      },
    });
    const updateWidgetMetaProperty = jest.fn();
    const { rerender } = render(
      <Provider store={store}>
        <ActionButtonComponent
          actionId="update_schedule"
          label="Update schedule"
          objectData={{ id: "PO001", typeId: "PurchaseOrder" }}
          parameters={{ priority: "HIGH" }}
          updateWidgetMetaProperty={updateWidgetMetaProperty}
        />
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update schedule" }));
    rerender(
      <Provider store={store}>
        <ActionButtonComponent
          actionId="update_schedule"
          label="Update schedule"
          objectData={{ id: "PO002", typeId: "PurchaseOrder" }}
          parameters={{ priority: "LOW" }}
          updateWidgetMetaProperty={updateWidgetMetaProperty}
        />
      </Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(store.getActions()[0]).toMatchObject({
      payload: {
        actionId: "update_schedule",
        request: {
          objectId: "PO001",
          parameters: { priority: "HIGH" },
        },
      },
    });
  });

  test("shows action progress and execution identifiers for its own request", () => {
    const store = mockStore({
      celanworksmithOntology: {
        status: "ready",
        objectTypes: [],
        links: [],
        functions: [],
        actions: [action],
      },
      celanworksmithExecution: {
        functions: {},
        actions: {},
        requests: {},
        functionCache: {},
        inputs: {},
      },
    });
    const updateWidgetMetaProperty = jest.fn();
    const view = render(
      <Provider store={store}>
        <ActionButtonComponent
          actionId="update_schedule"
          label="Update schedule"
          objectData={{ id: "PO001", typeId: "PurchaseOrder" }}
          parameters={{ newScheduleDate: "2026-08-05" }}
          updateWidgetMetaProperty={updateWidgetMetaProperty}
        />
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update schedule" }));
    const requestId = store.getActions()[0].payload.requestId;
    const completedStore = mockStore({
      celanworksmithOntology: {
        status: "ready",
        objectTypes: [],
        links: [],
        functions: [],
        actions: [action],
      },
      celanworksmithExecution: {
        functions: {},
        actions: {
          update_schedule: {
            data: { executionId: "execution-1" },
            changedObjects: [],
            sideEffects: [],
            meta: {
              status: "succeeded",
              progress: 100,
              requestId,
              executionId: "execution-1",
              parametersHash: "hash",
            },
          },
        },
        requests: {
          [requestId]: {
            requestId,
            kind: "action",
            entityId: "update_schedule",
            status: "succeeded",
            parametersHash: "hash",
          },
        },
        functionCache: {},
        inputs: {},
      },
    });

    view.rerender(
      <Provider store={completedStore}>
        <ActionButtonComponent
          actionId="update_schedule"
          label="Update schedule"
          objectData={{ id: "PO001", typeId: "PurchaseOrder" }}
          parameters={{ newScheduleDate: "2026-08-05" }}
          updateWidgetMetaProperty={updateWidgetMetaProperty}
        />
      </Provider>,
    );

    expect(screen.getByText(`Request ID: ${requestId}`)).toBeInTheDocument();
    expect(screen.getByText("Execution ID: execution-1")).toBeInTheDocument();
    expect(screen.getByText("Progress: 100%")).toBeInTheDocument();
  });
});
