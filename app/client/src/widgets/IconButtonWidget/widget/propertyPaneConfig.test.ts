// eslint-disable-next-line
// @ts-nocheck
import i18n from "i18n";
import IconButtonWidget from "./";

test("localizes IconButton private pane while preserving variant values", async () => {
  const previousLanguage = i18n.language;

  try {
    await i18n.changeLanguage("zh-CN");
    const content = IconButtonWidget.getPropertyPaneContentConfig();
    const style = IconButtonWidget.getPropertyPaneStyleConfig();

    expect(content[0].sectionName).toBe("基础");
    expect(content[0].children[0].label).toBe("图标");
    expect(style[0].children[0].label).toBe("按钮变体");
    expect(style[0].children[0].options[0].value).toBe("PRIMARY");
  } finally {
    await i18n.changeLanguage(previousLanguage);
  }
});
