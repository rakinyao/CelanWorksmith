import i18n from "i18n";
import SelectWidget from "./index";

afterEach(async () => {
  await i18n.changeLanguage("en-US");
});

describe("Select property pane localization", () => {
  it("localizes display fields while preserving technical event labels", async () => {
    await i18n.changeLanguage("zh-CN");
    const config = SelectWidget.getPropertyPaneContentConfig();
    const data = config.find((section) => section.sectionName === "数据");

    expect(
      data?.children.find((child) => child.propertyName === "sourceData")
        ?.label,
    ).toBe("选项数据");
    const filters = config.find(
      (section) => section.sectionName === "搜索和筛选",
    );

    expect(
      filters?.children.find(
        (child) => child.propertyName === "serverSideFiltering",
      )?.label,
    ).toBe("服务端筛选");
    expect(
      config
        .flatMap((section) => section.children)
        .find((child) => child.propertyName === "onOptionChange")?.label,
    ).toBe("onOptionChange");
  });
});
