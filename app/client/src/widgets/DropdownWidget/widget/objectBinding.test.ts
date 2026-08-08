import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ObjectSelectionMode from "celanworksmith/widgets/objectBinding/ObjectSelectionMode";
import DropdownWidget, { type DropdownWidgetProps } from ".";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";

const queryProps = {
  options: [{ label: "Legacy", value: "legacy-id" }],
  updateWidgetMetaProperty: jest.fn(),
  widgetId: "Dropdown1",
  widgetName: "Dropdown1",
};

test("Dropdown preserves Query options and exposes Object property mappings", () => {
  expect(DropdownWidget.getDefaults().dataMode).toBe("OBJECT");
  expect(
    new DropdownWidget(
      queryProps as unknown as DropdownWidgetProps,
    ).getWidgetView().type,
  ).not.toBe(ObjectSelectionMode);
  expect(
    new DropdownWidget({
      ...queryProps,
      dataMode: "OBJECT",
    } as unknown as DropdownWidgetProps).getWidgetView().type,
  ).toBe(ObjectSelectionMode);

  const controls = DropdownWidget.getPropertyPaneConfig()
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

describe("Dropdown Object value handling", () => {
  test.each([false, 0])(
    "does not treat the required Object value %p as unselected",
    (value) => {
      const updateWidgetMetaProperty = jest.fn();
      const widget = new DropdownWidget({
        ...queryProps,
        dataMode: "OBJECT",
        isDirty: true,
        selectedOptionValue: value,
        updateWidgetMetaProperty,
      } as unknown as DropdownWidgetProps);

      widget.onOptionSelected({ label: "Existing", value });

      expect(updateWidgetMetaProperty).not.toHaveBeenCalledWith(
        "value",
        value,
        expect.anything(),
      );
    },
  );
});

test("Dropdown renders an ObjectSet load error from its actual Object mode view", () => {
  const widget = new DropdownWidget({
    ...queryProps,
    dataMode: "OBJECT",
    displayPropertyId: "supplierName",
    objectTypeId: "Supplier",
    valuePropertyId: "supplierId",
  } as unknown as DropdownWidgetProps);

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
              'Dropdown1/Supplier/{"limit":100,"offset":0}': {
                request: {
                  widgetId: "Dropdown1",
                  typeId: "Supplier",
                  query: { limit: 100, offset: 0 },
                },
                status: "error",
                error: { code: "E", message: "Object query failed" },
              },
            },
          },
        }),
      },
      widget.getWidgetView(),
    ),
  );

  expect(screen.getByRole("alert")).toHaveTextContent("Object query failed");
});
