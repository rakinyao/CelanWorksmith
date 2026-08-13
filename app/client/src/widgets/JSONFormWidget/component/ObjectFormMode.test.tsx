import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import "@testing-library/jest-dom";
import ObjectFormMode from "./ObjectFormMode";

const mockStore = configureStore([]);

const selectOption = async (label: string, optionName: string) => {
  const select = await screen.findByRole("combobox", { name: label });
  const selector = select.closest(".rc-select-selector");

  if (!selector) throw new Error(`Unable to open ${label}`);

  fireEvent.mouseDown(selector);
  fireEvent.click(await screen.findByRole("option", { name: optionName }));
};

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
    entities: { pageList: { applicationId: "app-1" } },
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
      applicationId: "app-1",
    },
  });
});

test("publishes Action failure feedback and progress for its submitted request", () => {
  const updateWidgetMetaProperty = jest.fn();
  const action = {
    id: "update_supplier",
    displayName: "Update supplier",
    objectTypeId: "Supplier",
    parameters: [],
    requiresConfirmation: false,
  };
  const metadata = {
    id: "Supplier",
    displayName: "Supplier",
    properties: [],
  };
  const initialStore = mockStore({
    celanworksmithObjects: {
      status: "ready",
      types: { Supplier: { status: "ready", metadata } },
    },
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
  const view = render(
    <Provider store={initialStore}>
      <ObjectFormMode
        actionId={action.id}
        objectData={{ id: "S001", typeId: "Supplier", properties: {} }}
        objectTypeId="Supplier"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  const requestId = initialStore.getActions()[0].payload.requestId;
  const failedStore = mockStore({
    celanworksmithObjects: {
      status: "ready",
      types: { Supplier: { status: "ready", metadata } },
    },
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
        [action.id]: {
          changedObjects: [],
          sideEffects: [],
          meta: {
            status: "failed",
            requestId,
            parametersHash: "hash",
            progress: 100,
            error: {
              code: "BUSINESS_REJECTED",
              message: "Supplier updates are locked.",
            },
          },
        },
      },
      requests: {
        [requestId]: {
          requestId,
          kind: "action",
          entityId: action.id,
          status: "failed",
          parametersHash: "hash",
          progress: 100,
          error: {
            code: "BUSINESS_REJECTED",
            message: "Supplier updates are locked.",
          },
        },
      },
      functionCache: {},
      inputs: {},
    },
  });

  view.rerender(
    <Provider store={failedStore}>
      <ObjectFormMode
        actionId={action.id}
        objectData={{ id: "S001", typeId: "Supplier", properties: {} }}
        objectTypeId="Supplier"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Action rejected: Supplier updates are locked.",
  );
  expect(screen.getByText(`Request ID: ${requestId}`)).toBeInTheDocument();
  expect(screen.getByText("Progress: 100%")).toBeInTheDocument();
  expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
    "executionProgress",
    100,
  );
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

  expect(store.getActions()).toHaveLength(0);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Object data does not match the configured Object Type.",
  );
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
                id: "amount",
                displayName: "Amount",
                dataType: "DECIMAL",
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
                enumValues: ["PENDING", "APPROVED"],
              },
              {
                id: "supplierId",
                displayName: "Supplier",
                dataType: "STRING",
                required: false,
                readOnly: false,
                derived: false,
                referenceTypeId: "Supplier",
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
            amount: 12.5,
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
  expect(screen.getByLabelText("Amount")).toHaveAttribute("type", "number");
  expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Supplier" })).toBeDisabled();
  expect(screen.getByLabelText("Delay days")).toBeDisabled();
  expect(screen.getByText("Unsupported data type: BINARY")).toBeInTheDocument();
});

test("selects a loaded related Object ID through reference metadata", async () => {
  const updateWidgetMetaProperty = jest.fn();
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
                id: "supplierId",
                displayName: "Supplier",
                dataType: "STRING",
                required: false,
                readOnly: false,
                derived: false,
                referenceTypeId: "Supplier",
              },
            ],
          },
        },
        Supplier: {
          status: "ready",
          metadata: { id: "Supplier", displayName: "Supplier", properties: [] },
          items: [
            {
              id: "S002",
              typeId: "Supplier",
              properties: { name: "Beta Parts" },
            },
          ],
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
          properties: { supplierId: "" },
        }}
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  await selectOption("Supplier", "S002");

  expect(updateWidgetMetaProperty).toHaveBeenCalledWith("formData", {
    supplierId: "S002",
  });
});

test("locates Object field validation errors and prevents Action submission", () => {
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
            ],
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
          parameters: [],
          requiresConfirmation: false,
        },
      ],
    },
    celanworksmithExecution: { actions: {}, requests: {} },
  });

  render(
    <Provider store={store}>
      <ObjectFormMode
        actionId="update_supplier"
        objectData={{
          id: "S001",
          typeId: "Supplier",
          properties: { name: "" },
        }}
        objectTypeId="Supplier"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Submit" }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Supplier.name is required.",
  );
  expect(store.getActions()).toEqual([]);
  expect(updateWidgetMetaProperty).toHaveBeenCalledWith("isValid", false);
});

test("renders Object form fields in metadata layout order and keeps hidden fields absent", () => {
  const store = mockStore({
    celanworksmithObjects: {
      status: "ready",
      types: {
        PurchaseOrder: {
          metadata: {
            id: "PurchaseOrder",
            displayName: "Purchase Order",
            properties: [
              {
                dataType: "STRING",
                derived: false,
                displayName: "Supplier",
                group: "Commercial",
                id: "supplierId",
                order: 20,
                readOnly: false,
                required: false,
              },
              {
                dataType: "DECIMAL",
                derived: false,
                displayName: "Amount",
                group: "Commercial",
                id: "amount",
                order: 10,
                readOnly: false,
                required: false,
              },
              {
                dataType: "STRING",
                derived: false,
                displayName: "Internal note",
                hidden: true,
                id: "internalNote",
                readOnly: false,
                required: false,
              },
              {
                dataType: "INTEGER",
                derived: true,
                displayName: "Delay days",
                group: "Commercial",
                id: "delayDays",
                order: 30,
                readOnly: false,
                required: false,
              },
            ],
          },
          status: "ready",
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
            amount: 12.5,
            delayDays: 3,
            internalNote: "not visible",
            supplierId: "S001",
          },
        }}
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={jest.fn()}
      />
    </Provider>,
  );

  expect(screen.getByText("Commercial")).toBeInTheDocument();
  expect(screen.queryByLabelText("Internal note")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Delay days")).toBeDisabled();
  expect(
    Array.from(document.querySelectorAll("input")).map((input) => input.name),
  ).toEqual(["amount", "supplierId", "delayDays"]);
});

test("renders loading, permission, and type mismatch Object form states distinctly", () => {
  const updateWidgetMetaProperty = jest.fn();
  const baseObject = {
    id: "PO001",
    typeId: "PurchaseOrder",
    properties: {},
  };
  const view = render(
    <Provider
      store={mockStore({
        celanworksmithObjects: {
          status: "loading",
          types: { PurchaseOrder: { status: "loading" } },
        },
        celanworksmithOntology: { actions: [] },
        celanworksmithExecution: { actions: {}, requests: {} },
      })}
    >
      <ObjectFormMode
        objectData={baseObject}
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  expect(
    screen.getByText("Loading Object Type metadata..."),
  ).toBeInTheDocument();

  view.rerender(
    <Provider
      store={mockStore({
        celanworksmithObjects: {
          status: "error",
          types: {
            PurchaseOrder: {
              status: "error",
              error: { code: "FORBIDDEN", message: "Denied" },
            },
          },
        },
        celanworksmithOntology: { actions: [] },
        celanworksmithExecution: { actions: {}, requests: {} },
      })}
    >
      <ObjectFormMode
        objectData={baseObject}
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Permission denied to access this Object Type.",
  );

  view.rerender(
    <Provider
      store={mockStore({
        celanworksmithObjects: {
          status: "error",
          types: {
            PurchaseOrder: {
              status: "error",
              error: {
                code: "BACKEND_ERROR",
                message: "Metadata unavailable.",
              },
            },
          },
        },
        celanworksmithOntology: { actions: [] },
        celanworksmithExecution: { actions: {}, requests: {} },
      })}
    >
      <ObjectFormMode
        objectData={baseObject}
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  expect(screen.getByRole("alert")).toHaveTextContent("Metadata unavailable.");

  view.rerender(
    <Provider
      store={mockStore({
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
        celanworksmithOntology: { actions: [] },
        celanworksmithExecution: { actions: {}, requests: {} },
      })}
    >
      <ObjectFormMode
        objectData={baseObject}
        objectTypeId="Supplier"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
      />
    </Provider>,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Object data does not match the configured Object Type.",
  );
});

test("renders a missing Object instance state and safe empty ENUM options", () => {
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
                id: "status",
                displayName: "Status",
                dataType: "ENUM",
                required: true,
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
  const view = render(
    <Provider store={store}>
      <ObjectFormMode
        objectData={undefined}
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={jest.fn()}
      />
    </Provider>,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Select an Object instance.",
  );

  view.rerender(
    <Provider store={store}>
      <ObjectFormMode
        objectData={{ id: "PO001", typeId: "PurchaseOrder", properties: {} }}
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={jest.fn()}
      />
    </Provider>,
  );

  expect(screen.getByRole("combobox", { name: "Status" })).toBeDisabled();
  expect(screen.getByText("No values available")).toBeInTheDocument();
});
