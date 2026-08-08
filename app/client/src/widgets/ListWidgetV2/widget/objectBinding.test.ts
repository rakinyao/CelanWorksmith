import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ObjectCollectionMode from "celanworksmith/widgets/objectBinding/ObjectCollectionMode";
import { EditorContext } from "components/editorComponents/EditorContextProvider";
import { dark, theme } from "constants/DefaultTheme";
import ListWidgetV2, { type ListWidgetProps } from ".";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { ThemeProvider } from "styled-components";

jest.mock("layoutSystems/CanvasFactory", () => {
  const React = jest.requireActual("react");

  const collectInteractiveRows = (node: Record<string, unknown>) => {
    const rows: Array<Record<string, unknown>> = [];
    const children = (node.children || []) as Array<Record<string, unknown>>;

    if (node.onClick) rows.push(node);

    children.forEach((child) => rows.push(...collectInteractiveRows(child)));

    return rows;
  };

  return {
    renderAppsmithCanvas: (props: Record<string, unknown>) =>
      React.createElement(
        React.Fragment,
        { key: String(props.widgetId) },
        ...collectInteractiveRows(props).map((row, index) =>
          React.createElement(
            "button",
            {
              key: String(index),
              onClick: row.onClick,
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
      'ListV21/Supplier/{"limit":100,"offset":0}': {
        request: {
          widgetId: "ListV21",
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

test("ListV2 defaults to Object mode and keeps a legacy Query list native", () => {
  const queryProps = {
    listData: [{ id: "legacy" }],
    updateWidgetMetaProperty: jest.fn(),
    widgetId: "ListV21",
    widgetName: "ListV21",
  };

  expect(ListWidgetV2.getDefaults().dataMode).toBe("OBJECT");
  expect(
    new ListWidgetV2(queryProps as unknown as ListWidgetProps).getWidgetView()
      .type,
  ).not.toBe(ObjectCollectionMode);
  expect(
    new ListWidgetV2({
      ...queryProps,
      dataMode: "OBJECT",
    } as unknown as ListWidgetProps).getWidgetView().type,
  ).toBe(ObjectCollectionMode);
});

test("ListV2 renders ObjectSet template rows, paginates, and selects a stable object", () => {
  const updateWidgetMetaProperty = jest.fn();
  const widget = new ListWidgetV2({
    accentColor: "#000000",
    backgroundColor: "transparent",
    borderRadius: "0px",
    componentHeight: 180,
    componentWidth: 600,
    dataMode: "OBJECT",
    metaWidgetChildrenStructure: [
      {
        children: [
          {
            children: [],
            type: "CONTAINER_WIDGET",
            widgetId: "SupplierTemplate",
          },
        ],
        type: "CANVAS_WIDGET",
        widgetId: "ListCanvas",
      },
    ],
    objectTypeId: "Supplier",
    pageNo: 1,
    pageSize: 1,
    renderMode: "PAGE",
    updateWidgetMetaProperty,
    widgetId: "ListV21",
    widgetName: "ListV21",
  } as unknown as ListWidgetProps);

  render(
    React.createElement(
      Provider,
      { store: configureStore()({ ...objectSetState }) },
      React.createElement(
        ThemeProvider,
        { theme: { ...theme, colors: { ...theme.colors, ...dark } } },
        React.createElement(
          EditorContext.Provider,
          { value: { executeAction: jest.fn() } },
          widget.getWidgetView(),
        ),
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
    "selectedItemKey",
    "supplier-acme",
  );
});
