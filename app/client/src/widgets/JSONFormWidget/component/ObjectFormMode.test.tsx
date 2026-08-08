import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import "@testing-library/jest-dom";
import ObjectFormMode from "./ObjectFormMode";

const mockStore = configureStore([]);

test("generates metadata fields and submits changed values through T5", () => {
  const updateWidgetMetaProperty = jest.fn();
  const store = mockStore({
    celanworksmithObjects: {
      status: "ready",
      types: {
        Supplier: {
          status: "ready",
          metadata: {
            id: "Supplier",
            displayName: "Supplier",
            properties: [
              {
                id: "name",
                displayName: "Supplier name",
                dataType: "STRING",
                required: true,
                readOnly: false,
                derived: false,
              },
              {
                id: "riskLevel",
                displayName: "Risk level",
                dataType: "STRING",
                required: false,
                readOnly: true,
                derived: false,
              },
            ],
          },
        },
      },
    },
    celanworksmithOntology: {
      status: "ready",
      objectTypes: [],
      links: [],
      functions: [],
      actions: [
        {
          id: "update_supplier",
          displayName: "Update supplier",
          objectTypeId: "Supplier",
          parameters: [],
          requiresConfirmation: false,
        },
      ],
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
      <ObjectFormMode
        actionId="update_supplier"
        objectData={{
          id: "S001",
          typeId: "Supplier",
          properties: { name: "Old name", riskLevel: "HIGH" },
        }}
        objectTypeId="Supplier"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  const nameInput = screen.getByLabelText("Supplier name");

  expect(nameInput).toHaveValue("Old name");
  expect(screen.getByLabelText("Risk level")).toBeDisabled();
  fireEvent.change(nameInput, { target: { value: "New name" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  expect(store.getActions()[0]).toMatchObject({
    type: "CELANWORKSMITH_ACTION_RUN",
    payload: {
      actionId: "update_supplier",
      request: {
        objectTypeId: "Supplier",
        objectId: "S001",
        parameters: { name: "New name", riskLevel: "HIGH" },
      },
    },
  });
});

test("resets local values when the bound object identity changes", () => {
  const updateWidgetMetaProperty = jest.fn();
  const store = mockStore({
    celanworksmithObjects: {
      status: "ready",
      types: {
        Supplier: {
          status: "ready",
          metadata: {
            id: "Supplier",
            displayName: "Supplier",
            properties: [
              {
                id: "name",
                displayName: "Supplier name",
                dataType: "STRING",
                required: false,
                readOnly: false,
                derived: false,
              },
            ],
          },
        },
      },
    },
    celanworksmithOntology: { actions: [] },
    celanworksmithExecution: { actions: {} },
  });
  const view = render(
    <Provider store={store}>
      <ObjectFormMode
        objectData={{
          id: "S001",
          typeId: "Supplier",
          properties: { name: "First" },
        }}
        objectTypeId="Supplier"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  fireEvent.change(screen.getByLabelText("Supplier name"), {
    target: { value: "Local edit" },
  });
  view.rerender(
    <Provider store={store}>
      <ObjectFormMode
        objectData={{
          id: "S002",
          typeId: "Supplier",
          properties: { name: "Second" },
        }}
        objectTypeId="Supplier"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  expect(screen.getByLabelText("Supplier name")).toHaveValue("Second");
});

test("rejects an object binding whose type differs from the configured type", () => {
  const updateWidgetMetaProperty = jest.fn();
  const store = mockStore({
    celanworksmithObjects: {
      status: "ready",
      types: {
        Supplier: {
          status: "ready",
          metadata: {
            id: "Supplier",
            displayName: "Supplier",
            properties: [],
          },
        },
      },
    },
    celanworksmithOntology: {
      actions: [
        {
          id: "update_supplier",
          displayName: "Update supplier",
          objectTypeId: "Supplier",
        },
      ],
    },
    celanworksmithExecution: { actions: {} },
  });

  render(
    <Provider store={store}>
      <ObjectFormMode
        actionId="update_supplier"
        objectData={{ id: "P001", typeId: "PurchaseOrder", properties: {} }}
        objectTypeId="Supplier"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  expect(store.getActions()).toHaveLength(0);
  expect(updateWidgetMetaProperty).toHaveBeenCalledWith("isValid", false);
});

test("does not carry a prior object's success state to a new object", () => {
  const updateWidgetMetaProperty = jest.fn();
  const store = mockStore({
    celanworksmithObjects: {
      types: {
        Supplier: {
          metadata: {
            id: "Supplier",
            displayName: "Supplier",
            properties: [],
          },
        },
      },
    },
    celanworksmithOntology: { actions: [] },
    celanworksmithExecution: {
      actions: {
        update_supplier: {
          data: { executionId: "execution-1" },
          changedObjects: [],
          sideEffects: [],
          meta: {
            status: "succeeded",
            requestId: "request-1",
            parametersHash: "hash",
          },
        },
      },
      requests: {
        "request-1": { status: "succeeded", requestId: "request-1" },
      },
    },
  });
  const view = render(
    <Provider store={store}>
      <ObjectFormMode
        actionId="update_supplier"
        objectData={{ id: "S001", typeId: "Supplier", properties: {} }}
        objectTypeId="Supplier"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  updateWidgetMetaProperty.mockClear();
  view.rerender(
    <Provider store={store}>
      <ObjectFormMode
        actionId="update_supplier"
        objectData={{ id: "S002", typeId: "Supplier", properties: {} }}
        objectTypeId="Supplier"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
    "executionStatus",
    "idle",
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("maps supported metadata types and reports unsupported fields", () => {
  const store = mockStore({
    celanworksmithObjects: {
      status: "ready",
      types: {
        PurchaseOrder: {
          status: "ready",
          metadata: {
            id: "PurchaseOrder",
            displayName: "Purchase order",
            properties: [
              {
                id: "approved",
                displayName: "Approved",
                dataType: "BOOLEAN",
                required: true,
                readOnly: false,
                derived: false,
              },
              {
                id: "deliveryAt",
                displayName: "Delivery at",
                dataType: "DATETIME",
                required: false,
                readOnly: false,
                derived: false,
              },
              {
                id: "status",
                displayName: "Status",
                dataType: "ENUM",
                required: true,
                readOnly: false,
                derived: false,
              },
              {
                id: "supplierId",
                displayName: "Supplier",
                dataType: "REFERENCE",
                required: false,
                readOnly: false,
                derived: false,
              },
              {
                id: "delayDays",
                displayName: "Delay days",
                dataType: "INTEGER",
                required: false,
                readOnly: true,
                derived: true,
              },
              {
                id: "attachment",
                displayName: "Attachment",
                dataType: "BINARY",
                required: false,
                readOnly: false,
                derived: false,
              },
            ],
          },
        },
      },
    },
    celanworksmithOntology: { actions: [] },
    celanworksmithExecution: { actions: {}, requests: {} },
  });

  render(
    <Provider store={store}>
      <ObjectFormMode
        objectData={{
          id: "PO001",
          typeId: "PurchaseOrder",
          properties: {
            approved: true,
            deliveryAt: "2026-08-08T09:30",
            status: "PENDING",
            supplierId: "S001",
            delayDays: 3,
          },
        }}
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={jest.fn()}
      />
    </Provider>,
  );

  expect(screen.getByLabelText("Approved")).toHaveAttribute("type", "checkbox");
  expect(screen.getByLabelText("Delivery at")).toHaveAttribute(
    "type",
    "datetime-local",
  );
  expect(screen.getByLabelText("Status").tagName).toBe("SELECT");
  expect(screen.getByLabelText("Supplier")).toHaveAttribute("type", "text");
  expect(screen.getByLabelText("Delay days")).toBeDisabled();
  expect(screen.getByText("Unsupported data type: BINARY")).toBeInTheDocument();
});
