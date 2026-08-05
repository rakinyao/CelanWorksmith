import { extractCurrentDSL } from "utils/WidgetPropsUtils";
import { registerWidgets } from "WidgetProvider/factory/registrationHelper";
import { loadWidget } from "widgets";
import { OBJECT_DETAIL_WIDGET_TYPE } from "./constants";

const displayModes = [
  "BUSINESS_ONLY",
  "BUSINESS_AND_DERIVED",
  "ALL_METADATA",
] as const;

describe("ObjectDetailWidget DSL compatibility", () => {
  beforeAll(async () => {
    registerWidgets([await loadWidget(OBJECT_DETAIL_WIDGET_TYPE)]);
  });

  test.each(displayModes)(
    "preserves objectData binding and %s display mode",
    async (displayMode) => {
      const { dsl } = await extractCurrentDSL({
        response: {
          data: {
            layouts: [
              {
                id: "layout-1",
                dsl: {
                  type: "CANVAS_WIDGET",
                  widgetId: "Canvas1",
                  widgetName: "Canvas",
                  children: [
                    {
                      type: OBJECT_DETAIL_WIDGET_TYPE,
                      widgetId: "ObjectDetail1",
                      widgetName: "ObjectDetail",
                      objectData: "{{Table1.selectedRow}}",
                      displayMode,
                      rows: 16,
                      columns: 24,
                    },
                  ],
                },
              },
            ],
          },
        } as never,
      });

      const objectDetail = dsl.children?.[0];

      expect(objectDetail?.type).toBe(OBJECT_DETAIL_WIDGET_TYPE);
      expect(objectDetail?.objectData).toBe("{{Table1.selectedRow}}");
      expect(objectDetail?.displayMode).toBe(displayMode);
    },
  );
});
