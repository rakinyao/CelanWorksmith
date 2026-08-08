import { fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ObjectCollectionMode from "celanworksmith/widgets/objectBinding/ObjectCollectionMode";
import { EditorContext } from "components/editorComponents/EditorContextProvider";
import ListWidgetV2, { type ListWidgetProps } from ".";
import React from "react";
import { render } from "test/testUtils";

jest.mock("layoutSystems/CanvasFactory", () => {
  const React = jest.requireActual("react");

  return {
    renderAppsmithCanvas: (canvas: {
      children?: Array<{
        children?: Array<{ children?: Array<{ text?: string }> }>;
        onClick?: () => void;
        widgetId: string;
      }>;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        ...(canvas.children || []).map((row) => {
          const templateWidgets = row.children?.[0]?.children || [];

          return React.createElement(
            "div",
            { key: row.widgetId, onClick: row.onClick },
            ...templateWidgets.map((templateWidget, index) =>
              React.createElement(
                "button",
                { key: String(index), type: "button" },
                templateWidget.text,
              ),
            ),
          );
        }),
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
            children: [
              {
                children: [
                  {
                    children: [],
                    text: objectSetState.celanworksmithObjectQueries.entries[
                      'ListV21/Supplier/{"limit":100,"offset":0}'
                    ].result.items[0].properties.supplierName,
                    type: "BUTTON_WIDGET",
                    widgetId: "SupplierTemplateButton",
                  },
                ],
                type: "CANVAS_WIDGET",
                widgetId: "SupplierTemplateCanvas",
              },
            ],
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
      EditorContext.Provider,
      { value: { executeAction: jest.fn() } },
      widget.getWidgetView(),
    ),
    { initialState: objectSetState },
  );

  expect(screen.getByRole("button", { name: "Acme" })).toBeInTheDocument();

  fireEvent.click(screen.getByText("2"));

  expect(updateWidgetMetaProperty).toHaveBeenCalledWith("pageNo", 2);

  fireEvent.click(screen.getByRole("button", { name: "Acme" }));

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
