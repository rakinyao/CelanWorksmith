import i18n from "i18n";
import ImageWidget from "./index";

function findProperty(
  config: ReturnType<typeof ImageWidget.getPropertyPaneContentConfig>,
  propertyName: string,
) {
  return config
    .flatMap((section) => section.children)
    .find((property) => property.propertyName === propertyName);
}

describe("ImageWidget property pane localization", () => {
  it("localizes display fields while preserving technical values and events", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const content = ImageWidget.getPropertyPaneContentConfig();
      const style = ImageWidget.getPropertyPaneStyleConfig();

      expect(content[0].sectionName).toBe("数据");
      expect(findProperty(content, "image")?.label).toBe("图片");
      expect(findProperty(content, "objectFit")?.label).toBe("对象适应");
      expect(
        findProperty(content, "objectFit")?.options?.find(
          (option) => option.value === "contain",
        )?.label,
      ).toBe("包含");
      expect(findProperty(content, "objectFit")?.options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: "包含", value: "contain" }),
        ]),
      );
      expect(findProperty(content, "onClick")?.label).toBe("onClick");
      expect(findProperty(content, "onClick")?.propertyName).toBe("onClick");
      expect(style[0].sectionName).toBe("边框和阴影");
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
