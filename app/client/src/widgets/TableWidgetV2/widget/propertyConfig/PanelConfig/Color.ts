import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import { hideByColumnType } from "../../propertyUtils";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnColorConfig() {
  return {
    sectionName: tableV2Text("style.color"),
    children: [
      {
        propertyName: "buttonColor",
        label: tableV2Text("menu.buttonColor"),
        controlType: "PRIMARY_COLUMNS_COLOR_PICKER_V2",
        helpText: tableV2Text("help.buttonColor"),
        isJSConvertible: true,
        customJSControl: "TABLE_COMPUTE_VALUE",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.BUTTON,
            ColumnTypes.ICON_BUTTON,
          ]);
        },
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
            params: {
              regex: /^(?![<|{{]).+/,
            },
          },
        },
        isTriggerProperty: false,
      },
      {
        propertyName: "menuColor",
        helpText: tableV2Text("help.menuColor"),
        label: tableV2Text("menu.buttonColor"),
        controlType: "PRIMARY_COLUMNS_COLOR_PICKER_V2",
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        placeholderText: "#FFFFFF / Gray / rgb(255, 99, 71)",
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
            params: {
              regex: /^(?![<|{{]).+/,
            },
          },
        },
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.MENU_BUTTON,
          ]);
        },
        dependencies: ["primaryColumns", "columnOrder", "childStylesheet"],
      },
      {
        propertyName: "cellBackground",
        label: tableV2Text("help.cellBackgroundLabel"),
        helpText: tableV2Text("help.cellBackground"),
        controlType: "PRIMARY_COLUMNS_COLOR_PICKER_V2",
        isJSConvertible: true,
        customJSControl: "TABLE_COMPUTE_VALUE",
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
            params: {
              regex: /^(?![<|{{]).+/,
            },
          },
        },
        isTriggerProperty: false,
      },
      {
        propertyName: "textColor",
        label: tableV2Text("style.textColor"),
        helpText: tableV2Text("help.textColor"),
        controlType: "PRIMARY_COLUMNS_COLOR_PICKER_V2",
        isJSConvertible: true,
        customJSControl: "TABLE_COMPUTE_VALUE",
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
            params: {
              regex: /^(?![<|{{]).+/,
            },
          },
        },
        isTriggerProperty: false,
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.TEXT,
            ColumnTypes.DATE,
            ColumnTypes.NUMBER,
            ColumnTypes.CURRENCY,
            ColumnTypes.URL,
          ]);
        },
      },
    ],
  };
}
