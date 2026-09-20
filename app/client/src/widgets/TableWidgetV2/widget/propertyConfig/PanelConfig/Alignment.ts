import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import { hideByColumnType } from "../../propertyUtils";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnAlignmentConfig() {
  return {
    sectionName: tableV2Text("column.alignment"),
    hidden: (props: TableWidgetProps, propertyPath: string) => {
      return hideByColumnType(
        props,
        propertyPath,
        [ColumnTypes.CHECKBOX, ColumnTypes.SWITCH, ColumnTypes.BUTTON],
        true,
      );
    },
    children: [
      {
        propertyName: "horizontalAlignment",
        label: tableV2Text("column.horizontalAlignment"),
        helpText: tableV2Text("help.textAlign"),
        controlType: "ICON_TABS",
        options: [
          {
            startIcon: "align-left",
            value: "LEFT",
          },
          {
            startIcon: "align-center",
            value: "CENTER",
          },
          {
            startIcon: "align-right",
            value: "RIGHT",
          },
        ],
        defaultValue: "LEFT",
        isJSConvertible: true,
        customJSControl: "TABLE_COMPUTE_VALUE",
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
            params: {
              allowedValues: ["LEFT", "CENTER", "RIGHT"],
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
            ColumnTypes.CHECKBOX,
            ColumnTypes.SWITCH,
            ColumnTypes.BUTTON,
          ]);
        },
      },
      {
        propertyName: "verticalAlignment",
        label: tableV2Text("column.verticalAlignment"),
        helpText: tableV2Text("help.verticalAlignment"),
        controlType: "ICON_TABS",
        options: [
          {
            startIcon: "vertical-align-top",
            value: "TOP",
          },
          {
            startIcon: "vertical-align-middle",
            value: "CENTER",
          },
          {
            startIcon: "vertical-align-bottom",
            value: "BOTTOM",
          },
        ],
        defaultValue: "CENTER",
        isJSConvertible: true,
        customJSControl: "TABLE_COMPUTE_VALUE",
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
            params: {
              allowedValues: ["TOP", "CENTER", "BOTTOM"],
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
            ColumnTypes.CHECKBOX,
            ColumnTypes.SWITCH,
            ColumnTypes.BUTTON,
          ]);
        },
      },
    ],
  };
}
