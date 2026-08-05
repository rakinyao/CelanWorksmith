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
