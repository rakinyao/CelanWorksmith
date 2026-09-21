import i18n from "i18n";
import { LabelPosition } from "components/constants";
import CheckboxWidget from "./index";

function findProperty(
  config: ReturnType<typeof CheckboxWidget.getPropertyPaneContentConfig>,
  propertyName: string,
) {
  return config
    .flatMap((section) => section.children)
    .find((property) => property.propertyName === propertyName);
}

describe("CheckboxWidget property pane localization", () => {
  it("localizes display fields while preserving technical values and events", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const content = CheckboxWidget.getPropertyPaneContentConfig();
      const style = CheckboxWidget.getPropertyPaneStyleConfig();
      const labelPosition = findProperty(content, "labelPosition");
      const event = findProperty(content, "onCheckChange");
      const accentColor = style
        .flatMap((section) => section.children)
        .find((property) => property.propertyName === "accentColor");

      expect(content[0].sectionName).toBe("标签");
      expect(findProperty(content, "label")?.label).toBe("文本");
      expect(labelPosition?.label).toBe("位置");
      expect(
        labelPosition?.options?.find(
          (option) => option.value === LabelPosition.Left,
        )?.label,
      ).toBe("左侧");
      expect(labelPosition?.propertyName).toBe("labelPosition");
      expect(event?.label).toBe("onCheckChange");
      expect(style[0].sectionName).toBe("标签样式");
      expect(accentColor?.label).toBe("强调色");

      await i18n.changeLanguage("en-US");
      expect(CheckboxWidget.getPropertyPaneContentConfig()[0].sectionName).toBe(
        "Label",
      );
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
