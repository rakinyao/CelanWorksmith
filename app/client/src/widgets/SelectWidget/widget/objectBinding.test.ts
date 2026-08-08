import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ObjectSelectionMode from "celanworksmith/widgets/objectBinding/ObjectSelectionMode";
import { dark, theme } from "constants/DefaultTheme";
import SelectWidget, { type SelectWidgetProps } from ".";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { ThemeProvider } from "styled-components";

const queryProps = {
  options: [{ label: "Legacy", value: "legacy-id" }],
  updateWidgetMetaProperty: jest.fn(),
  widgetId: "Select1",
  widgetName: "Select1",
};

test("Select preserves Query options and exposes Object property mappings", () => {
  expect(SelectWidget.getDefaults().dataMode).toBe("OBJECT");
  expect(
    new SelectWidget(queryProps as unknown as SelectWidgetProps).getWidgetView()
      .type,
  ).not.toBe(ObjectSelectionMode);
  expect(
    new SelectWidget({
      ...queryProps,
      dataMode: "OBJECT",
    } as unknown as SelectWidgetProps).getWidgetView().type,
  ).toBe(ObjectSelectionMode);

  const controls = SelectWidget.getPropertyPaneContentConfig()
    .flatMap((section) => section.children || [])
    .filter((control) =>
      ["objectTypeId", "displayPropertyId", "valuePropertyId"].includes(
        control.propertyName,
      ),
    );

  expect(controls.map((control) => control.controlType)).toEqual([
    "CELANWORKSMITH_OBJECT_TYPE",
    "CELANWORKSMITH_OBJECT_PROPERTY",
    "CELANWORKSMITH_OBJECT_PROPERTY",
  ]);
});

test("Select renders ObjectSet options and emits the selected stable property value", () => {
  const updateWidgetMetaProperty = jest.fn();
  const widget = new SelectWidget({
    ...queryProps,
    componentHeight: 40,
    componentWidth: 300,
    dataMode: "OBJECT",
    displayPropertyId: "supplierName",
    objectTypeId: "Supplier",
    commitBatchMetaUpdates: jest.fn(),
    pushBatchMetaUpdates: updateWidgetMetaProperty,
    updateWidgetMetaProperty,
    valuePropertyId: "supplierId",
  } as unknown as SelectWidgetProps);
  const store = configureStore()({
    celanworksmithObjects: {
      status: "ready",
      types: {
        Supplier: {
          metadata: {
            id: "Supplier",
            displayName: "Supplier",
            properties: [
              { id: "supplierName", dataType: "STRING" },
              { id: "supplierId", dataType: "STRING" },
            ],
          },
          status: "ready",
        },
      },
    },
    celanworksmithObjectQueries: {
      entries: {
        'Select1/Supplier/{"limit":100,"offset":0}': {
          request: {
            widgetId: "Select1",
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
                properties: {
                  supplierId: "supplier-acme",
                  supplierName: "Acme",
                },
              },
            ],
            offset: 0,
            limit: 100,
            total: 1,
          },
        },
      },
    },
  });

  render(
    React.createElement(
      Provider,
      { store },
      React.createElement(
        ThemeProvider,
        { theme: { ...theme, colors: { ...theme.colors, ...dark } } },
        widget.getWidgetView(),
      ),
    ),
  );

  fireEvent.click(screen.getByTestId("selectbutton.btn.main"));

  expect(screen.getByText("Acme")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Acme"));

  expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
    "value",
    "supplier-acme",
    expect.anything(),
  );
});

test("Select renders a type mismatch from its actual Object mode view", () => {
  const widget = new SelectWidget({
    ...queryProps,
    dataMode: "OBJECT",
    displayPropertyId: "missing",
    objectTypeId: "Supplier",
    valuePropertyId: "supplierId",
  } as unknown as SelectWidgetProps);

  render(
    React.createElement(
      Provider,
      {
        store: configureStore()({
          celanworksmithObjects: {
            status: "ready",
            types: {
              Supplier: {
                metadata: {
                  id: "Supplier",
                  displayName: "Supplier",
                  properties: [{ id: "supplierId", dataType: "STRING" }],
                },
                status: "ready",
              },
            },
          },
          celanworksmithObjectQueries: {
            entries: {
              'Select1/Supplier/{"limit":100,"offset":0}': {
                request: {
                  widgetId: "Select1",
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
                      properties: { supplierId: "supplier-acme" },
                    },
                  ],
                  offset: 0,
                  limit: 100,
                  total: 1,
                },
              },
            },
          },
        }),
      },
      widget.getWidgetView(),
    ),
  );

  expect(screen.getByRole("alert")).toHaveTextContent("incompatible");
});
