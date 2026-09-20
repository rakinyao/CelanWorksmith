import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import {
  hideByColumnType,
  removeBoxShadowColorProp,
} from "../../propertyUtils";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnBorderAndShadowConfig() {
  return {
    sectionName: tableV2Text("style.borderAndShadow"),
    children: [
      {
        propertyName: "borderRadius",
        label: tableV2Text("style.borderRadius"),
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        helpText: tableV2Text("help.borderRadius"),
        controlType: "BORDER_RADIUS_OPTIONS",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.ICON_BUTTON,
            ColumnTypes.MENU_BUTTON,
            ColumnTypes.BUTTON,
          ]);
        },
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
          },
        },
      },
      {
        propertyName: "boxShadow",
        label: tableV2Text("style.boxShadow"),
        helpText: tableV2Text("help.boxShadow"),
        controlType: "BOX_SHADOW_OPTIONS",
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        updateHook: removeBoxShadowColorProp,
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.ICON_BUTTON,
            ColumnTypes.MENU_BUTTON,
            ColumnTypes.BUTTON,
          ]);
        },
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
          },
        },
      },
    ],
  };
}
