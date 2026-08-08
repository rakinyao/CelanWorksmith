import { render, screen } from "@testing-library/react";
import ObjectCollectionMode from "celanworksmith/widgets/objectBinding/ObjectCollectionMode";
import { dark, theme } from "constants/DefaultTheme";
import ListWidget, { type ListWidgetProps } from ".";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { ThemeProvider } from "styled-components";

const objectSetState = {
  celanworksmithObjects: {
    status: "ready",
    types: {
      Supplier: {
        metadata: {
          id: "Supplier",
          displayName: "Supplier",
          properties: [],
        },
        status: "ready",
      },
    },
  },
  celanworksmithObjectQueries: {
    entries: {
      'List1/Supplier/{"limit":100,"offset":0}': {
        request: {
          widgetId: "List1",
          typeId: "Supplier",
          query: { limit: 100, offset: 0 },
        },
        status: "ready",
        result: {
          typeId: "Supplier",
          items: [
            {
              id: "supplier-acme",
              typeId: "Supplier",
              properties: { supplierName: "Acme" },
            },
          ],
          offset: 0,
          limit: 100,
          total: 1,
        },
      },
    },
  },
};

test("List defaults to Object mode and keeps a legacy Query list native", () => {
  const queryProps = {
    listData: [{ id: "legacy" }],
    updateWidgetMetaProperty: jest.fn(),
    widgetId: "List1",
    widgetName: "List1",
  };

  expect(ListWidget.getDefaults().dataMode).toBe("OBJECT");
  expect(
    new ListWidget(
      queryProps as unknown as ListWidgetProps<never>,
    ).getWidgetView().type,
  ).not.toBe(ObjectCollectionMode);
  expect(
    new ListWidget({
      ...queryProps,
      dataMode: "OBJECT",
    } as unknown as ListWidgetProps<never>).getWidgetView().type,
  ).toBe(ObjectCollectionMode);
});

test("List renders ObjectSet rows through its native view and selects the stable ID", () => {
  const updateWidgetMetaProperty = jest.fn();
  const widget = new ListWidget({
    backgroundColor: "transparent",
    borderRadius: "0px",
    componentHeight: 400,
    componentWidth: 600,
    dataMode: "OBJECT",
    objectTypeId: "Supplier",
    pageSize: 1,
    renderMode: "PAGE",
    updateWidgetMetaProperty,
    widgetId: "List1",
    widgetName: "List1",
  } as unknown as ListWidgetProps<never>);

  render(
    React.createElement(
      Provider,
      { store: configureStore()({ ...objectSetState }) },
      React.createElement(
        ThemeProvider,
        { theme: { ...theme, colors: { ...theme.colors, ...dark } } },
        widget.getWidgetView(),
      ),
    ),
  );

  expect(screen.queryByRole("button", { name: /supplierName/i })).toBeNull();

  widget.onItemClick(0, undefined);

  expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
    "selectedItem",
    expect.objectContaining({ id: "supplier-acme" }),
  );
});
