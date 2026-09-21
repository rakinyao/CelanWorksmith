// eslint-disable-next-line
// @ts-nocheck
import i18n from "i18n";
import ButtonGroupWidget from "./";

const findProperty = (sections, propertyName) =>
  sections
    .flatMap((section) => section.children ?? [])
    .flatMap((property) => [
      property,
      ...(Array.isArray(property.panelConfig)
        ? findProperty(property.panelConfig, propertyName)
          ? [findProperty(property.panelConfig, propertyName)]
          : []
        : []),
    ])
    .find((property) => property.propertyName === propertyName);

test("localizes ButtonGroup private pane while preserving event fields", async () => {
  const previousLanguage = i18n.language;

  try {
    await i18n.changeLanguage("zh-CN");
    const content = ButtonGroupWidget.getPropertyPaneContentConfig();

    expect(content[0].sectionName).toBe("数据");
    expect(findProperty(content, "groupButtons")?.label).toBe("按钮");
    expect(JSON.stringify(content)).toContain('"propertyName":"onClick"');
    expect(JSON.stringify(content)).toContain('"label":"onClick"');
  } finally {
    await i18n.changeLanguage(previousLanguage);
  }
});
