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

  test("shows failed execution without claiming success", () => {
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

    expect(screen.getByRole("alert")).toHaveTextContent("Action failed");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
