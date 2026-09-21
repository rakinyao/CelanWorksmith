// eslint-disable-next-line
// @ts-nocheck
import i18n from "i18n";
import MultiSelectWidget from "./";

const findProperty = (sections, propertyName) =>
  sections
    .flatMap((section) => section.children ?? [])
    .find((property) => property.propertyName === propertyName);

describe("MultiSelectWidget property pane localization", () => {
  test("localizes display copy while preserving technical values and events", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const content = MultiSelectWidget.getPropertyPaneContentConfig();
      const style = MultiSelectWidget.getPropertyPaneStyleConfig();
      const sourceData = findProperty(content, "sourceData");
      const defaultOptionValue = findProperty(content, "defaultOptionValue");
      const event = findProperty(content, "onOptionChange");
      const labelPosition = findProperty(content, "labelPosition");

      expect(content[0].sectionName).toBe("数据");
      expect(sourceData?.label).toBe("源数据");
      expect(defaultOptionValue?.label).toBe("默认选中值");
      expect(defaultOptionValue?.helperText).toBeTruthy();
      expect(style[0].sectionName).toBe("标签样式");
      expect(labelPosition?.options).toEqual(
        expect.arrayContaining([expect.objectContaining({ label: "自动" })]),
      );
      expect(sourceData?.propertyName).toBe("sourceData");
      expect(event?.label).toBe("onOptionChange");
      expect(event?.propertyName).toBe("onOptionChange");

      await i18n.changeLanguage("en-US");
      expect(
        MultiSelectWidget.getPropertyPaneContentConfig()[0].sectionName,
      ).toBe("Data");
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
