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

test("clears selection when the object query changes", () => {
  const updateWidgetMetaProperty = jest.fn();
  const store = mockStore({
    celanworksmithObjects: {
      status: "ready",
      types: {
        PurchaseOrder: {
          status: "ready",
          metadata: { id: "PurchaseOrder", properties: [] },
        },
      },
    },
    celanworksmithObjectQueries: { entries: {} },
  });
  const view = render(
    <Provider store={store}>
      <ObjectTableMode
        objectTypeId="PurchaseOrder"
        pageNo={1}
        selectedRowIndex={0}
        updateWidgetMetaProperty={updateWidgetMetaProperty}
        widgetId="Table1"
      />
    </Provider>,
  );

  updateWidgetMetaProperty.mockClear();
  view.rerender(
    <Provider store={store}>
      <ObjectTableMode
        objectTypeId="PurchaseOrder"
        pageNo={2}
        selectedRowIndex={0}
        updateWidgetMetaProperty={updateWidgetMetaProperty}
        widgetId="Table1"
      />
    </Provider>,
  );

  expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
    "selectedObject",
    undefined,
  );
  expect(updateWidgetMetaProperty).toHaveBeenCalledWith("selectedObjects", []);
  expect(updateWidgetMetaProperty).toHaveBeenCalledWith("selectedRowIndex", -1);
});

test("clears selection when the object query is removed", () => {
  const updateWidgetMetaProperty = jest.fn();
  const store = mockStore({
    celanworksmithObjects: {
      types: {
        PurchaseOrder: {
          metadata: { id: "PurchaseOrder", properties: [] },
        },
      },
    },
    celanworksmithObjectQueries: { entries: {} },
  });
  const view = render(
    <Provider store={store}>
      <ObjectTableMode
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
        widgetId="Table1"
      />
    </Provider>,
  );

  updateWidgetMetaProperty.mockClear();
  view.rerender(
    <Provider store={store}>
      <ObjectTableMode
        updateWidgetMetaProperty={updateWidgetMetaProperty}
        widgetId="Table1"
      />
    </Provider>,
  );

  expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
    "selectedObject",
    undefined,
  );
  expect(updateWidgetMetaProperty).toHaveBeenCalledWith("selectedObjects", []);
  expect(updateWidgetMetaProperty).toHaveBeenCalledWith("selectedRowIndex", -1);
});

test("keeps selection while an equivalent structured filter is refreshed", () => {
  const updateWidgetMetaProperty = jest.fn();
  const store = mockStore({
    celanworksmithObjects: {
      status: "ready",
      types: {
        PurchaseOrder: {
          status: "ready",
          metadata: { id: "PurchaseOrder", properties: [] },
        },
      },
    },
    celanworksmithObjectQueries: { entries: {} },
  });
  const filter = { conditions: [], typeId: "PurchaseOrder", version: 1 };
  const view = render(
    <Provider store={store}>
      <ObjectTableMode
        objectFilter={filter}
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
        widgetId="Table1"
      />
    </Provider>,
  );

  updateWidgetMetaProperty.mockClear();
  view.rerender(
    <Provider store={store}>
      <ObjectTableMode
        objectFilter={{ ...filter }}
        objectTypeId="PurchaseOrder"
        updateWidgetMetaProperty={updateWidgetMetaProperty}
        widgetId="Table1"
      />
    </Provider>,
  );

  expect(updateWidgetMetaProperty).not.toHaveBeenCalledWith(
    "selectedObject",
    undefined,
  );
  expect(updateWidgetMetaProperty).not.toHaveBeenCalledWith(
    "selectedObjects",
    [],
  );
});

test("normalizes a structured FilterList output before requesting object rows", () => {
  const filter = { conditions: [], typeId: "PurchaseOrder", version: 1 };
  const store = mockStore({
    celanworksmithObjects: {
      status: "ready",
      types: {
        PurchaseOrder: {
          status: "ready",
          metadata: { id: "PurchaseOrder", properties: [] },
        },
      },
    },
    celanworksmithObjectQueries: { entries: {} },
  });

  render(
    <Provider store={store}>
      <ObjectTableMode
        objectFilter={filter}
        updateWidgetMetaProperty={jest.fn()}
        widgetId="Table1"
      />
    </Provider>,
  );

  expect(store.getActions()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          query: expect.objectContaining({ filter }),
          typeId: "PurchaseOrder",
        }),
      }),
    ]),
  );
});

test("shows distinct missing, metadata, loading, empty, and error states", () => {
  const renderObjectTable = (state: Record<string, unknown>, typeId?: string) =>
    render(
      <Provider store={mockStore(state)}>
        <ObjectTableMode
          objectTypeId={typeId}
          updateWidgetMetaProperty={jest.fn()}
          widgetId="Table1"
        />
      </Provider>,
    );

  const missing = renderObjectTable({
    celanworksmithObjects: { status: "ready", types: {} },
    celanworksmithObjectQueries: { entries: {} },
  });

  expect(
    missing.getByText("Select an ontology object collection."),
  ).toBeInTheDocument();
  missing.unmount();

  const mismatch = renderObjectTable(
    {
      celanworksmithObjects: { status: "ready", types: {} },
      celanworksmithObjectQueries: { entries: {} },
    },
    "DeletedType",
  );

  expect(mismatch.getByRole("alert")).toHaveTextContent(
    "The selected ontology object type is unavailable.",
  );
  mismatch.unmount();

  const loading = renderObjectTable(
    {
      celanworksmithObjects: {
        status: "loading",
        types: { PurchaseOrder: { status: "loading" } },
      },
      celanworksmithObjectQueries: { entries: {} },
    },
    "PurchaseOrder",
  );

  expect(loading.getByText("Loading object metadata...")).toBeInTheDocument();
  loading.unmount();

  const emptyRequest = {
    widgetId: "Table1",
    typeId: "PurchaseOrder",
    query: { offset: 0, limit: 10 },
  };
  const empty = renderObjectTable(
    {
      celanworksmithObjects: {
        status: "ready",
        types: {
          PurchaseOrder: {
            status: "ready",
            metadata: { id: "PurchaseOrder", properties: [] },
          },
        },
      },
      celanworksmithObjectQueries: {
        entries: {
          [getObjectQueryKey(emptyRequest)]: {
            request: emptyRequest,
            status: "ready",
            result: {
              typeId: "PurchaseOrder",
              items: [],
              offset: 0,
              limit: 10,
              total: 0,
            },
          },
        },
      },
    },
    "PurchaseOrder",
  );

  expect(empty.getByText("No objects found.")).toBeInTheDocument();
  empty.unmount();

  const failed = renderObjectTable(
    {
      celanworksmithObjects: {
        status: "ready",
        types: {
          PurchaseOrder: {
            status: "ready",
            metadata: { id: "PurchaseOrder", properties: [] },
          },
        },
      },
      celanworksmithObjectQueries: {
        entries: {
          [getObjectQueryKey(emptyRequest)]: {
            request: emptyRequest,
            status: "error",
            error: { message: "Object query failed" },
          },
        },
      },
    },
    "PurchaseOrder",
  );

  expect(failed.getByRole("alert")).toHaveTextContent("Object query failed");
});
