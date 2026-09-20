import WidgetFactory from "../index";
import { clearAllWidgetFactoryCache } from "../decorators";
import type BaseWidget from "widgets/BaseWidget";
import TableWidget from "widgets/TableWidget/widget";
import TableWidgetV2 from "widgets/TableWidgetV2/widget";
import i18n from "i18n";
import type { PropertyPaneConfig } from "constants/PropertyControlConstants";

const firstSectionName = (config: readonly PropertyPaneConfig[]) =>
  config[0]?.sectionName;

const firstStyleSectionName = (config: readonly PropertyPaneConfig[]) =>
  config.find((section) =>
    section.children?.some((child) => child.propertyName === "compactMode"),
  )?.sectionName;

describe("WidgetFactory Cache Tests", () => {
  beforeAll(() => {
    // Clear the widget factory state before each test
    WidgetFactory.widgetsMap.clear();
    clearAllWidgetFactoryCache();
  });

  afterAll(() => {
    // Clean up after each test
    WidgetFactory.widgetsMap.clear();
    clearAllWidgetFactoryCache();
  });

  it("should return stale data after widget registration until cache is cleared", () => {
    // Initial state - no widgets
    let widgetTypes = WidgetFactory.getWidgetTypes();

    expect(widgetTypes).toEqual([]);

    // Add a widget to the map
    WidgetFactory.widgetsMap.set("TEST_WIDGET", {} as typeof BaseWidget);

    // getWidgetTypes should still return empty array (stale cache)
    widgetTypes = WidgetFactory.getWidgetTypes();
    expect(widgetTypes).toEqual([]);

    // Clear the cache
    clearAllWidgetFactoryCache();

    // Now getWidgetTypes should return the updated widget type
    widgetTypes = WidgetFactory.getWidgetTypes();
    expect(widgetTypes).toContain("TEST_WIDGET");
    expect(widgetTypes).toHaveLength(1);
  });

  it("refreshes locale-sensitive property pane config after a language switch", async () => {
    WidgetFactory.widgetsMap.set(TableWidget.type, TableWidget);
    clearAllWidgetFactoryCache();

    await i18n.changeLanguage("en-US");
    const englishConfig = WidgetFactory.getWidgetPropertyPaneConfig(
      TableWidget.type,
      {} as never,
    );

    await i18n.changeLanguage("zh-CN");
    const chineseConfig = WidgetFactory.getWidgetPropertyPaneConfig(
      TableWidget.type,
      {} as never,
    );

    expect((englishConfig[0] as { sectionName?: string }).sectionName).toBe(
      "General",
    );
    expect((chineseConfig[0] as { sectionName?: string }).sectionName).toBe(
      "常规",
    );
  });

  it("refreshes the real TableWidgetV2 combined config after a language switch", async () => {
    WidgetFactory.widgetsMap.set(TableWidgetV2.type, TableWidgetV2);
    clearAllWidgetFactoryCache();

    try {
      await i18n.changeLanguage("en-US");
      const english = WidgetFactory.getWidgetPropertyPaneConfig(
        TableWidgetV2.type,
        {} as never,
      );

      await i18n.changeLanguage("zh-CN");
      const chinese = WidgetFactory.getWidgetPropertyPaneConfig(
        TableWidgetV2.type,
        {} as never,
      );

      expect(firstSectionName(english)).toBe("Data");
      expect(firstSectionName(chinese)).toBe("数据");
      expect(firstStyleSectionName(chinese)).toBe("常规");
    } finally {
      await i18n.changeLanguage("en-US");
      clearAllWidgetFactoryCache();
    }
  });

  it("refreshes direct TableWidgetV2 content, style, and search configs by locale", async () => {
    WidgetFactory.widgetsMap.set(TableWidgetV2.type, TableWidgetV2);
    clearAllWidgetFactoryCache();

    try {
      await i18n.changeLanguage("en-US");
      const englishContent = WidgetFactory.getWidgetPropertyPaneContentConfig(
        TableWidgetV2.type,
        {} as never,
        i18n.language,
      );
      const englishStyle = WidgetFactory.getWidgetPropertyPaneStyleConfig(
        TableWidgetV2.type,
        i18n.language,
      );
      const englishSearch = WidgetFactory.getWidgetPropertyPaneSearchConfig(
        TableWidgetV2.type,
        {} as never,
        i18n.language,
      );

      await i18n.changeLanguage("zh-CN");
      const chineseContent = WidgetFactory.getWidgetPropertyPaneContentConfig(
        TableWidgetV2.type,
        {} as never,
        i18n.language,
      );
      const chineseStyle = WidgetFactory.getWidgetPropertyPaneStyleConfig(
        TableWidgetV2.type,
        i18n.language,
      );
      const chineseSearch = WidgetFactory.getWidgetPropertyPaneSearchConfig(
        TableWidgetV2.type,
        {} as never,
        i18n.language,
      );

      expect(firstSectionName(englishContent)).toBe("Data");
      expect(firstStyleSectionName(englishStyle)).toBe("General");
      expect(firstSectionName(englishSearch)).toBe("Data");
      expect(firstSectionName(chineseContent)).toBe("数据");
      expect(firstStyleSectionName(chineseStyle)).toBe("常规");
      expect(firstSectionName(chineseSearch)).toBe("数据");
    } finally {
      await i18n.changeLanguage("en-US");
      clearAllWidgetFactoryCache();
    }
  });
});
