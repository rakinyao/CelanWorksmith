import ObjectSelectionMode from "celanworksmith/widgets/objectBinding/ObjectSelectionMode";
import MultiSelectWidget, { type MultiSelectWidgetProps } from ".";

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
