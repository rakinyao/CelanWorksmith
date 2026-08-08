import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ObjectCollectionMode from "celanworksmith/widgets/objectBinding/ObjectCollectionMode";
import { dark, theme } from "constants/DefaultTheme";
import ListWidget, { type ListWidgetProps } from ".";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { ThemeProvider } from "styled-components";

jest.mock("layoutSystems/CanvasFactory", () => {
  const React = jest.requireActual("react");

  const collectInteractiveRows = (node: Record<string, unknown>) => {
    const rows: Array<Record<string, unknown>> = [];
    const children = (node.children || []) as Array<Record<string, unknown>>;

    if (node.onClickCapture) rows.push(node);

    children.forEach((child) => rows.push(...collectInteractiveRows(child)));

    return rows;
  };

  return {
    renderAppsmithCanvas: (props: Record<string, unknown>) =>
      React.createElement(
        React.Fragment,
        null,
        ...collectInteractiveRows(props).map((row, index) =>
          React.createElement(
            "button",
            {
              key: String(index),
              onClick: row.onClickCapture,
              type: "button",
            },
            "Supplier template row",
          ),
        ),
      ),
  };
});

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
            {
              id: "supplier-globex",
              typeId: "Supplier",
              properties: { supplierName: "Globex" },
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

test("List renders ObjectSet template rows, paginates, and selects a stable object", () => {
  const updateWidgetMetaProperty = jest.fn();
  const widget = new ListWidget({
    backgroundColor: "transparent",
    borderRadius: "0px",
    componentHeight: 400,
    componentWidth: 600,
    dataMode: "OBJECT",
    childWidgets: [
      {
        children: [
          {
            bottomRow: 10,
            children: [
              {
                children: [],
                type: "CANVAS_WIDGET",
                widgetId: "SupplierTemplateCanvas",
                widgetName: "SupplierTemplateCanvas",
              },
            ],
            type: "CONTAINER_WIDGET",
            widgetId: "SupplierTemplate",
            widgetName: "SupplierTemplate",
          },
        ],
        type: "CANVAS_WIDGET",
        widgetId: "ListCanvas",
      },
    ],
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

  expect(
    screen.getByRole("button", { name: "Supplier template row" }),
  ).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: "Supplier template row" }),
  );

  expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
    "listData",
    expect.arrayContaining([
      expect.objectContaining({ id: "supplier-acme", supplierName: "Acme" }),
      expect.objectContaining({
        id: "supplier-globex",
        supplierName: "Globex",
      }),
    ]),
  );

  expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
    "selectedItem",
    expect.objectContaining({ id: "supplier-acme" }),
  );
});
