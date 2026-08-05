import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import "@testing-library/jest-dom";
import ObjectTableMode from "./ObjectTableMode";
import { getObjectQueryKey } from "reducers/celanworksmithObjectQueryReducer";

const mockStore = configureStore([]);
const request = {
  widgetId: "Table1",
  typeId: "PurchaseOrder",
  query: { offset: 0, limit: 10 },
};

test("renders metadata columns and emits the standard selected object", () => {
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
                id: "status",
                displayName: "Order status",
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
    celanworksmithObjectQueries: {
      entries: {
        [getObjectQueryKey(request)]: {
          request,
          status: "ready",
          result: {
            typeId: "PurchaseOrder",
            items: [
              {
                id: "PO001",
                typeId: "PurchaseOrder",
                properties: { status: "DELAYED" },
              },
            ],
            offset: 0,
            limit: 10,
            total: 1,
          },
        },
      },
    },
  });

  render(
    <Provider store={store}>
      <ObjectTableMode
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
        widgetId="Table1"
      />
    </Provider>,
  );

  expect(screen.getByText("Order status")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "PO001" }));
  expect(updateWidgetMetaProperty).toHaveBeenCalledWith("selectedObject", {
    id: "PO001",
    typeId: "PurchaseOrder",
    properties: { status: "DELAYED" },
  });
});
