// eslint-disable-next-line
// @ts-nocheck
import i18n from "i18n";
import MenuButtonWidget from "./";

test("localizes MenuButton private pane while preserving menu source values", async () => {
  const previousLanguage = i18n.language;

  try {
    await i18n.changeLanguage("zh-CN");
    const content = MenuButtonWidget.getPropertyPaneContentConfig();
    const style = MenuButtonWidget.getPropertyPaneStyleConfig();

    expect(content[0].sectionName).toBe("基础");
    expect(content[0].children[1].label).toBe("菜单项来源");
    expect(style[0].children[0].label).toBe("按钮变体");
    expect(style[0].children[0].options[0].value).toBe("PRIMARY");
  } finally {
    await i18n.changeLanguage(previousLanguage);
  }
});
