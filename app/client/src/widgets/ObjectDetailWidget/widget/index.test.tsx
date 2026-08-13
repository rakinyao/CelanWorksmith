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

const linkedSuppliers = [
  {
    id: "S001",
    typeId: "Supplier",
    properties: { name: "Acme Corp", riskLevel: "LOW" },
  },
  {
    id: "S002",
    typeId: "Supplier",
    properties: { name: "Beta Parts", riskLevel: "HIGH" },
  },
  {
    id: "DO001",
    typeId: "DeliveryOrder",
    properties: { status: "SHIPPED" },
  },
];

const buildSupplierLinkEntry = (status = "ready") => ({
  status,
  result: {
    typeId: "Supplier",
    offset: 0,
    limit: 100,
    total: linkedSuppliers.length,
    items: linkedSuppliers,
  },
});

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
      Supplier: {
        metadata: {
          id: "Supplier",
          displayName: "Approved supplier",
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
      "legacy/PurchaseOrder": { links, status: "ready" },
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
  it("uses stable Object Type and Object Instance controls", () => {
    const controls = ObjectDetailWidget.getPropertyPaneContentConfig()
      .flatMap((section) => section.children || [])
      .filter((control) =>
        ["objectTypeId", "objectData"].includes(control.propertyName),
      );

    expect(ObjectDetailWidget.getDefaults().mode).toBe("OBJECT");
    expect(controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          propertyName: "objectTypeId",
          controlType: "CELANWORKSMITH_OBJECT_TYPE",
        }),
        expect.objectContaining({
          propertyName: "objectData",
          validation: { type: "OBJECT" },
        }),
      ]),
    );
  });

  it("renders primary object Basic and Business properties immediately", () => {
    renderComponent();

    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("PO001")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    const businessGroup = screen.getByRole("heading", {
      name: "Business",
    }).parentElement;

    expect(businessGroup?.querySelector("dt")).toHaveTextContent("Supplier");
    expect(businessGroup?.querySelector("dd")).toHaveTextContent("Acme Corp");
    expect(screen.queryByText("Derived")).not.toBeInTheDocument();
  });

  it("passes the current application to metadata and prefetched Link requests", () => {
    const { store } = renderComponent(
      {},
      buildState({
        entities: { pageList: { applicationId: "app-1" } },
        celanworksmithLinks: {
          metadata: {
            "app-1/PurchaseOrder": { links, status: "ready" },
          },
          entries: {},
        },
      }),
    );

    expect(store.getActions()).toEqual(
      expect.arrayContaining([
        {
          type: "CELANWORKSMITH_LINK_LOAD_REQUESTED",
          payload: {
            typeId: "PurchaseOrder",
            objectId: "PO001",
            linkTypeId: "purchase-order-supplier",
            applicationId: "app-1",
            prefetch: true,
          },
        },
      ]),
    );
  });

  it("includes the current application in the Link metadata action meta", () => {
    const { store } = renderComponent(
      {},
      buildState({
        entities: { pageList: { applicationId: "app-1" } },
        celanworksmithLinks: {
          metadata: {
            "legacy/PurchaseOrder": { links: [], status: "idle" },
          },
          entries: {},
        },
      }),
    );

    expect(store.getActions()).toContainEqual({
      type: "CELANWORKSMITH_LINK_METADATA_LOAD_REQUESTED",
      payload: "PurchaseOrder",
      meta: { applicationId: "app-1" },
    });
  });

  it("shows an explicit state while Link metadata is loading", () => {
    renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: {
            "legacy/PurchaseOrder": { links: [], status: "loading" },
          },
          entries: {},
        },
      }),
    );

    expect(screen.getByText("Loading Link metadata...")).toBeInTheDocument();
  });

  it("selects the first remaining Link and clears selection after metadata changes", () => {
    const { rerender, updateWidgetMetaProperty } = renderComponent(
      {},
      buildState({
        entities: { pageList: { applicationId: "app-1" } },
        celanworksmithLinks: {
          metadata: {
            "app-1/PurchaseOrder": { links, status: "ready" },
          },
          entries: {},
        },
      }),
    );

    fireEvent.click(screen.getByRole("tab", { name: "Delivery" }));
    updateWidgetMetaProperty.mockClear();

    const nextStore = mockStore(
      buildState({
        entities: { pageList: { applicationId: "app-1" } },
        celanworksmithLinks: {
          metadata: {
            "app-1/PurchaseOrder": { links: [links[0]], status: "ready" },
          },
          entries: {},
        },
      }),
    );

    rerender(
      <Provider store={nextStore}>
        <ThemeProvider
          theme={{ ...theme, colors: { ...theme.colors, ...dark } }}
        >
          <ObjectDetailComponent
            displayMode="BUSINESS_ONLY"
            objectData={defaultObject}
            updateWidgetMetaProperty={updateWidgetMetaProperty}
            widgetId="ObjectDetail1"
          />
        </ThemeProvider>
      </Provider>,
    );

    expect(screen.getByRole("tab", { name: "Supplier" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByRole("tab", { name: "Delivery" }),
    ).not.toBeInTheDocument();
    expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
      "selectedLinkedObject",
      undefined,
    );
    expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
      "selectedLinkedObjectId",
      undefined,
    );
    expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
      "selectedLinkType",
      undefined,
    );
  });

  it("renders an empty state without requesting links", () => {
    const { store } = renderComponent({ objectData: undefined });

    expect(
      screen.getByText("Select an object to view its details."),
    ).toBeInTheDocument();
    expect(store.getActions()).toEqual([]);
  });

  it("renders an input error for invalid object data without requesting links", () => {
    const { store } = renderComponent({ objectData: { id: "PO001" } });

    expect(
      screen.getByText("Object data must include both id and typeId."),
    ).toBeInTheDocument();
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

    expect(
      screen.getByText("Object metadata is unavailable."),
    ).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("keeps primary properties visible for a scoped link error and retries only that link", () => {
    const { store } = renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { "legacy/PurchaseOrder": { links, status: "ready" } },
          entries: {
            "legacy/PurchaseOrder/PO001/purchase-order-delivery": {
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
        force: true,
      },
    });
  });

  it("keeps cached linked objects visible while a forced Link refresh is loading", () => {
    renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { "legacy/PurchaseOrder": { links, status: "ready" } },
          entries: {
            "legacy/PurchaseOrder/PO001/purchase-order-supplier": {
              status: "loading",
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

    expect(screen.getByText("Loading links...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /S001/ })).toBeInTheDocument();
  });

  it("prefetches only the first Link after metadata is ready", () => {
    const { store } = renderComponent();

    expect(store.getActions()).toContainEqual({
      type: "CELANWORKSMITH_LINK_LOAD_REQUESTED",
      payload: {
        typeId: "PurchaseOrder",
        objectId: "PO001",
        linkTypeId: "purchase-order-supplier",
        prefetch: true,
      },
    });
    expect(store.getActions()).not.toContainEqual({
      type: "CELANWORKSMITH_LINK_LOAD_REQUESTED",
      payload: expect.objectContaining({
        linkTypeId: "purchase-order-delivery",
      }),
    });
  });

  it("shows Link display name, target Object Type, and cardinality", () => {
    renderComponent();

    expect(screen.getByRole("tab", { name: "Supplier" })).toHaveTextContent(
      "Supplier",
    );
    expect(
      screen.getByText(/Approved supplier \(Supplier\)/),
    ).toBeInTheDocument();
    expect(screen.getByText("ONE")).toBeInTheDocument();
  });

  it("filters linked objects to the target type and searches IDs and properties", () => {
    renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { "legacy/PurchaseOrder": { links, status: "ready" } },
          entries: {
            "legacy/PurchaseOrder/PO001/purchase-order-supplier":
              buildSupplierLinkEntry(),
          },
        },
      }),
    );

    expect(screen.getByRole("button", { name: /S001/ })).toHaveTextContent(
      "Acme Corp",
    );
    expect(screen.getByRole("button", { name: /S002/ })).toHaveTextContent(
      "Beta Parts",
    );
    expect(
      screen.queryByRole("button", { name: /DO001/ }),
    ).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("textbox", { name: "Search linked objects" }),
      { target: { value: "beta" } },
    );

    expect(
      screen.queryByRole("button", { name: /S001/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /S002/ })).toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("textbox", { name: "Search linked objects" }),
      { target: { value: "S001" } },
    );

    expect(screen.getByRole("button", { name: /S001/ })).toBeInTheDocument();
  });

  it("uses the design-system input for linked object search", () => {
    renderComponent();

    expect(
      screen.getByRole("textbox", { name: "Search linked objects" }),
    ).toHaveClass("ads-v2-input__input-section-input");
  });

  it("shows a distinct permission state without offering Retry", () => {
    renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { "legacy/PurchaseOrder": { links, status: "ready" } },
          entries: {
            "legacy/PurchaseOrder/PO001/purchase-order-supplier": {
              status: "error",
              error: {
                code: "PERMISSION_DENIED",
                message: "Internal ACL details",
              },
            },
          },
        },
      }),
    );

    expect(
      screen.getByText(
        "You do not have permission to access these linked objects.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state when the active Link has no related objects", () => {
    renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { "legacy/PurchaseOrder": { links, status: "ready" } },
          entries: {
            "legacy/PurchaseOrder/PO001/purchase-order-supplier": {
              status: "empty",
              result: {
                typeId: "Supplier",
                offset: 0,
                limit: 100,
                total: 0,
                items: [],
              },
            },
          },
        },
      }),
    );

    expect(screen.getByText("No linked objects.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /S00/ }),
    ).not.toBeInTheDocument();
  });

  it("writes selected link outputs through Widget meta properties", () => {
    const { updateWidgetMetaProperty } = renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { "legacy/PurchaseOrder": { links, status: "ready" } },
          entries: {
            "legacy/PurchaseOrder/PO001/purchase-order-supplier": {
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

    fireEvent.click(screen.getByRole("button", { name: /S001/ }));

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
          metadata: { "legacy/PurchaseOrder": { links, status: "ready" } },
          entries: {
            "legacy/PurchaseOrder/PO001/purchase-order-supplier": {
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

    fireEvent.click(screen.getByRole("button", { name: /S001/ }));
    const callsAfterSelection = updateWidgetMetaProperty.mock.calls.length;

    rerender(
      <Provider store={mockStore(buildState())}>
        <ThemeProvider
          theme={{ ...theme, colors: { ...theme.colors, ...dark } }}
        >
          <ObjectDetailComponent
            displayMode="BUSINESS_ONLY"
            objectData={{
              ...defaultObject,
              properties: { ...defaultObject.properties },
            }}
            updateWidgetMetaProperty={updateWidgetMetaProperty}
            widgetId="ObjectDetail1"
          />
        </ThemeProvider>
      </Provider>,
    );

    expect(updateWidgetMetaProperty.mock.calls.length).toBe(
      callsAfterSelection,
    );
  });

  it("keeps the expanded Link, search, and selection during metadata refresh", () => {
    const readyState = buildState({
      celanworksmithLinks: {
        metadata: { "legacy/PurchaseOrder": { links, status: "ready" } },
        entries: {
          "legacy/PurchaseOrder/PO001/purchase-order-supplier":
            buildSupplierLinkEntry(),
        },
      },
    });
    const { rerender, updateWidgetMetaProperty } = renderComponent(
      {},
      readyState,
    );
    const search = screen.getByRole("textbox", {
      name: "Search linked objects",
    });

    fireEvent.change(search, { target: { value: "beta" } });
    fireEvent.click(screen.getByRole("button", { name: /S002/ }));
    const callsAfterSelection = updateWidgetMetaProperty.mock.calls.length;

    rerender(
      <Provider
        store={mockStore(
          buildState({
            celanworksmithLinks: {
              metadata: {
                "legacy/PurchaseOrder": {
                  links: [...links],
                  status: "loading",
                },
              },
              entries: {
                "legacy/PurchaseOrder/PO001/purchase-order-supplier":
                  buildSupplierLinkEntry("loading"),
              },
            },
          }),
        )}
      >
        <ThemeProvider
          theme={{ ...theme, colors: { ...theme.colors, ...dark } }}
        >
          <ObjectDetailComponent
            displayMode="BUSINESS_ONLY"
            objectData={defaultObject}
            updateWidgetMetaProperty={updateWidgetMetaProperty}
            widgetId="ObjectDetail1"
          />
        </ThemeProvider>
      </Provider>,
    );

    expect(screen.getByRole("tab", { name: "Supplier" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("textbox", { name: "Search linked objects" }),
    ).toHaveValue("beta");
    expect(screen.getByRole("button", { name: /S002/ })).toBeInTheDocument();
    expect(updateWidgetMetaProperty).toHaveBeenCalledTimes(callsAfterSelection);
  });

  it("clears linked selection when the bound object is removed", () => {
    const { rerender, store, updateWidgetMetaProperty } = renderComponent(
      {},
      buildState({
        celanworksmithLinks: {
          metadata: { "legacy/PurchaseOrder": { links, status: "ready" } },
          entries: {
            "legacy/PurchaseOrder/PO001/purchase-order-supplier": {
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

    fireEvent.click(screen.getByRole("button", { name: /S001/ }));
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

  it("rejects an instance whose type differs from the configured Object Type", () => {
    renderComponent({
      objectTypeId: "Supplier",
    } as never);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Object data does not match the configured Object Type.",
    );
  });
});
