import TextWidget, { type TextWidgetProps } from ".";

test("renders ordinary text without legacy Object-mode controls", () => {
  const queryView = new TextWidget({
    text: "Static query value",
  } as TextWidgetProps).getWidgetView();
  const controls = TextWidget.getPropertyPaneContentConfig()
    .flatMap((section) => section.children || [])
    .map((control) => control.propertyName);

  expect(queryView.props.children.props.text).toBe("Static query value");
  expect(controls).not.toEqual(
    expect.arrayContaining([
      "dataMode",
      "objectTypeId",
      "objectData",
      "displayPropertyId",
    ]),
  );
});
