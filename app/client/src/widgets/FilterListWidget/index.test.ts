import WidgetFactory from "WidgetProvider/factory";
import { registerWidgets } from "WidgetProvider/factory/registrationHelper";
import { loadWidget } from "widgets";
import { FILTER_LIST_WIDGET_TYPE } from "./constants";

describe("FilterListWidget registration", () => {
  test("loads with metadata-aware defaults and registers", async () => {
    const widget = await loadWidget(FILTER_LIST_WIDGET_TYPE);

    expect(widget.type).toBe(FILTER_LIST_WIDGET_TYPE);
    expect(widget.getDefaults()).toMatchObject({
      widgetName: "FilterList",
      version: 1,
      objectTypeId: undefined,
    });
    expect(widget.getMetaPropertiesMap()).toEqual({
      filter: { typeId: "", conditions: [], version: 1 },
      objectTypeId: undefined,
      isValid: false,
    });

    registerWidgets([widget]);
    expect(WidgetFactory.get(FILTER_LIST_WIDGET_TYPE)).toBe(widget);
  });
});
