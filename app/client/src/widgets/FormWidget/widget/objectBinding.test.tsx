import { render, waitFor } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import { testStore } from "store";
import FormWidget, { ObjectFormMetadataPublisher } from ".";

const FORM_ID = "ObjectForm";
const INPUT_ID = "ObjectAmountInput";

test("propagates Redux Object metadata from Form to Input validity", async () => {
  const objectPropertyMetadata = {
    dataType: "INTEGER",
    derived: false,
    displayName: "Amount",
    id: "amount",
    readOnly: false,
    required: true,
  };
  const objectData = {
    id: "PO001",
    properties: { amount: "not-a-number" },
    typeId: "PurchaseOrder",
  };
  const store = testStore({
    celanworksmithObjects: {
      status: "ready",
      types: {
        PurchaseOrder: {
          items: [],
          limit: 100,
          metadata: {
            displayName: "Purchase order",
            id: "PurchaseOrder",
            properties: [objectPropertyMetadata],
          },
          offset: 0,
          status: "ready",
          total: 0,
        },
      },
    },
  } as never);
  store.dispatch({
    payload: {
      widgets: {
        [FORM_ID]: {
          parentId: "0",
          type: "FORM_WIDGET",
          widgetId: FORM_ID,
        },
        [INPUT_ID]: {
          dataMode: "OBJECT",
          displayPropertyId: "amount",
          inputType: "TEXT",
          parentId: FORM_ID,
          type: "INPUT_WIDGET",
          widgetId: INPUT_ID,
        },
      },
    },
    type: "UPDATE_LAYOUT",
  });
  expect(store.getState().celanworksmithObjects.types.PurchaseOrder).toMatchObject({
    metadata: { properties: [objectPropertyMetadata] },
  });
  expect(store.getState().entities.canvasWidgets[INPUT_ID]).toMatchObject({
    dataMode: "OBJECT",
    parentId: FORM_ID,
  });

  render(
    <Provider store={store}>
      <ObjectFormMetadataPublisher
        objectData={objectData}
        objectTypeId="PurchaseOrder"
        widgetId={FORM_ID}
      />
    </Provider>,
  );

  await waitFor(() => {
    expect(store.getState().entities.meta[INPUT_ID]).toMatchObject({
      objectPropertyMetadata: {
        dataType: "INTEGER",
        required: true,
      },
    });
  });

  const form = new FormWidget({
    formMode: "OBJECT",
    objectData,
    objectPropertiesMetadata: [objectPropertyMetadata],
  } as never);

  expect(
    form.checkInvalidChildren([
      {
        dataMode: "OBJECT",
        displayPropertyId: "amount",
        inputType: "TEXT",
        isDirty: false,
        objectData,
        objectPropertyMetadata:
          store.getState().entities.meta[INPUT_ID].objectPropertyMetadata,
        text: "",
        type: "INPUT_WIDGET",
        validation: true,
      },
    ] as never),
  ).toBe(true);
}, 30_000);
