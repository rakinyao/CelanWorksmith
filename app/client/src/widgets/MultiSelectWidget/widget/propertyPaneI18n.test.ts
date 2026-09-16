import i18n from "i18n";
import MultiSelectWidget from "./index";

afterEach(async () => {
  await i18n.changeLanguage("en-US");
});

describe("MultiSelect property pane localization", () => {
  it("localizes display fields while preserving technical event labels", async () => {
    await i18n.changeLanguage("zh-CN");
    const config = MultiSelectWidget.getPropertyPaneConfig();

    const general = config.find((section) => section.sectionName === "常规");

    expect(general).toBeDefined();
    expect(
      general?.children.find((child) => child.propertyName === "options")
        ?.label,
    ).toBe("选项");
    const label = config.find((section) => section.sectionName === "标签");

    expect(
      label?.children.find((child) => child.propertyName === "labelPosition")
        ?.label,
    ).toBe("位置");
    expect(
      config
        .flatMap((section) => section.children)
        .find((child) => child.propertyName === "onOptionChange")?.label,
    ).toBe("onOptionChange");
  });
});
