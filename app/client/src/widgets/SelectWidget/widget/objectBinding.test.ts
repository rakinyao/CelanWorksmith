import ObjectSelectionMode from "celanworksmith/widgets/objectBinding/ObjectSelectionMode";
import SelectWidget, { type SelectWidgetProps } from ".";

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
