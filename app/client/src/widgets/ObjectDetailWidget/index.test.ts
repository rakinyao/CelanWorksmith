import WidgetFactory from "WidgetProvider/factory";
import { registerWidgets } from "WidgetProvider/factory/registrationHelper";
import { loadWidget } from "widgets";
import { OBJECT_DETAIL_WIDGET_TYPE } from "./constants";

describe("ObjectDetailWidget registration", () => {
  it("loads the widget through the dynamic widget registry", async () => {
    const widget = await loadWidget(OBJECT_DETAIL_WIDGET_TYPE);

    expect(widget.type).toBe(OBJECT_DETAIL_WIDGET_TYPE);
    expect(widget.getDefaults()).toMatchObject({
      objectData: undefined,
      displayMode: "BUSINESS_ONLY",
      widgetName: "ObjectDetail",
      version: 1,
      rows: 16,
      columns: 24,
    });
  });

  it("registers the loaded widget in WidgetFactory", async () => {
    const widget = await loadWidget(OBJECT_DETAIL_WIDGET_TYPE);

    registerWidgets([widget]);

    expect(WidgetFactory.get(OBJECT_DETAIL_WIDGET_TYPE)).toBe(widget);
  });
});
