import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import { get } from "lodash";
import {
  getBasePropertyPath,
  hideByColumnType,
  updateColumnLevelEditability,
  updateColumnOrderWhenFrozen,
  updateInlineEditingOptionDropdownVisibilityHook,
} from "../../propertyUtils";
import { isColumnTypeEditable } from "../../utilities";
import { composePropertyUpdateHook } from "widgets/WidgetUtils";
import { ButtonVariantTypes } from "components/constants";
import { StickyType } from "widgets/TableWidgetV2/component/Constants";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnGeneralConfig() {
  return {
    sectionName: tableV2Text("column.general"),
    children: [
      {
        propertyName: "isCellVisible",
        dependencies: ["primaryColumns", "columnType"],
        label: tableV2Text("column.visible"),
        helpText: tableV2Text("help.cellVisibility"),
        defaultValue: true,
        controlType: "SWITCH",
        customJSControl: "TABLE_COMPUTE_VALUE",
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
        label: tableV2Text("column.disabled"),
        helpText: tableV2Text("help.disabledButtonState"),
        defaultValue: false,
        controlType: "SWITCH",
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.BOOLEAN,
          },
        },
        dependencies: ["primaryColumns", "columnOrder"],
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.ICON_BUTTON,
            ColumnTypes.MENU_BUTTON,
            ColumnTypes.BUTTON,
          ]);
        },
      },
      {
        propertyName: "isCompact",
        helpText: tableV2Text("help.menuCompact"),
        label: tableV2Text("column.compact"),
        controlType: "SWITCH",
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        isBindProperty: true,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.BOOLEAN,
          },
        },
        isTriggerProperty: false,
        dependencies: ["primaryColumns", "columnOrder"],
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.MENU_BUTTON,
          ]);
        },
      },
      {
        propertyName: "allowCellWrapping",
        dependencies: ["primaryColumns", "columnType"],
        label: tableV2Text("column.cellWrapping"),
        helpText: tableV2Text("help.cellWrapping"),
        defaultValue: false,
        controlType: "SWITCH",
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.BOOLEAN,
          },
        },
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.TEXT,
            ColumnTypes.NUMBER,
            ColumnTypes.URL,
          ]);
        },
      },
      {
        propertyName: "isCellEditable",
        dependencies: [
          "primaryColumns",
          "columnOrder",
          "columnType",
          "childStylesheet",
          "inlineEditingSaveOption",
        ],
        label: tableV2Text("column.editable"),
        helpText: tableV2Text("help.editable"),
        defaultValue: false,
        controlType: "SWITCH",
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        updateHook: composePropertyUpdateHook([
          updateColumnLevelEditability,
          updateInlineEditingOptionDropdownVisibilityHook,
        ]),
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.BOOLEAN,
          },
        },
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");
          const isDerived = get(props, `${baseProperty}.isDerived`, false);

          return (
            !isColumnTypeEditable(columnType, props.infiniteScrollEnabled) ||
            isDerived
          );
        },
      },
      {
        propertyName: "sticky",
        helpText: tableV2Text("help.columnFreezeDirection"),
        controlType: "ICON_TABS",
        defaultValue: StickyType.NONE,
        label: tableV2Text("column.columnFreeze"),
        fullWidth: true,
        isBindProperty: true,
        isTriggerProperty: false,
        dependencies: ["primaryColumns", "columnOrder"],
        options: [
          {
            startIcon: "contract-left-line",
            value: StickyType.LEFT,
          },
          {
            startIcon: "column-freeze",
            value: StickyType.NONE,
          },
          {
            startIcon: "contract-right-line",
            value: StickyType.RIGHT,
          },
        ],
        updateHook: updateColumnOrderWhenFrozen,
      },
    ],
  };
}

export function getTableV2ColumnGeneralStyleConfig() {
  return {
    sectionName: tableV2Text("style.general"),
    children: [
      {
        propertyName: "buttonVariant",
        label: tableV2Text("menu.buttonVariant"),
        controlType: "ICON_TABS",
        fullWidth: true,
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        helpText: tableV2Text("help.buttonVariant"),
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.ICON_BUTTON,
            ColumnTypes.BUTTON,
          ]);
        },
        dependencies: ["primaryColumns", "columnOrder"],
        options: [
          {
            label: tableV2Text("option.primary"),
            value: ButtonVariantTypes.PRIMARY,
          },
          {
            label: tableV2Text("option.secondary"),
            value: ButtonVariantTypes.SECONDARY,
          },
          {
            label: tableV2Text("option.tertiary"),
            value: ButtonVariantTypes.TERTIARY,
          },
        ],
        defaultValue: ButtonVariantTypes.PRIMARY,
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
        propertyName: "menuVariant",
        label: tableV2Text("menu.buttonVariant"),
        controlType: "ICON_TABS",
        fullWidth: true,
        customJSControl: "TABLE_COMPUTE_VALUE",
        helpText: tableV2Text("help.menuButtonVariant"),
        options: [
          {
            label: tableV2Text("option.primary"),
            value: ButtonVariantTypes.PRIMARY,
          },
          {
            label: tableV2Text("option.secondary"),
            value: ButtonVariantTypes.SECONDARY,
          },
          {
            label: tableV2Text("option.tertiary"),
            value: ButtonVariantTypes.TERTIARY,
          },
        ],
        isJSConvertible: true,
        dependencies: ["primaryColumns", "columnOrder"],
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.MENU_BUTTON,
          ]);
        },
        isBindProperty: true,
        isTriggerProperty: false,
        defaultValue: ButtonVariantTypes.PRIMARY,
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
        propertyName: "imageSize",
        dependencies: ["primaryColumns", "columnType"],
        label: tableV2Text("help.imageSizeLabel"),
        helpText: tableV2Text("help.imageSize"),
        defaultValue: "DEFAULT",
        controlType: "ICON_TABS",
        fullWidth: true,
        options: [
          {
            label: tableV2Text("option.default"),
            value: "DEFAULT",
          },
          {
            label: tableV2Text("option.medium"),
            value: "MEDIUM",
          },
          {
            label: tableV2Text("option.large"),
            value: "LARGE",
          },
        ],
        isBindProperty: false,
        isTriggerProperty: false,
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [ColumnTypes.IMAGE]);
        },
      },
    ],
  };
}
