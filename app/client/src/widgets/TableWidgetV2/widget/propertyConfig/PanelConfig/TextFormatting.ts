import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import { hideByColumnType, showByColumnType } from "../../propertyUtils";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnTextFormattingConfig() {
  return {
    sectionName: tableV2Text("column.textFormatting"),
    hidden: (props: TableWidgetProps, propertyPath: string) => {
      return showByColumnType(
        props,
        propertyPath,
        [ColumnTypes.CHECKBOX, ColumnTypes.SWITCH],
        true,
      );
    },
    children: [
      {
        propertyName: "textSize",
        label: tableV2Text("column.textSize"),
        helpText: tableV2Text("help.textSize"),
        controlType: "DROP_DOWN",
        isJSConvertible: true,
        customJSControl: "TABLE_COMPUTE_VALUE",
        options: [
          {
            label: tableV2Text("option.s"),
            value: "0.875rem",
            subText: "0.875rem",
          },
          {
            label: tableV2Text("option.m"),
            value: "1rem",
            subText: "1rem",
          },
          {
            label: tableV2Text("option.l"),
            value: "1.25rem",
            subText: "1.25rem",
          },
          {
            label: tableV2Text("option.xl"),
            value: "1.875rem",
            subText: "1.875rem",
          },
        ],
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
          },
        },
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
      {
        propertyName: "fontStyle",
        label: tableV2Text("column.emphasis"),
        helpText: tableV2Text("help.emphasis"),
        controlType: "BUTTON_GROUP",
        options: [
          {
            icon: "text-bold",
            value: "BOLD",
          },
          {
            icon: "text-italic",
            value: "ITALIC",
          },
          {
            icon: "text-underline",
            value: "UNDERLINE",
          },
        ],
        isJSConvertible: true,
        customJSControl: "TABLE_COMPUTE_VALUE",
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
          },
        },
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
      {
        propertyName: "horizontalAlignment",
        label: tableV2Text("column.textAlign"),
        helpText: tableV2Text("help.textAlign"),
        controlType: "ICON_TABS",
        fullWidth: true,
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
          ]);
        },
      },
      {
        propertyName: "verticalAlignment",
        label: tableV2Text("column.verticalAlignment"),
        helpText: tableV2Text("help.verticalAlignment"),
        controlType: "ICON_TABS",
        fullWidth: true,
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
          ]);
        },
      },
    ],
  };
}
