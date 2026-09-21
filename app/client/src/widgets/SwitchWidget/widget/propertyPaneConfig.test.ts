import i18n from "i18n";
import { LabelPosition } from "components/constants";
import SwitchWidget from "./index";

function findProperty(
  config: ReturnType<typeof SwitchWidget.getPropertyPaneContentConfig>,
  propertyName: string,
) {
  return config
    .flatMap((section) => section.children)
    .find((property) => property.propertyName === propertyName);
}

describe("SwitchWidget property pane localization", () => {
  it("localizes display fields while preserving technical values and events", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const content = SwitchWidget.getPropertyPaneContentConfig();
      const style = SwitchWidget.getPropertyPaneStyleConfig();
      const labelPosition = findProperty(content, "labelPosition");
      const defaultState = findProperty(content, "defaultSwitchState");
      const animateLoading = findProperty(content, "animateLoading");
      const event = findProperty(content, "onChange");
      const labelTextSize = style
        .flatMap((section) => section.children)
        .find((property) => property.propertyName === "labelTextSize");
      const accentColor = style
        .flatMap((section) => section.children)
        .find((property) => property.propertyName === "accentColor");

      expect(content[0].sectionName).toBe("标签");
      expect(defaultState?.label).toBe("默认状态");
      expect(animateLoading?.label).toBe("动画加载");
      expect(labelPosition?.label).toBe("位置");
      expect(
        labelPosition?.options?.find(
          (option) => option.value === LabelPosition.Left,
        )?.label,
      ).toBe("左侧");
      expect(
        labelPosition?.options?.find(
          (option) => option.value === LabelPosition.Right,
        )?.label,
      ).toBe("右侧");
      expect(defaultState?.propertyName).toBe("defaultSwitchState");
      expect(event?.label).toBe("onChange");
      expect(style[0].sectionName).toBe("标签样式");
      expect(accentColor?.label).toBe("强调色");
      expect(labelTextSize?.defaultValue).toBe("0.875rem");
      expect(
        labelTextSize?.options?.find((option) => option.value === "0.875rem")
          ?.value,
      ).toBe("0.875rem");

      await i18n.changeLanguage("en-US");
      expect(SwitchWidget.getPropertyPaneContentConfig()[0].sectionName).toBe(
        "Label",
      );
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
