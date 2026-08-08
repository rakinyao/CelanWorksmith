import TextWidget, { type TextWidgetProps } from ".";

test("keeps Query text and exposes a stable Object property binding", () => {
  const queryView = new TextWidget({
    dataMode: "QUERY",
    text: "Static query value",
  } as TextWidgetProps).getWidgetView();
  const controls = TextWidget.getPropertyPaneContentConfig()
    .flatMap((section) => section.children || [])
    .filter((control) =>
      ["objectTypeId", "objectData", "displayPropertyId"].includes(
        control.propertyName,
      ),
    );

  expect(queryView.props.children.props.text).toBe("Static query value");
  expect(controls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        propertyName: "objectTypeId",
        controlType: "CELANWORKSMITH_OBJECT_TYPE",
      }),
      expect.objectContaining({
        propertyName: "displayPropertyId",
        controlType: "CELANWORKSMITH_OBJECT_PROPERTY",
      }),
    ]),
  );
});
