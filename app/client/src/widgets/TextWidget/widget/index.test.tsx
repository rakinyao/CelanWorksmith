import TextWidget, { type TextWidgetProps } from ".";
import i18n from "i18n";

afterEach(async () => {
  await i18n.changeLanguage("en-US");
});

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

test("localizes the Text property pane while preserving persisted values", async () => {
  await i18n.changeLanguage("zh-CN");

  const config = TextWidget.getPropertyPaneContentConfig();
  const general = config.find((section) => section.sectionName === "常规");
  const overflow = general?.children?.find(
    (child) => child.propertyName === "overflow",
  );

  expect(general).toBeDefined();
  expect(
    general?.children?.find((child) => child.propertyName === "text")?.label,
  ).toBe("文本");
  expect(overflow?.label).toBe("文本溢出");
  expect(overflow?.propertyName).toBe("overflow");
  expect(
    overflow?.options?.find((option) => option.value === "SCROLL")?.label,
  ).toBe("滚动");

  await i18n.changeLanguage("en-US");
  expect(TextWidget.getPropertyPaneContentConfig()[0].sectionName).toBe(
    "General",
  );
});
