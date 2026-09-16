import WidgetFactory from "../index";
import { clearAllWidgetFactoryCache } from "../decorators";
import type BaseWidget from "widgets/BaseWidget";
import TableWidget from "widgets/TableWidget/widget";
import i18n from "i18n";

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
});
