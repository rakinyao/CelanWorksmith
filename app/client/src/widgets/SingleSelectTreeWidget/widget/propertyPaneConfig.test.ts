// eslint-disable-next-line
// @ts-nocheck
import i18n from "i18n";
import SingleSelectTreeWidget from "./";

const findProperty = (sections, propertyName) =>
  sections
    .flatMap((section) => section.children ?? [])
    .find((property) => property.propertyName === propertyName);

describe("SingleSelectTreeWidget property pane localization", () => {
  test("localizes display copy while preserving tree data and event identifiers", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const content = SingleSelectTreeWidget.getPropertyPaneContentConfig();
      const style = SingleSelectTreeWidget.getPropertyPaneStyleConfig();
      const options = findProperty(content, "options");
      const labelPosition = findProperty(content, "labelPosition");
      const event = findProperty(content, "onDropdownOpen");

      expect(content[0].sectionName).toBe("数据");
      expect(options?.label).toBe("选项");
      expect(options?.placeholderText).toBe("输入选项值");
      expect(style[0].sectionName).toBe("标签样式");
      expect(labelPosition?.options).toEqual(
        expect.arrayContaining([expect.objectContaining({ label: "左侧" })]),
      );
      expect(options?.propertyName).toBe("options");
      expect(event?.label).toBe("onDropdownOpen");
      expect(event?.propertyName).toBe("onDropdownOpen");
      expect(SingleSelectTreeWidget.getDefaults().options[0]).toEqual(
        expect.objectContaining({ label: "Blue", value: "BLUE" }),
      );
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
