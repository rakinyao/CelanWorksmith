import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { ThemeProvider } from "styled-components";
import { dark, theme } from "constants/DefaultTheme";
import FilterListComponent from "../component";
import FilterListWidget, { type FilterListWidgetProps } from ".";
import "@testing-library/jest-dom";

const mockStore = configureStore([]);
const metadata = {
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
  ],
};

const state = (
  typeState: Record<string, unknown> = {
    metadata,
    items: [],
    total: 0,
    offset: 0,
    limit: 100,
    status: "ready",
  },
) => ({
  celanworksmithObjects: {
    status:
      typeState.status === "loading" || typeState.status === "error"
        ? typeState.status
        : "ready",
    error: typeState.error,
    types: { PurchaseOrder: typeState },
  },
});

const renderComponent = (initialConditions = []) => {
  const store = mockStore(state());
  const updateWidgetMetaProperty = jest.fn();
  const view = render(
    <Provider store={store}>
      <ThemeProvider theme={{ ...theme, colors: { ...theme.colors, ...dark } }}>
        <FilterListComponent
          initialConditions={initialConditions}
          initialObjectTypeId="PurchaseOrder"
          updateWidgetMetaProperty={updateWidgetMetaProperty}
        />
      </ThemeProvider>
    </Provider>,
  );

  return { ...view, updateWidgetMetaProperty };
};

describe("FilterListComponent", () => {
  test("renders metadata loading and error states", () => {
    const loadingStore = mockStore(
      state({
        metadata: undefined,
        items: [],
        total: 0,
        offset: 0,
        limit: 100,
        status: "loading",
      }),
    );

    render(
      <Provider store={loadingStore}>
        <FilterListComponent updateWidgetMetaProperty={jest.fn()} />
      </Provider>,
    );
    expect(screen.getByText("Loading object metadata...")).toBeInTheDocument();

    const errorStore = mockStore(
      state({
        metadata: undefined,
        items: [],
        total: 0,
        offset: 0,
        limit: 100,
        status: "error",
        error: { code: "E", message: "Metadata failed" },
      }),
    );

    render(
      <Provider store={errorStore}>
        <FilterListComponent updateWidgetMetaProperty={jest.fn()} />
      </Provider>,
    );
    expect(screen.getByText("Metadata failed")).toBeInTheDocument();
  });

  test("emits structured output and reset clears local conditions", () => {
    const { updateWidgetMetaProperty } = renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    fireEvent.change(screen.getByLabelText("Property"), {
      target: { value: "supplierName" },
    });
    fireEvent.change(screen.getByLabelText("Operator"), {
      target: { value: "contains" },
    });
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "Acme" },
    });

    expect(updateWidgetMetaProperty).toHaveBeenCalledWith("filter", {
      typeId: "PurchaseOrder",
      conditions: [
        { propertyId: "supplierName", operator: "contains", value: "Acme" },
      ],
      version: 1,
    });
    expect(updateWidgetMetaProperty).toHaveBeenCalledWith("isValid", true);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(updateWidgetMetaProperty).toHaveBeenCalledWith("filter", {
      typeId: "PurchaseOrder",
      conditions: [],
      version: 1,
    });
  });

  test("syncs externally changed properties and metadata validity", () => {
    const updateWidgetMetaProperty = jest.fn();
    const view = render(
      <Provider store={mockStore(state())}>
        <FilterListComponent
          initialConditions={[
            { propertyId: "supplierName", operator: "equals", value: "Acme" },
          ]}
          initialObjectTypeId="PurchaseOrder"
          updateWidgetMetaProperty={updateWidgetMetaProperty}
        />
      </Provider>,
    );

    view.rerender(
      <Provider
        store={mockStore(
          state({
            metadata: undefined,
            items: [],
            total: 0,
            offset: 0,
            limit: 100,
            status: "ready",
          }),
        )}
      >
        <FilterListComponent
          initialConditions={[]}
          initialObjectTypeId=""
          updateWidgetMetaProperty={updateWidgetMetaProperty}
        />
      </Provider>,
    );

    expect(screen.getByLabelText("Object type")).toHaveValue("");
    expect(updateWidgetMetaProperty).toHaveBeenCalledWith("isValid", false);
  });
});

describe("FilterListWidget object binding", () => {
  test("defaults new widgets to Object mode while keeping legacy Query props", () => {
    expect(FilterListWidget.getDefaults().dataMode).toBe("OBJECT");

    const legacyWidget = new FilterListWidget({
      dataMode: "OBJECT",
      filter: { typeId: "PurchaseOrder", conditions: [], version: 1 },
      objectTypeId: "PurchaseOrder",
      updateWidgetMetaProperty: jest.fn(),
      widgetId: "FilterList1",
      widgetName: "FilterList1",
    } as unknown as FilterListWidgetProps);

    expect(legacyWidget.getWidgetView().props.initialObjectTypeId).toBe(
      "PurchaseOrder",
    );
  });

  test("uses the shared Object Type control only for Object mode", () => {
    const dataControls = FilterListWidget.getPropertyPaneContentConfig().find(
      (section) => section.sectionName === "Data",
    )?.children;
    const objectTypeControl = dataControls?.find(
      (control) => control.propertyName === "objectTypeId",
    );

    expect(objectTypeControl).toMatchObject({
      controlType: "CELANWORKSMITH_OBJECT_TYPE",
      dependencies: ["dataMode"],
    });
  });

  test("does not publish an Object metadata filter in Query mode", () => {
    const updateWidgetMetaProperty = jest.fn();
    const widget = new FilterListWidget({
      dataMode: "QUERY",
      filter: { typeId: "PurchaseOrder", conditions: [], version: 1 },
      objectTypeId: "PurchaseOrder",
      updateWidgetMetaProperty,
      widgetId: "FilterList1",
      widgetName: "FilterList1",
    } as unknown as FilterListWidgetProps);

    render(
      <Provider store={mockStore(state())}>{widget.getWidgetView()}</Provider>,
    );

    expect(updateWidgetMetaProperty).not.toHaveBeenCalled();
  });
});
