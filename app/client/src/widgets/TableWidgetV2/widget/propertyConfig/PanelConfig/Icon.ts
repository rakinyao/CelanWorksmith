import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes, ICON_NAMES } from "widgets/TableWidgetV2/constants";
import { hideByColumnType, updateIconAlignment } from "../../propertyUtils";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnIconConfig() {
  return {
    sectionName: tableV2Text("column.icon"),
    children: [
      {
        propertyName: "menuButtoniconName",
        label: tableV2Text("menu.icon"),
        helpText: tableV2Text("help.menuButtonIcon"),
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.MENU_BUTTON,
          ]);
        },
        updateHook: updateIconAlignment,
        dependencies: ["primaryColumns", "columnOrder"],
        controlType: "ICON_SELECT",
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
            params: {
              allowedValues: ICON_NAMES,
            },
          },
        },
      },
      {
        propertyName: "iconAlign",
        label: tableV2Text("menu.position"),
        helpText: tableV2Text("help.menuButtonIconAlignment"),
        controlType: "ICON_TABS",
        defaultValue: "left",
        fullWidth: false,
        options: [
          {
            startIcon: "skip-left-line",
            value: "left",
          },
          {
            startIcon: "skip-right-line",
            value: "right",
          },
        ],
        isBindProperty: false,
        isTriggerProperty: false,
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.MENU_BUTTON,
          ]);
        },
        dependencies: ["primaryColumns", "columnOrder"],
        validation: {
          type: ValidationTypes.TEXT,
          params: {
            allowedValues: ["left", "right"],
          },
        },
      },
    ],
  };
}
