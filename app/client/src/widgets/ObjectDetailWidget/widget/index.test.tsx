import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { ThemeProvider } from "styled-components";
import { dark, theme } from "constants/DefaultTheme";
import type { CelanworksmithLinkType } from "api/CelanworksmithAPI";
import ObjectDetailWidget from ".";
import ObjectDetailComponent from "../component";

import "@testing-library/jest-dom";

const mockStore = configureStore([]);

const purchaseOrderMetadata = {
  id: "PurchaseOrder",
  displayName: "Purchase order",
  properties: [
    {
      id: "supplierName",
      displayName: "Supplier",
      dataType: "STRING",
      required: false,
      readOnly: false,
      derived: false,
    },
    {
      id: "delayDays",
      displayName: "Delay days",
      dataType: "NUMBER",
      required: false,
      readOnly: true,
      derived: true,
    },
  ],
};

const links: CelanworksmithLinkType[] = [
  {
    id: "purchase-order-supplier",
    displayName: "Supplier",
    sourceTypeId: "PurchaseOrder",
    targetTypeId: "Supplier",
    cardinality: "ONE",
  },
  {
    id: "purchase-order-delivery",
    displayName: "Delivery",
    sourceTypeId: "PurchaseOrder",
    targetTypeId: "DeliveryOrder",
    cardinality: "MANY",
  },
];

const defaultObject = {
  id: "PO001",
  typeId: "PurchaseOrder",
  properties: {
    supplierName: "Acme Corp",
    delayDays: 3,
  },
};

const buildState = (overrides: Record<string, unknown> = {}) => ({
  celanworksmithObjects: {
    status: "ready",
    types: {
      PurchaseOrder: {
        metadata: purchaseOrderMetadata,
        items: [],
        total: 0,
        offset: 0,
        limit: 100,
        status: "ready",
      },
    },
  },
  celanworksmithLinks: {
    metadata: {
      PurchaseOrder: { links, status: "ready" },
    },
    entries: {},
  },
  ...overrides,
});

const renderComponent = (
  props: Partial<React.ComponentProps<typeof ObjectDetailComponent>> = {},
  state = buildState(),
) => {
  const store = mockStore(state);
  const updateWidgetMetaProperty = jest.fn();

  const view = render(
    <Provider store={store}>
      <ThemeProvider theme={{ ...theme, colors: { ...theme.colors, ...dark } }}>
        <ObjectDetailComponent
          displayMode="BUSINESS_ONLY"
          objectData={defaultObject}
          updateWidgetMetaProperty={updateWidgetMetaProperty}
          widgetId="ObjectDetail1"
          {...props}
        />
      </ThemeProvider>
    </Provider>,
  );

  return { ...view, store, updateWidgetMetaProperty };
};

describe("ObjectDetailWidget", () => {
  it("renders primary object Basic and Business properties immediately", () => {
    renderComponent();

    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("PO001")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.queryByText("Derived")).not.toBeInTheDocument();
  });

  it("renders an empty state without requesting links", () => {
    const { store } = renderComponent({ objectData: undefined });

    expect(screen.getByText("Select an object to view its details.")).toBeInTheDocument();
    expect(store.getActions()).toEqual([]);
  });

  it("renders an input error for invalid object data without requesting links", () => {
    const { store } = renderComponent({ objectData: { id: "PO001" } });

    expect(screen.getByText("Object data must include both id and typeId.")).toBeInTheDocument();
    expect(store.getActions()).toEqual([]);
  });

  it("falls back to runtime fields when object metadata is unavailable", () => {
    renderComponent(
      {
        displayMode: "ALL_METADATA",
        objectData: { id: "PO001", typeId: "PurchaseOrder", priority: "HIGH" },
      },
      buildState({
        celanworksmithObjects: { status: "ready", types: {} },
      }),
    );

    expect(screen.getByText("Object metadata is unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("keeps primary properties visible for a scoped link error and retries only that link", () => {
    const { store } = renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { PurchaseOrder: { links, status: "ready" } },
          entries: {
            "PurchaseOrder/PO001/purchase-order-delivery": {
              status: "error",
              error: { code: "NETWORK_ERROR", message: "Unavailable" },
            },
          },
        },
      }),
    );

    fireEvent.click(screen.getByRole("tab", { name: "Delivery" }));

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(store.getActions()).toContainEqual({
      type: "CELANWORKSMITH_LINK_LOAD_REQUESTED",
      payload: {
        typeId: "PurchaseOrder",
        objectId: "PO001",
        linkTypeId: "purchase-order-delivery",
      },
    });
  });

  it("writes selected link outputs through Widget meta properties", () => {
    const { updateWidgetMetaProperty } = renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { PurchaseOrder: { links, status: "ready" } },
          entries: {
            "PurchaseOrder/PO001/purchase-order-supplier": {
              status: "ready",
              result: {
                typeId: "Supplier",
                offset: 0,
                limit: 100,
                total: 1,
                items: [
                  {
                    id: "S001",
                    typeId: "Supplier",
                    properties: { name: "Acme Corp" },
                  },
                ],
              },
            },
          },
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "S001" }));

    expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
      "selectedLinkedObject",
      expect.objectContaining({ id: "S001", typeId: "Supplier" }),
    );
    expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
      "selectedLinkedObjectId",
      "S001",
    );
    expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
      "selectedLinkType",
      "purchase-order-supplier",
    );
  });

  it("keeps linked selection when the same object identity is refreshed", () => {
    const { rerender, updateWidgetMetaProperty } = renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { PurchaseOrder: { links, status: "ready" } },
          entries: {
            "PurchaseOrder/PO001/purchase-order-supplier": {
              status: "ready",
              result: {
                typeId: "Supplier",
                offset: 0,
                limit: 100,
                total: 1,
                items: [
                  {
                    id: "S001",
                    typeId: "Supplier",
                    properties: { name: "Acme Corp" },
                  },
                ],
              },
            },
          },
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "S001" }));
    const callsAfterSelection = updateWidgetMetaProperty.mock.calls.length;

    rerender(
      <Provider store={mockStore(buildState())}>
        <ThemeProvider
          theme={{ ...theme, colors: { ...theme.colors, ...dark } }}
        >
          <ObjectDetailComponent
            displayMode="BUSINESS_ONLY"
            objectData={{ ...defaultObject, properties: { ...defaultObject.properties } }}
            updateWidgetMetaProperty={updateWidgetMetaProperty}
            widgetId="ObjectDetail1"
          />
        </ThemeProvider>
      </Provider>,
    );

    expect(updateWidgetMetaProperty.mock.calls.length).toBe(callsAfterSelection);
  });

  it("clears linked selection when the bound object is removed", () => {
    const { rerender, store, updateWidgetMetaProperty } = renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { PurchaseOrder: { links, status: "ready" } },
          entries: {
            "PurchaseOrder/PO001/purchase-order-supplier": {
              status: "ready",
              result: {
                typeId: "Supplier",
                offset: 0,
                limit: 100,
                total: 1,
                items: [
                  {
                    id: "S001",
                    typeId: "Supplier",
                    properties: { name: "Acme Corp" },
                  },
                ],
              },
            },
          },
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "S001" }));
    rerender(
      <Provider store={store}>
        <ThemeProvider
          theme={{ ...theme, colors: { ...theme.colors, ...dark } }}
        >
          <ObjectDetailComponent
            displayMode="BUSINESS_ONLY"
            objectData={undefined}
            updateWidgetMetaProperty={updateWidgetMetaProperty}
            widgetId="ObjectDetail1"
          />
        </ThemeProvider>
      </Provider>,
    );

    expect(updateWidgetMetaProperty).toHaveBeenLastCalledWith(
      "selectedLinkType",
      undefined,
    );
  });

  it("declares linked selection meta and autocomplete outputs", () => {
    expect(ObjectDetailWidget.getMetaPropertiesMap()).toMatchObject({
      selectedLinkedObject: undefined,
      selectedLinkedObjectId: undefined,
      selectedLinkType: undefined,
    });
    expect(ObjectDetailWidget.getAutocompleteDefinitions()).toMatchObject({
      selectedLinkedObject: "?",
      selectedLinkedObjectId: "string",
      selectedLinkType: "string",
    });
  });
});
