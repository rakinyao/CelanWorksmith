import ObjectSelectionMode from "celanworksmith/widgets/objectBinding/ObjectSelectionMode";
import DropdownWidget, { type DropdownWidgetProps } from ".";

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
