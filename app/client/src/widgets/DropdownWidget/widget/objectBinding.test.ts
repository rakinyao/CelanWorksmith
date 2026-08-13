import { fireEvent, render, screen } from "@testing-library/react";
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
  test.each([false, 0])("keeps the required Object value %p valid", (value) => {
    const isValid = DropdownWidget.getDerivedPropertiesMap().isValid;
    const expression = isValid.slice(2, -2);
    const evaluateIsValid = new Function(`return ${expression};`);

    expect(
      evaluateIsValid.call({
        isRequired: true,
        selectedOptionValue: value,
      }),
    ).toBe(true);
  });
});

test("Dropdown renders ObjectSet options and emits the selected stable property value", () => {
  const updateWidgetMetaProperty = jest.fn();
  const widget = new DropdownWidget({
    ...queryProps,
    accentColor: "#000000",
    backgroundColor: "transparent",
    borderRadius: "0px",
    componentHeight: 40,
    componentWidth: 300,
    dataMode: "OBJECT",
    displayPropertyId: "supplierName",
    isFilterable: false,
    isValid: true,
    objectTypeId: "Supplier",
    updateWidgetMetaProperty,
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
        }),
      },
      widget.getWidgetView(),
    ),
  );

  fireEvent.click(screen.getByText("-- Select --"));

  expect(screen.getByText("Acme")).toBeInTheDocument();

  fireEvent.click(screen.getByText("Acme"));

  expect(updateWidgetMetaProperty).toHaveBeenCalledWith(
    "value",
    "supplier-acme",
    expect.objectContaining({ triggerPropertyName: "onOptionChange" }),
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

test("Dropdown renders the ObjectSet loading state from its actual Object mode view", () => {
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
            status: "loading",
            types: { Supplier: { status: "loading" } },
          },
          celanworksmithObjectQueries: { entries: {} },
        }),
      },
      widget.getWidgetView(),
    ),
  );

  expect(
    screen.getByText("Loading object data / 正在加载本体数据"),
  ).toHaveAttribute("aria-live", "polite");
});
