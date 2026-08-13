import WidgetFactory from "WidgetProvider/factory";
import { registerWidgets } from "WidgetProvider/factory/registrationHelper";
import { loadWidget } from "widgets";
import { ACTION_BUTTON_WIDGET_TYPE } from "./constants";

describe("ActionButtonWidget registration", () => {
  test("loads with T5-compatible defaults and registers", async () => {
    const widget = await loadWidget(ACTION_BUTTON_WIDGET_TYPE);

    expect(widget.type).toBe(ACTION_BUTTON_WIDGET_TYPE);
    expect(widget.getDefaults()).toMatchObject({
      widgetName: "ActionButton",
      version: 1,
      actionId: undefined,
    });
    expect(widget.getMetaPropertiesMap()).toEqual({
      executionId: undefined,
      executionProgress: 0,
      executionStatus: "idle",
      lastResult: undefined,
      lastError: undefined,
      requestId: undefined,
    });

    registerWidgets([widget]);
    expect(WidgetFactory.get(ACTION_BUTTON_WIDGET_TYPE)).toBe(widget);
  });
});
