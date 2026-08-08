import { fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ObjectCollectionMode from "celanworksmith/widgets/objectBinding/ObjectCollectionMode";
import ListWidget, { type ListWidgetProps } from ".";
import React from "react";
import { render } from "test/testUtils";

jest.mock("layoutSystems/CanvasFactory", () => {
  const React = jest.requireActual("react");

  return {
    renderAppsmithCanvas: (canvas: {
      children?: Array<{
        children?: Array<{ children?: Array<{ text?: string }> }>;
        onClickCapture?: () => void;
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
            { key: row.widgetId, onClickCapture: row.onClickCapture },
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
  const widgetProps = {
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
                children: [
                  {
                    children: [],
                    text: objectSetState.celanworksmithObjectQueries.entries[
                      'List1/Supplier/{"limit":100,"offset":0}'
                    ].result.items[0].properties.supplierName,
                    type: "BUTTON_WIDGET",
                    widgetId: "SupplierTemplateButton",
                    widgetName: "SupplierTemplateButton",
                  },
                ],
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
  } as unknown as ListWidgetProps<never>;

  render(React.createElement(ListWidget, widgetProps), {
    initialState: objectSetState,
  });

  expect(screen.getByRole("button", { name: "Acme" })).toBeInTheDocument();

  fireEvent.click(screen.getByTitle("2"));

  expect(
    document.querySelector(".rc-pagination-item-active"),
  ).toHaveTextContent("2");

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
    "selectedItem",
    expect.objectContaining({ id: "supplier-globex", supplierName: "Globex" }),
  );
});
