import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ObjectSelectionMode from "celanworksmith/widgets/objectBinding/ObjectSelectionMode";
import MultiSelectWidget, { type MultiSelectWidgetProps } from ".";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";

const queryProps = {
  options: [{ label: "Legacy", value: "legacy-id" }],
  updateWidgetMetaProperty: jest.fn(),
  widgetId: "MultiSelect1",
  widgetName: "MultiSelect1",
};

test("MultiSelect preserves Query options and exposes Object property mappings", () => {
  expect(MultiSelectWidget.getDefaults().dataMode).toBe("OBJECT");
  expect(
    new MultiSelectWidget(
      queryProps as unknown as MultiSelectWidgetProps,
    ).getWidgetView().type,
  ).not.toBe(ObjectSelectionMode);
  expect(
    new MultiSelectWidget({
      ...queryProps,
      dataMode: "OBJECT",
    } as unknown as MultiSelectWidgetProps).getWidgetView().type,
  ).toBe(ObjectSelectionMode);

  const controls = MultiSelectWidget.getPropertyPaneContentConfig()
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

test("MultiSelect renders an empty ObjectSet from its actual Object mode view", () => {
  const widget = new MultiSelectWidget({
    ...queryProps,
    dataMode: "OBJECT",
    displayPropertyId: "supplierName",
    objectTypeId: "Supplier",
    valuePropertyId: "supplierId",
  } as unknown as MultiSelectWidgetProps);

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
              'MultiSelect1/Supplier/{"limit":100,"offset":0}': {
                request: {
                  widgetId: "MultiSelect1",
                  typeId: "Supplier",
                  query: { limit: 100, offset: 0 },
                },
                status: "empty",
                result: {
                  typeId: "Supplier",
                  items: [],
                  offset: 0,
                  limit: 100,
                  total: 0,
                },
              },
            },
          },
        }),
      },
      widget.getWidgetView(),
    ),
  );

  expect(screen.getByText("No objects found.")).toBeInTheDocument();
});
