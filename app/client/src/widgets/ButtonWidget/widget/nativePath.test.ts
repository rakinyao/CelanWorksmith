import ButtonWidget from ".";
import i18n from "i18n";

function findProperty(
  config: ReturnType<typeof ButtonWidget.getPropertyPaneContentConfig>,
  propertyName: string,
) {
  return config
    .flatMap((section) => section.children)
    .find((property) => property.propertyName === propertyName);
}

describe("ButtonWidget native path", () => {
  it("keeps the standard click property as the only action entry point", () => {
    const properties = ButtonWidget.getPropertyPaneContentConfig()
      .flatMap((section) => section.children)
      .map((property) => property.propertyName);

    expect(properties).toContain("onClick");
    expect(properties).not.toEqual(
      expect.arrayContaining(["actionId", "objectData", "parameters"]),
    );
    expect(ButtonWidget.getDefaults()).not.toHaveProperty("actionId");
  });

  it("localizes content labels without changing the technical click property", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const content = ButtonWidget.getPropertyPaneContentConfig();

      expect(content[0].sectionName).toBe("基础");
      expect(findProperty(content, "text")?.label).toBe("标签");
      expect(findProperty(content, "onClick")?.label).toBe("onClick");
      expect(findProperty(content, "onClick")?.propertyName).toBe("onClick");
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });

  it("localizes style labels", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const style = ButtonWidget.getPropertyPaneStyleConfig();

      expect(style[0].sectionName).toBe("常规");
      expect(style[0].children[0].label).toBe("按钮变体");
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
