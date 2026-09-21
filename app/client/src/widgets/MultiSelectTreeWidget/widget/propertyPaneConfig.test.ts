// eslint-disable-next-line
// @ts-nocheck
import i18n from "i18n";
import MultiSelectTreeWidget from "./";

const findProperty = (sections, propertyName) =>
  sections
    .flatMap((section) => section.children ?? [])
    .find((property) => property.propertyName === propertyName);

describe("MultiSelectTreeWidget property pane localization", () => {
  test("localizes display copy while preserving mode values and event identifiers", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const content = MultiSelectTreeWidget.getPropertyPaneContentConfig();
      const style = MultiSelectTreeWidget.getPropertyPaneStyleConfig();
      const mode = findProperty(content, "mode");
      const event = findProperty(content, "onDropdownClose");

      expect(content[0].sectionName).toBe("数据");
      expect(mode?.label).toBe("模式");
      expect(
        mode?.options?.find((option) => option.value === "SHOW_ALL"),
      ).toEqual(
        expect.objectContaining({ label: "显示所有项目", value: "SHOW_ALL" }),
      );
      expect(style[0].sectionName).toBe("标签样式");
      expect(mode?.propertyName).toBe("mode");
      expect(event?.label).toBe("onDropdownClose");
      expect(event?.propertyName).toBe("onDropdownClose");
      expect(MultiSelectTreeWidget.getDefaults().mode).toBe("SHOW_ALL");
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
