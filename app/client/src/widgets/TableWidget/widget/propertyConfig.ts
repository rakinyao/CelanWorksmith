import { get } from "lodash";
import type { TableWidgetProps } from "../constants";
import { ValidationTypes } from "constants/WidgetValidation";
import { EvaluationSubstitutionType } from "constants/EvaluationConstants";
import { AutocompleteDataType } from "utils/autocomplete/AutocompleteDataType";
import type { PropertyPaneConfig } from "constants/PropertyControlConstants";
import { ButtonVariantTypes } from "components/constants";
import {
  updateDerivedColumnsHook,
  ColumnTypes,
  defaultSelectedRowValidation,
  totalRecordsCountValidation,
  updateColumnStyles,
  updateIconAlignmentHook,
  getBasePropertyPath,
  hideByColumnType,
  uniqueColumnNameValidation,
  removeBoxShadowColorProp,
  updateIconNameHook,
} from "./propertyUtils";
import { IconNames } from "@blueprintjs/icons";
import { getPrimaryColumnStylesheetValue } from "./helpers";
import i18n from "i18n";

const ICON_NAMES = Object.keys(IconNames).map(
  (name: string) => IconNames[name as keyof typeof IconNames],
);

const HIDE_BY_COLUMN_TYPES = {
  COMPUTED_VALUES: new Set([
    ColumnTypes.DATE,
    ColumnTypes.IMAGE,
    ColumnTypes.NUMBER,
    ColumnTypes.TEXT,
    ColumnTypes.VIDEO,
    ColumnTypes.URL,
  ]),
  IS_DISABLED: new Set([
    ColumnTypes.ICON_BUTTON,
    ColumnTypes.MENU_BUTTON,
    ColumnTypes.BUTTON,
  ]),
  IS_COMPACT: new Set([ColumnTypes.MENU_BUTTON]),
  STYLES: new Set([
    ColumnTypes.TEXT,
    ColumnTypes.DATE,
    ColumnTypes.NUMBER,
    ColumnTypes.URL,
  ]),
  BUTTON_PROPERTIES: new Set([
    ColumnTypes.BUTTON,
    ColumnTypes.MENU_BUTTON,
    ColumnTypes.ICON_BUTTON,
  ]),
  ICON_NAME: new Set([ColumnTypes.ICON_BUTTON, ColumnTypes.MENU_BUTTON]),
  ICON_ALIGN: new Set([ColumnTypes.MENU_BUTTON]),
  MENU_BUTTON_LABEL: new Set([ColumnTypes.MENU_BUTTON]),
  BUTTON_LABEL: new Set([ColumnTypes.BUTTON]),
  BUTTON_COLOR: new Set([ColumnTypes.BUTTON, ColumnTypes.ICON_BUTTON]),
  BUTTON_VARIANT: new Set([ColumnTypes.BUTTON, ColumnTypes.ICON_BUTTON]),
  BORDER_RADIUS: new Set([
    ColumnTypes.ICON_BUTTON,
    ColumnTypes.MENU_BUTTON,
    ColumnTypes.BUTTON,
  ]),
  BOX_SHADOW: new Set([
    ColumnTypes.ICON_BUTTON,
    ColumnTypes.MENU_BUTTON,
    ColumnTypes.BUTTON,
  ]),
  MENU_COLOR: new Set([ColumnTypes.MENU_BUTTON]),
  MENU_VARIANT: new Set([ColumnTypes.MENU_BUTTON]),
  ON_CLICK: new Set([ColumnTypes.BUTTON, ColumnTypes.ICON_BUTTON]),
  MENU_OPTIONS: new Set([ColumnTypes.MENU_BUTTON]),
};

const tableText = (key: string) => i18n.t(`widgetProperty.table.${key}`);

export function getTablePropertyPaneConfig(): PropertyPaneConfig[] {
  // prettier-ignore
  return [
  {
    sectionName: tableText("sections.general"),
    children: [
      {
        helpText: tableText("help.tableData"),
        propertyName: "tableData",
        label: tableText("tableData"),
        controlType: "INPUT_TEXT",
        placeholderText: '[{ "name": "John" }]',
        inputType: "ARRAY",
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.OBJECT_ARRAY,
          params: {
            default: [],
          },
        },
        evaluationSubstitutionType: EvaluationSubstitutionType.SMART_SUBSTITUTE,
      },
      {
        helpText: tableText("help.columns"),
        propertyName: "primaryColumns",
        controlType: "PRIMARY_COLUMNS",
        label: tableText("columns"),
        updateHook: updateDerivedColumnsHook,
        dependencies: ["derivedColumns", "columnOrder", "childStylesheet"],
        isBindProperty: false,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.FUNCTION,
          params: {
            fn: uniqueColumnNameValidation,
            expected: {
              type: "Unique column names",
              example: "abc",
              autocompleteDataType: AutocompleteDataType.STRING,
            },
          },
        },
        panelConfig: {
          editableTitle: true,
          titlePropertyName: "label",
          panelIdPropertyName: "id",
          updateHook: updateDerivedColumnsHook,
          dependencies: ["primaryColumns", "derivedColumns", "columnOrder"],
          children: [
            {
              sectionName: tableText("sections.columnControl"),
              children: [
                {
                  propertyName: "columnType",
                  label: tableText("labels.columnType"),
                  controlType: "DROP_DOWN",
                  customJSControl: "COMPUTE_VALUE",
                  options: [
                    {
                      label: tableText("labels.plainText"),
                      value: "text",
                    },
                    {
                      label: tableText("labels.url"),
                      value: "url",
                    },
                    {
                      label: tableText("display.number"),
                      value: "number",
                    },
                    {
                      label: tableText("labels.image"),
                      value: "image",
                    },
                    {
                      label: tableText("labels.video"),
                      value: "video",
                    },
                    {
                      label: tableText("labels.date"),
                      value: "date",
                    },
                    {
                      label: tableText("labels.button"),
                      value: "button",
                    },
                    {
                      label: tableText("labels.menuButton"),
                      value: "menuButton",
                    },
                    {
                      label: tableText("labels.iconButton"),
                      value: "iconButton",
                    },
                  ],
                  updateHook: updateIconNameHook,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                    "childStylesheet",
                  ],
                  isBindProperty: false,
                  isTriggerProperty: false,
                },
                {
                  propertyName: "displayText",
                  label: tableText("labels.displayText"),
                  controlType: "COMPUTE_VALUE",
                  customJSControl: "COMPUTE_VALUE",
                  updateHook: updateDerivedColumnsHook,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    const baseProperty = getBasePropertyPath(propertyPath);
                    const columnType = get(
                      props,
                      `${baseProperty}.columnType`,
                      "",
                    );

                    return columnType !== "url";
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  isBindProperty: false,
                  isTriggerProperty: false,
                },
                {
                  helpText: tableText("help.computedValue"),
                  propertyName: "computedValue",
                  label: tableText("labels.computedValue"),
                  controlType: "COMPUTE_VALUE",
                  updateHook: updateDerivedColumnsHook,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.COMPUTED_VALUES,
                    );
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  isBindProperty: true,
                  isTriggerProperty: false,
                },
                {
                  propertyName: "isCellVisible",
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnType",
                  ],
                  label: tableText("labels.visible"),
                  helpText: tableText("help.visible"),
                  updateHook: updateDerivedColumnsHook,
                  defaultValue: true,
                  controlType: "SWITCH",
                  customJSControl: "COMPUTE_VALUE",
                  isJSConvertible: true,
                  isBindProperty: true,
                  isTriggerProperty: false,
                  validation: {
                    type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
                    params: {
                      type: ValidationTypes.BOOLEAN,
                    },
                  },
                },
                {
                  propertyName: "isDisabled",
                  label: tableText("labels.disabled"),
                  updateHook: updateDerivedColumnsHook,
                  defaultValue: false,
                  controlType: "SWITCH",
                  customJSControl: "COMPUTE_VALUE",
                  isJSConvertible: true,
                  isBindProperty: true,
                  isTriggerProperty: false,
                  validation: {
                    type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
                    params: {
                      type: ValidationTypes.BOOLEAN,
                    },
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.IS_DISABLED,
                    );
                  },
                },
                {
                  propertyName: "isCompact",
                  helpText: tableText("help.compact"),
                  updateHook: updateDerivedColumnsHook,
                  label: tableText("labels.compact"),
                  controlType: "SWITCH",
                  customJSControl: "COMPUTE_VALUE",
                  isJSConvertible: true,
                  isBindProperty: true,
                  validation: {
                    type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
                    params: {
                      type: ValidationTypes.BOOLEAN,
                    },
                  },
                  isTriggerProperty: false,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.IS_COMPACT,
                    );
                  },
                },
                {
                  propertyName: "inputFormat",
                  label: tableText("labels.originalDateFormat"),
                  controlType: "DROP_DOWN",
                  options: [
                    {
                      label: "UNIX timestamp (s)",
                      value: "Epoch",
                    },
                    {
                      label: "UNIX timestamp (ms)",
                      value: "Milliseconds",
                    },
                    {
                      label: "YYYY-MM-DD",
                      value: "YYYY-MM-DD",
                    },
                    {
                      label: "YYYY-MM-DD HH:mm",
                      value: "YYYY-MM-DD HH:mm",
                    },
                    {
                      label: "ISO 8601",
                      value: "YYYY-MM-DDTHH:mm:ss.SSSZ",
                    },
                    {
                      label: "YYYY-MM-DDTHH:mm:ss",
                      value: "YYYY-MM-DDTHH:mm:ss",
                    },
                    {
                      label: "YYYY-MM-DD hh:mm:ss",
                      value: "YYYY-MM-DD hh:mm:ss",
                    },
                    {
                      label: "Do MMM YYYY",
                      value: "Do MMM YYYY",
                    },
                    {
                      label: "DD/MM/YYYY",
                      value: "DD/MM/YYYY",
                    },
                    {
                      label: "DD/MM/YYYY HH:mm",
                      value: "DD/MM/YYYY HH:mm",
                    },
                    {
                      label: "LLL",
                      value: "LLL",
                    },
                    {
                      label: "LL",
                      value: "LL",
                    },
                    {
                      label: "D MMMM, YYYY",
                      value: "D MMMM, YYYY",
                    },
                    {
                      label: "H:mm A D MMMM, YYYY",
                      value: "H:mm A D MMMM, YYYY",
                    },
                    {
                      label: "MM-DD-YYYY",
                      value: "MM-DD-YYYY",
                    },
                    {
                      label: "DD-MM-YYYY",
                      value: "DD-MM-YYYY",
                    },
                    {
                      label: "MM/DD/YYYY",
                      value: "MM/DD/YYYY",
                    },
                    {
                      label: "DD/MM/YYYY",
                      value: "DD/MM/YYYY",
                    },
                    {
                      label: "DD/MM/YY",
                      value: "DD/MM/YY",
                    },
                    {
                      label: "MM/DD/YY",
                      value: "MM/DD/YY",
                    },
                  ],
                  defaultValue: "YYYY-MM-DD HH:mm",
                  customJSControl: "COMPUTE_VALUE",
                  isJSConvertible: true,
                  updateHook: updateDerivedColumnsHook,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    const baseProperty = getBasePropertyPath(propertyPath);
                    const columnType = get(
                      props,
                      `${baseProperty}.columnType`,
                      "",
                    );

                    return columnType !== "date";
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  isBindProperty: true,
                  validation: {
                    type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
                    params: {
                      type: ValidationTypes.TEXT,
                      params: {
                        allowedValues: [
                          "YYYY-MM-DDTHH:mm:ss.SSSZ",
                          "Epoch",
                          "Milliseconds",
                          "YYYY-MM-DD",
                          "YYYY-MM-DD HH:mm",
                          "YYYY-MM-DDTHH:mm:ss.sssZ",
                          "YYYY-MM-DDTHH:mm:ss",
                          "YYYY-MM-DD hh:mm:ss",
                          "Do MMM YYYY",
                          "DD/MM/YYYY",
                          "DD/MM/YYYY HH:mm",
                          "LLL",
                          "LL",
                          "D MMMM, YYYY",
                          "H:mm A D MMMM, YYYY",
                          "MM-DD-YYYY",
                          "DD-MM-YYYY",
                          "MM/DD/YYYY",
                          "DD/MM/YYYY",
                          "DD/MM/YY",
                          "MM/DD/YY",
                        ],
                      },
                    },
                  },
                  isTriggerProperty: false,
                },
                {
                  propertyName: "outputFormat",
                  label: tableText("labels.displayDateFormat"),
                  controlType: "DROP_DOWN",
                  customJSControl: "COMPUTE_VALUE",
                  isJSConvertible: true,
                  options: [
                    {
                      label: "UNIX timestamp (s)",
                      value: "Epoch",
                    },
                    {
                      label: "UNIX timestamp (ms)",
                      value: "Milliseconds",
                    },
                    {
                      label: "YYYY-MM-DD",
                      value: "YYYY-MM-DD",
                    },
                    {
                      label: "YYYY-MM-DD HH:mm",
                      value: "YYYY-MM-DD HH:mm",
                    },
                    {
                      label: "ISO 8601",
                      value: "YYYY-MM-DDTHH:mm:ss.SSSZ",
                    },
                    {
                      label: "YYYY-MM-DDTHH:mm:ss",
                      value: "YYYY-MM-DDTHH:mm:ss",
                    },
                    {
                      label: "YYYY-MM-DD hh:mm:ss",
                      value: "YYYY-MM-DD hh:mm:ss",
                    },
                    {
                      label: "Do MMM YYYY",
                      value: "Do MMM YYYY",
                    },
                    {
                      label: "DD/MM/YYYY",
                      value: "DD/MM/YYYY",
                    },
                    {
                      label: "DD/MM/YYYY HH:mm",
                      value: "DD/MM/YYYY HH:mm",
                    },
                    {
                      label: "LLL",
                      value: "LLL",
                    },
                    {
                      label: "LL",
                      value: "LL",
                    },
                    {
                      label: "D MMMM, YYYY",
                      value: "D MMMM, YYYY",
                    },
                    {
                      label: "H:mm A D MMMM, YYYY",
                      value: "H:mm A D MMMM, YYYY",
                    },
                    {
                      label: "MM-DD-YYYY",
                      value: "MM-DD-YYYY",
                    },
                    {
                      label: "DD-MM-YYYY",
                      value: "DD-MM-YYYY",
                    },
                    {
                      label: "MM/DD/YYYY",
                      value: "MM/DD/YYYY",
                    },
                    {
                      label: "DD/MM/YYYY",
                      value: "DD/MM/YYYY",
                    },
                    {
                      label: "DD/MM/YY",
                      value: "DD/MM/YY",
                    },
                    {
                      label: "MM/DD/YY",
                      value: "MM/DD/YY",
                    },
                  ],
                  defaultValue: "YYYY-MM-DD HH:mm",
                  updateHook: updateDerivedColumnsHook,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    const baseProperty = getBasePropertyPath(propertyPath);
                    const columnType = get(
                      props,
                      `${baseProperty}.columnType`,
                      "",
                    );

                    return columnType !== "date";
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnType",
                  ],
                  isBindProperty: true,
                  validation: {
                    type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
                    params: {
                      type: ValidationTypes.TEXT,
                      params: {
                        allowedValues: [
                          "YYYY-MM-DDTHH:mm:ss.SSSZ",
                          "Epoch",
                          "Milliseconds",
                          "YYYY-MM-DD",
                          "YYYY-MM-DD HH:mm",
                          "YYYY-MM-DDTHH:mm:ss.sssZ",
                          "YYYY-MM-DDTHH:mm:ss",
                          "YYYY-MM-DD hh:mm:ss",
                          "Do MMM YYYY",
                          "DD/MM/YYYY",
                          "DD/MM/YYYY HH:mm",
                          "LLL",
                          "LL",
                          "D MMMM, YYYY",
                          "H:mm A D MMMM, YYYY",
                          "MM-DD-YYYY",
                          "DD-MM-YYYY",
                          "MM/DD/YYYY",
                          "DD/MM/YYYY",
                          "DD/MM/YY",
                          "MM/DD/YY",
                        ],
                      },
                    },
                  },
                  isTriggerProperty: false,
                },
                {
                  propertyName: "onClick",
                  label: "onClick",
                  controlType: "ACTION_SELECTOR",
                  updateHook: updateDerivedColumnsHook,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    const baseProperty = getBasePropertyPath(propertyPath);
                    const columnType = get(
                      props,
                      `${baseProperty}.columnType`,
                      "",
                    );

                    return columnType !== "image";
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  isJSConvertible: true,
                  isBindProperty: true,
                  isTriggerProperty: true,
                },
              ],
            },
            {
              sectionName: tableText("sections.styles"),
              hidden: (props: TableWidgetProps, propertyPath: string) => {
                return hideByColumnType(
                  props,
                  propertyPath,
                  HIDE_BY_COLUMN_TYPES.STYLES,
                  true,
                );
              },
              dependencies: ["primaryColumns", "derivedColumns"],
              children: [
                {
                  propertyName: "horizontalAlignment",
                  label: tableText("labels.textAlign"),
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
                  customJSControl: "COMPUTE_VALUE",
                  updateHook: updateDerivedColumnsHook,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
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
                },
                {
                  propertyName: "textSize",
                  label: tableText("labels.textSize"),
                  controlType: "DROP_DOWN",
                  isJSConvertible: true,
                  customJSControl: "COMPUTE_VALUE",
                  options: [
                    {
                      label: "S",
                      value: "0.875rem",
                      subText: "0.875rem",
                    },
                    {
                      label: "M",
                      value: "1rem",
                      subText: "1rem",
                    },
                    {
                      label: "L",
                      value: "1.25rem",
                      subText: "1.25rem",
                    },
                    {
                      label: "XL",
                      value: "1.875rem",
                      subText: "1.875rem",
                    },
                  ],
                  validation: {
                    type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
                    params: {
                      type: ValidationTypes.TEXT,
                    },
                  },
                  updateHook: updateDerivedColumnsHook,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  isBindProperty: true,
                  isTriggerProperty: false,
                },
                {
                  propertyName: "fontStyle",
                  label: tableText("labels.fontStyle"),
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
                  customJSControl: "COMPUTE_VALUE",
                  updateHook: updateDerivedColumnsHook,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
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
                  propertyName: "verticalAlignment",
                  label: tableText("labels.verticalAlignment"),
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
                  customJSControl: "COMPUTE_VALUE",
                  updateHook: updateDerivedColumnsHook,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
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
                },
                {
                  propertyName: "textColor",
                  label: tableText("display.textColor"),
                  controlType: "PRIMARY_COLUMNS_COLOR_PICKER",
                  isJSConvertible: true,
                  customJSControl: "COMPUTE_VALUE",
                  updateHook: updateDerivedColumnsHook,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
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
                  propertyName: "cellBackground",
                  label: tableText("labels.cellBackground"),
                  controlType: "PRIMARY_COLUMNS_COLOR_PICKER",
                  isJSConvertible: true,
                  customJSControl: "COMPUTE_VALUE",
                  updateHook: updateDerivedColumnsHook,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
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
              ],
            },
            {
              sectionName: tableText("sections.buttonProperties"),
              hidden: (props: TableWidgetProps, propertyPath: string) => {
                return hideByColumnType(
                  props,
                  propertyPath,
                  HIDE_BY_COLUMN_TYPES.BUTTON_PROPERTIES,
                  true,
                );
              },
              children: [
                {
                  propertyName: "iconName",
                  label: tableText("display.icon"),
                  helpText: tableText("help.icon"),
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.ICON_NAME,
                    );
                  },
                  updateHook: updateIconAlignmentHook,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  controlType: "ICON_SELECT",
                  customJSControl: "COMPUTE_VALUE",
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
                  label: tableText("labels.iconAlignment"),
                  helpText: tableText("help.iconAlignment"),
                  controlType: "ICON_TABS",
                  defaultValue: "left",
                  options: [
                    {
                      startIcon: "align-left",
                      value: "left",
                    },
                    {
                      startIcon: "align-right",
                      value: "right",
                    },
                  ],
                  isBindProperty: false,
                  isTriggerProperty: false,
                  updateHook: updateDerivedColumnsHook,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.ICON_ALIGN,
                    );
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  validation: {
                    type: ValidationTypes.TEXT,
                    params: {
                      allowedValues: ["center", "left", "right"],
                    },
                  },
                },
                {
                  propertyName: "buttonLabel",
                  label: tableText("labels.label"),
                  controlType: "COMPUTE_VALUE",
                  defaultValue: "Action",
                  updateHook: updateDerivedColumnsHook,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.BUTTON_LABEL,
                    );
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  isBindProperty: true,
                  isTriggerProperty: false,
                },
                {
                  propertyName: "menuButtonLabel",
                  label: tableText("labels.label"),
                  controlType: "COMPUTE_VALUE",
                  defaultValue: "Open Menu",
                  updateHook: updateDerivedColumnsHook,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.MENU_BUTTON_LABEL,
                    );
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  isBindProperty: true,
                  isTriggerProperty: false,
                },
                {
                  propertyName: "buttonColor",
                  getStylesheetValue: getPrimaryColumnStylesheetValue,
                  label: tableText("display.buttonColor"),
                  controlType: "PRIMARY_COLUMNS_COLOR_PICKER",
                  helpText: tableText("help.buttonColor"),
                  isJSConvertible: true,
                  customJSControl: "COMPUTE_VALUE",
                  updateHook: updateDerivedColumnsHook,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.BUTTON_COLOR,
                    );
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
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
                  propertyName: "buttonVariant",
                  label: tableText("display.buttonVariant"),
                  controlType: "DROP_DOWN",
                  customJSControl: "COMPUTE_VALUE",
                  defaultValue: ButtonVariantTypes.PRIMARY,
                  isJSConvertible: true,
                  helpText: tableText("help.buttonVariant"),
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.BUTTON_VARIANT,
                    );
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  options: [
                    {
                      label: tableText("options.primary"),
                      value: ButtonVariantTypes.PRIMARY,
                    },
                    {
                      label: tableText("options.secondary"),
                      value: ButtonVariantTypes.SECONDARY,
                    },
                    {
                      label: tableText("options.tertiary"),
                      value: ButtonVariantTypes.TERTIARY,
                    },
                  ],
                  isBindProperty: true,
                  isTriggerProperty: false,
                  validation: {
                    type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
                    params: {
                      type: ValidationTypes.TEXT,
                      params: {
                        default: ButtonVariantTypes.PRIMARY,
                        allowedValues: [
                          ButtonVariantTypes.PRIMARY,
                          ButtonVariantTypes.SECONDARY,
                          ButtonVariantTypes.TERTIARY,
                        ],
                      },
                    },
                  },
                },
                {
                  propertyName: "borderRadius",
                  label: tableText("display.borderRadius"),
                  customJSControl: "COMPUTE_VALUE",
                  isJSConvertible: true,
                  getStylesheetValue: getPrimaryColumnStylesheetValue,
                  helpText: tableText("help.borderRadius"),
                  controlType: "BORDER_RADIUS_OPTIONS",
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.BORDER_RADIUS,
                    );
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
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
                  label: tableText("display.boxShadow"),
                  helpText: tableText("help.boxShadow"),
                  controlType: "BOX_SHADOW_OPTIONS",
                  customJSControl: "COMPUTE_VALUE",
                  isJSConvertible: true,
                  updateHook: removeBoxShadowColorProp,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.BOX_SHADOW,
                    );
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
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
                  propertyName: "menuColor",
                  helpText: tableText("help.menuColor"),
                  label: tableText("labels.menuColor"),
                  controlType: "PRIMARY_COLUMNS_COLOR_PICKER",
                  customJSControl: "COMPUTE_VALUE",
                  isJSConvertible: true,
                  isBindProperty: true,
                  getStylesheetValue: getPrimaryColumnStylesheetValue,
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
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.MENU_COLOR,
                    );
                  },
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  // Remove menu Style once Custom is Chosen
                  updateHook: updateDerivedColumnsHook,
                },
                {
                  propertyName: "menuVariant",
                  label: tableText("labels.menuVariant"),
                  controlType: "DROP_DOWN",
                  helpText: tableText("help.menuVariant"),
                  options: [
                    {
                      label: tableText("options.primary"),
                      value: ButtonVariantTypes.PRIMARY,
                    },
                    {
                      label: tableText("options.secondary"),
                      value: ButtonVariantTypes.SECONDARY,
                    },
                    {
                      label: tableText("options.tertiary"),
                      value: ButtonVariantTypes.TERTIARY,
                    },
                  ],
                  isJSConvertible: true,
                  updateHook: updateDerivedColumnsHook,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.MENU_VARIANT,
                    );
                  },
                  isBindProperty: true,
                  isTriggerProperty: false,
                  validation: {
                    type: ValidationTypes.TEXT,
                    params: {
                      default: ButtonVariantTypes.PRIMARY,
                      allowedValues: [
                        ButtonVariantTypes.PRIMARY,
                        ButtonVariantTypes.SECONDARY,
                        ButtonVariantTypes.TERTIARY,
                      ],
                    },
                  },
                },
                {
                  helpText: tableText("help.onClick"),
                  propertyName: "onClick",
                  label: "onClick",
                  controlType: "ACTION_SELECTOR",
                  additionalAutoComplete: (props: TableWidgetProps) => ({
                    currentRow: Object.assign(
                      {},
                      ...Object.keys(props.primaryColumns).map((key) => ({
                        [key]: "",
                      })),
                    ),
                  }),
                  isJSConvertible: true,
                  dependencies: [
                    "primaryColumns",
                    "derivedColumns",
                    "columnOrder",
                  ],
                  isBindProperty: true,
                  isTriggerProperty: true,
                  hidden: (props: TableWidgetProps, propertyPath: string) => {
                    return hideByColumnType(
                      props,
                      propertyPath,
                      HIDE_BY_COLUMN_TYPES.ON_CLICK,
                    );
                  },
                },
              ],
            },
            {
              sectionName: tableText("sections.menuItems"),
              hidden: (props: TableWidgetProps, propertyPath: string) => {
                return hideByColumnType(
                  props,
                  propertyPath,
                  HIDE_BY_COLUMN_TYPES.MENU_OPTIONS,
                  true,
                );
              },
              updateHook: updateDerivedColumnsHook,
              children: [
                {
                  helpText: tableText("help.menuItems"),
                  propertyName: "menuItems",
                  controlType: "MENU_ITEMS",
                  label: "",
                  isBindProperty: false,
                  isTriggerProperty: false,
                  dependencies: ["derivedColumns", "columnOrder"],
                  panelConfig: {
                    editableTitle: true,
                    titlePropertyName: "label",
                    panelIdPropertyName: "id",
                    updateHook: updateDerivedColumnsHook,
                    dependencies: [
                      "primaryColumns",
                      "derivedColumns",
                      "columnOrder",
                    ],
                    children: [
                      {
                        sectionName: tableText("sections.general"),
                        children: [
                          {
                            propertyName: "label",
                            helpText: tableText("help.menuLabel"),
                            label: tableText("labels.label"),
                            controlType: "INPUT_TEXT",
                            placeholderText: tableText(
                              "placeholders.menuLabel",
                            ),
                            isBindProperty: true,
                            isTriggerProperty: false,
                            validation: { type: ValidationTypes.TEXT },
                            updateHook: updateDerivedColumnsHook,

                            dependencies: [
                              "primaryColumns",
                              "derivedColumns",
                              "columnOrder",
                            ],
                          },
                          {
                            propertyName: "backgroundColor",
                            helpText: tableText("help.menuBackgroundColor"),
                            label: tableText("display.backgroundColor"),
                            controlType: "PRIMARY_COLUMNS_COLOR_PICKER",
                            isJSConvertible: true,
                            isBindProperty: true,
                            isTriggerProperty: false,
                            updateHook: updateDerivedColumnsHook,

                            dependencies: [
                              "primaryColumns",
                              "derivedColumns",
                              "columnOrder",
                            ],
                            validation: { type: ValidationTypes.TEXT },
                          },
                          {
                            propertyName: "textColor",
                            helpText: tableText("help.menuTextColor"),
                            label: tableText("display.textColor"),
                            controlType: "PRIMARY_COLUMNS_COLOR_PICKER",
                            isBindProperty: false,
                            isTriggerProperty: false,
                            updateHook: updateDerivedColumnsHook,

                            dependencies: [
                              "primaryColumns",
                              "derivedColumns",
                              "columnOrder",
                            ],
                          },
                          {
                            propertyName: "isDisabled",
                            helpText: tableText("help.menuDisabled"),
                            label: tableText("labels.disabled"),
                            controlType: "SWITCH",
                            isJSConvertible: true,
                            isBindProperty: true,
                            isTriggerProperty: false,
                            validation: { type: ValidationTypes.BOOLEAN },
                            updateHook: updateDerivedColumnsHook,

                            dependencies: [
                              "primaryColumns",
                              "derivedColumns",
                              "columnOrder",
                            ],
                          },
                          {
                            propertyName: "isVisible",
                            helpText: tableText("help.isVisible"),
                            label: tableText("labels.visible"),
                            controlType: "SWITCH",
                            isJSConvertible: true,
                            isBindProperty: true,
                            isTriggerProperty: false,
                            validation: { type: ValidationTypes.BOOLEAN },
                            updateHook: updateDerivedColumnsHook,

                            dependencies: [
                              "primaryColumns",
                              "derivedColumns",
                              "columnOrder",
                            ],
                          },
                        ],
                      },
                      {
                        sectionName: tableText("sections.iconOptions"),
                        children: [
                          {
                            propertyName: "iconName",
                            label: tableText("display.icon"),
                            helpText: tableText("help.menuIcon"),
                            controlType: "ICON_SELECT",
                            isBindProperty: false,
                            isTriggerProperty: false,
                            validation: { type: ValidationTypes.TEXT },
                            updateHook: updateDerivedColumnsHook,
                            dependencies: [
                              "primaryColumns",
                              "derivedColumns",
                              "columnOrder",
                            ],
                          },
                          {
                            propertyName: "iconColor",
                            helpText: tableText("help.menuIconColor"),
                            label: tableText("labels.iconColor"),
                            controlType: "PRIMARY_COLUMNS_COLOR_PICKER",
                            isBindProperty: false,
                            isTriggerProperty: false,
                            updateHook: updateDerivedColumnsHook,

                            dependencies: [
                              "primaryColumns",
                              "derivedColumns",
                              "columnOrder",
                            ],
                          },
                          {
                            propertyName: "iconAlign",
                            label: tableText("labels.iconAlignment"),
                            helpText: tableText("help.menuIconAlignment"),
                            controlType: "ICON_TABS",
                            defaultValue: "left",
                            options: [
                              {
                                startIcon: "align-left",
                                value: "left",
                              },
                              {
                                startIcon: "align-right",
                                value: "right",
                              },
                            ],
                            isBindProperty: false,
                            isTriggerProperty: false,
                            validation: { type: ValidationTypes.TEXT },
                            updateHook: updateDerivedColumnsHook,

                            dependencies: [
                              "primaryColumns",
                              "derivedColumns",
                              "columnOrder",
                            ],
                          },
                        ],
                      },
                      {
                        sectionName: tableText("sections.events"),
                        children: [
                          {
                            helpText: tableText("help.menuOnClick"),
                            propertyName: "onClick",
                            label: "onItemClick",
                            controlType: "ACTION_SELECTOR",
                            isJSConvertible: true,
                            isBindProperty: true,
                            isTriggerProperty: true,
                            dependencies: [
                              "primaryColumns",
                              "derivedColumns",
                              "columnOrder",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
      {
        helpText: tableText("help.primaryKeyColumn"),
        propertyName: "primaryColumnId",
        dependencies: ["primaryColumns"],
        label: tableText("labels.primaryKeyColumn"),
        controlType: "PRIMARY_COLUMNS_DROPDOWN",
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.TEXT },
      },
      {
        propertyName: "defaultSearchText",
        label: tableText("labels.defaultSearchText"),
        controlType: "INPUT_TEXT",
        placeholderText: "{{appsmith.user.name}}",
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.TEXT },
      },
      {
        helpText: tableText("help.defaultSelectedRow"),
        propertyName: "defaultSelectedRow",
        label: tableText("labels.defaultSelectedRow"),
        controlType: "INPUT_TEXT",
        placeholderText: "0",
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.FUNCTION,
          params: {
            fn: defaultSelectedRowValidation,
            expected: {
              type: "Index of row(s)",
              example: "0 | [0, 1]",
              autocompleteDataType: AutocompleteDataType.STRING,
            },
          },
        },
        dependencies: ["multiRowSelection"],
      },
      {
        propertyName: "compactMode",
        helpText: tableText("help.defaultRowHeight"),
        label: tableText("labels.defaultRowHeight"),
        controlType: "DROP_DOWN",
        defaultValue: "DEFAULT",
        isBindProperty: true,
        isTriggerProperty: false,
        options: [
          {
            label: tableText("labels.short"),
            value: "SHORT",
          },
          {
            label: tableText("display.default"),
            value: "DEFAULT",
          },
          {
            label: tableText("labels.tall"),
            value: "TALL",
          },
        ],
      },
      {
        helpText: tableText("help.serverSidePagination"),
        propertyName: "serverSidePaginationEnabled",
        label: tableText("labels.serverSidePagination"),
        controlType: "SWITCH",
        isBindProperty: false,
        isTriggerProperty: false,
      },
      {
        helpText: tableText("help.totalRecordCount"),
        propertyName: "totalRecordsCount",
        label: tableText("labels.totalRecordCount"),
        controlType: "INPUT_TEXT",
        placeholderText: tableText("placeholders.totalRecordCount"),
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.FUNCTION,
          params: {
            fn: totalRecordsCountValidation,
            expected: {
              type: "Number",
              example: "10",
              autocompleteDataType: AutocompleteDataType.STRING,
            },
          },
        },
        hidden: (props: TableWidgetProps) =>
          !!!props.serverSidePaginationEnabled,
        dependencies: ["serverSidePaginationEnabled"],
      },
      {
        helpText: tableText("help.isVisible"),
        propertyName: "isVisible",
        isJSConvertible: true,
        label: tableText("labels.visible"),
        controlType: "SWITCH",
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.BOOLEAN,
        },
      },
      {
        propertyName: "animateLoading",
        label: tableText("display.animateLoading"),
        controlType: "SWITCH",
        helpText: tableText("help.animateLoading"),
        defaultValue: true,
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.BOOLEAN },
      },
      {
        helpText: tableText("help.sortable"),
        propertyName: "isSortable",
        isJSConvertible: true,
        label: tableText("labels.sortable"),
        controlType: "SWITCH",
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.BOOLEAN,
          params: {
            default: true,
          },
        },
      },
      {
        propertyName: "multiRowSelection",
        label: tableText("labels.enableMultiRowSelection"),
        controlType: "SWITCH",
        isBindProperty: false,
        isTriggerProperty: false,
      },
      {
        propertyName: "enableClientSideSearch",
        label: tableText("labels.enableClientSideSearch"),
        controlType: "SWITCH",
        isBindProperty: false,
        isTriggerProperty: false,
      },
    ],
  },
  {
    sectionName: tableText("sections.events"),
    children: [
      {
        helpText: tableText("help.onRowSelected"),
        propertyName: "onRowSelected",
        label: "onRowSelected",
        controlType: "ACTION_SELECTOR",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
      },
      {
        helpText: tableText("help.onPageChange"),
        propertyName: "onPageChange",
        label: "onPageChange",
        controlType: "ACTION_SELECTOR",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
      },
      {
        helpText: tableText("help.onPageSizeChange"),
        propertyName: "onPageSizeChange",
        label: "onPageSizeChange",
        controlType: "ACTION_SELECTOR",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
      },
      {
        propertyName: "onSearchTextChanged",
        label: "onSearchTextChanged",
        controlType: "ACTION_SELECTOR",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
      },
      {
        helpText: tableText("help.onSort"),
        propertyName: "onSort",
        label: "onSort",
        controlType: "ACTION_SELECTOR",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
      },
    ],
  },
  {
    sectionName: tableText("sections.headerOptions"),
    children: [
      {
        helpText: tableText("help.search"),
        propertyName: "isVisibleSearch",
        label: tableText("labels.search"),
        controlType: "SWITCH",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.BOOLEAN },
      },
      {
        helpText: tableText("help.filters"),
        propertyName: "isVisibleFilters",
        label: tableText("labels.filters"),
        controlType: "SWITCH",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.BOOLEAN },
      },
      {
        helpText: tableText("help.download"),
        propertyName: "isVisibleDownload",
        label: tableText("labels.download"),
        controlType: "SWITCH",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.BOOLEAN },
      },
      {
        helpText: tableText("help.pagination"),
        propertyName: "isVisiblePagination",
        label: tableText("labels.pagination"),
        controlType: "SWITCH",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.BOOLEAN },
      },
      {
        propertyName: "delimiter",
        label: tableText("labels.csvSeparator"),
        controlType: "INPUT_TEXT",
        placeholderText: tableText("placeholders.csvSeparator"),
        helpText: tableText("help.csvSeparator"),
        isBindProperty: true,
        isTriggerProperty: false,
        defaultValue: ",",
        validation: {
          type: ValidationTypes.TEXT,
        },
        hidden: (props: TableWidgetProps) => !props.isVisibleDownload,
        dependencies: ["isVisibleDownload"],
      },
    ],
  },
  {
    sectionName: tableText("sections.styles"),
    children: [
      {
        propertyName: "cellBackground",
        label: tableText("labels.cellBackgroundColor"),
        controlType: "COLOR_PICKER",
        updateHook: updateColumnStyles,
        dependencies: ["primaryColumns", "derivedColumns"],
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.TEXT },
      },
      {
        propertyName: "accentColor",
        label: tableText("display.accentColor"),
        controlType: "COLOR_PICKER",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.TEXT },
        invisible: true,
      },
      {
        propertyName: "textColor",
        label: tableText("display.textColor"),
        controlType: "COLOR_PICKER",
        updateHook: updateColumnStyles,
        dependencies: ["primaryColumns", "derivedColumns"],
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.TEXT },
      },
      {
        propertyName: "textSize",
        label: tableText("labels.textSize"),
        controlType: "DROP_DOWN",
        updateHook: updateColumnStyles,
        dependencies: ["primaryColumns", "derivedColumns"],
        options: [
          {
            label: "S",
            value: "0.875rem",
            subText: "0.875rem",
          },
          {
            label: "M",
            value: "1rem",
            subText: "1rem",
          },
          {
            label: "L",
            value: "1.25rem",
            subText: "1.25rem",
          },
          {
            label: "XL",
            value: "1.875rem",
            subText: "1.875rem",
          },
        ],
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.TEXT },
      },
      {
        propertyName: "fontStyle",
        label: tableText("labels.fontStyle"),
        controlType: "BUTTON_GROUP",
        updateHook: updateColumnStyles,
        dependencies: ["primaryColumns", "derivedColumns"],
        options: [
          {
            icon: "text-bold",
            value: "BOLD",
          },
          {
            icon: "text-italic",
            value: "ITALIC",
          },
        ],
        isBindProperty: false,
        isTriggerProperty: false,
      },
      {
        propertyName: "horizontalAlignment",
        label: tableText("labels.textAlign"),
        controlType: "ICON_TABS",
        updateHook: updateColumnStyles,
        dependencies: ["primaryColumns", "derivedColumns"],
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
        isBindProperty: false,
        isTriggerProperty: false,
      },
      {
        propertyName: "verticalAlignment",
        label: tableText("labels.verticalAlignment"),
        controlType: "ICON_TABS",
        updateHook: updateColumnStyles,
        dependencies: ["primaryColumns", "derivedColumns"],
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
        isBindProperty: false,
        isTriggerProperty: false,
      },
      {
        propertyName: "borderRadius",
        label: tableText("display.borderRadius"),
        helpText: tableText("help.borderRadius"),
        controlType: "BORDER_RADIUS_OPTIONS",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.TEXT },
      },
      {
        propertyName: "boxShadow",
        label: tableText("display.boxShadow"),
        helpText: tableText("help.boxShadowStyle"),
        controlType: "BOX_SHADOW_OPTIONS",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.TEXT },
      },
    ],
  },
] as PropertyPaneConfig[];
}
