import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes, ICON_NAMES } from "widgets/TableWidgetV2/constants";
import {
  hideByColumnType,
  hideByMenuItemsSource,
  hideIfMenuItemsSourceDataIsFalsy,
  updateIconAlignment,
  updateMenuItemsSource,
} from "../../propertyUtils";
import { IconNames } from "@blueprintjs/icons";
import { MenuItemsSource } from "widgets/MenuButtonWidget/constants";
import { EvaluationSubstitutionType } from "constants/EvaluationConstants";
import { getTableV2ConfigureMenuItemsConfig } from "./childPanels/configureMenuItemsConfig";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnBasicConfig() {
  return {
    sectionName: tableV2Text("column.basic"),
    hidden: (props: TableWidgetProps, propertyPath: string) => {
      return hideByColumnType(
        props,
        propertyPath,
        [ColumnTypes.BUTTON, ColumnTypes.ICON_BUTTON, ColumnTypes.MENU_BUTTON],
        true,
      );
    },
    children: [
      {
        propertyName: "iconName",
        label: tableV2Text("column.icon"),
        helpText: tableV2Text("help.buttonIconHelp"),
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.ICON_BUTTON,
          ]);
        },
        updateHook: updateIconAlignment,
        dependencies: ["primaryColumns", "columnOrder"],
        controlType: "ICON_SELECT",
        customJSControl: "TABLE_COMPUTE_VALUE",
        defaultIconName: "add",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
            params: {
              allowedValues: ICON_NAMES,
              default: IconNames.ADD,
            },
          },
        },
      },
      {
        propertyName: "buttonLabel",
        label: tableV2Text("help.buttonTextLabel"),
        helpText: tableV2Text("help.buttonTextHelp"),
        controlType: "TABLE_COMPUTE_VALUE",
        defaultValue: "Action",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [ColumnTypes.BUTTON]);
        },
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        isTriggerProperty: false,
      },
      {
        propertyName: "menuButtonLabel",
        label: tableV2Text("help.buttonTextLabel"),
        helpText: tableV2Text("help.buttonTextHelp"),
        controlType: "TABLE_COMPUTE_VALUE",
        defaultValue: "Open Menu",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.MENU_BUTTON,
          ]);
        },
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        isTriggerProperty: false,
      },
      {
        propertyName: "menuItemsSource",
        helpText: tableV2Text("help.menuSourceHelp"),
        label: tableV2Text("menu.menuItemsSource"),
        controlType: "ICON_TABS",
        fullWidth: true,
        defaultValue: MenuItemsSource.STATIC,
        options: [
          {
            label: tableV2Text("option.static"),
            value: MenuItemsSource.STATIC,
          },
          {
            label: tableV2Text("option.dynamic"),
            value: MenuItemsSource.DYNAMIC,
          },
        ],
        isJSConvertible: false,
        isBindProperty: false,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.TEXT },
        updateHook: updateMenuItemsSource,
        dependencies: [
          "primaryColumns",
          "columnOrder",
          "sourceData",
          "configureMenuItems",
        ],
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(
            props,
            propertyPath,
            [ColumnTypes.MENU_BUTTON],
            false,
          );
        },
      },
      {
        helpText: tableV2Text("help.menuDataHelp"),
        propertyName: "sourceData",
        label: tableV2Text("menu.sourceData"),
        controlType: "TABLE_COMPUTE_VALUE",
        placeholderText: "{{Query1.data}}",
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY,
          params: {
            required: true,
            default: [],
            children: {
              type: ValidationTypes.ARRAY,
              params: {
                required: true,
                default: [],
                children: {
                  type: ValidationTypes.UNION,
                  params: {
                    required: true,
                    types: [
                      {
                        type: ValidationTypes.TEXT,
                        params: {
                          required: true,
                        },
                      },
                      {
                        type: ValidationTypes.NUMBER,
                        params: {
                          required: true,
                        },
                      },
                      {
                        type: ValidationTypes.OBJECT,
                        params: {
                          required: true,
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        evaluationSubstitutionType: EvaluationSubstitutionType.SMART_SUBSTITUTE,
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return (
            hideByColumnType(
              props,
              propertyPath,
              [ColumnTypes.MENU_BUTTON],
              false,
            ) ||
            hideByMenuItemsSource(props, propertyPath, MenuItemsSource.STATIC)
          );
        },
        dependencies: ["primaryColumns", "columnOrder", "menuItemsSource"],
      },
      {
        helpText: tableV2Text("help.menuConfigureHelp"),
        propertyName: "configureMenuItems",
        controlType: "OPEN_CONFIG_PANEL",
        buttonConfig: {
          label: tableV2Text("menu.configure"),
          icon: "settings-v3",
        },
        label: tableV2Text("menu.configureMenuItems"),
        isBindProperty: false,
        isTriggerProperty: false,
        hidden: (props: TableWidgetProps, propertyPath: string) =>
          hideByColumnType(
            props,
            propertyPath,
            [ColumnTypes.MENU_BUTTON],
            false,
          ) ||
          hideIfMenuItemsSourceDataIsFalsy(props, propertyPath) ||
          hideByMenuItemsSource(props, propertyPath, MenuItemsSource.STATIC),
        dependencies: [
          "primaryColumns",
          "columnOrder",
          "menuItemsSource",
          "sourceData",
        ],
        panelConfig: getTableV2ConfigureMenuItemsConfig(),
      },
      {
        helpText: tableV2Text("help.menuConfigure"),
        propertyName: "menuItems",
        controlType: "MENU_ITEMS",
        label: tableV2Text("menu.menuItems"),
        isBindProperty: false,
        isTriggerProperty: false,
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return (
            hideByColumnType(
              props,
              propertyPath,
              [ColumnTypes.MENU_BUTTON],
              false,
            ) ||
            hideByMenuItemsSource(props, propertyPath, MenuItemsSource.DYNAMIC)
          );
        },
        dependencies: ["primaryColumns", "columnOrder"],
        panelConfig: {
          editableTitle: true,
          titlePropertyName: "label",
          panelIdPropertyName: "id",
          dependencies: ["primaryColumns", "columnOrder"],
          contentChildren: [
            {
              sectionName: tableV2Text("menu.basic"),
              children: [
                {
                  propertyName: "label",
                  helpText: tableV2Text("help.menuTextHelp"),
                  label: tableV2Text("menu.text"),
                  controlType: "INPUT_TEXT",
                  placeholderText: tableV2Text("placeholder.menuLabel"),
                  isBindProperty: true,
                  isTriggerProperty: false,
                  validation: { type: ValidationTypes.TEXT },
                  dependencies: ["primaryColumns", "columnOrder"],
                },
                {
                  helpText: tableV2Text("help.menuOnClick"),
                  propertyName: "onClick",
                  label: "onClick",
                  controlType: "ACTION_SELECTOR",
                  isJSConvertible: true,
                  isBindProperty: true,
                  isTriggerProperty: true,
                  dependencies: ["primaryColumns", "columnOrder"],
                },
              ],
            },
            {
              sectionName: tableV2Text("menu.general"),
              children: [
                {
                  propertyName: "isVisible",
                  helpText: tableV2Text("help.menuVisibleHelp"),
                  label: tableV2Text("menu.visible"),
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
                },
                {
                  propertyName: "isDisabled",
                  helpText: tableV2Text("help.menuDisabledHelp"),
                  label: tableV2Text("menu.disabled"),
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
                },
              ],
            },
          ],
          styleChildren: [
            {
              sectionName: tableV2Text("column.icon"),
              children: [
                {
                  propertyName: "iconName",
                  label: tableV2Text("menu.icon"),
                  helpText: tableV2Text("help.menuIconHelp"),
                  controlType: "ICON_SELECT",
                  isBindProperty: false,
                  isTriggerProperty: false,
                  validation: { type: ValidationTypes.TEXT },
                  dependencies: ["primaryColumns", "columnOrder"],
                },
                {
                  propertyName: "iconAlign",
                  label: tableV2Text("menu.position"),
                  helpText: tableV2Text("help.menuPositionHelp"),
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
                  validation: { type: ValidationTypes.TEXT },
                  dependencies: ["primaryColumns", "columnOrder"],
                },
              ],
            },
            {
              sectionName: tableV2Text("menu.color"),
              children: [
                {
                  propertyName: "textColor",
                  helpText: tableV2Text("help.menuTextColorHelp"),
                  label: tableV2Text("menu.textColor"),
                  controlType: "PRIMARY_COLUMNS_COLOR_PICKER_V2",
                  customJSControl: "TABLE_COMPUTE_VALUE",
                  isJSConvertible: true,
                  isBindProperty: true,
                  isTriggerProperty: false,
                  dependencies: ["primaryColumns", "columnOrder"],
                  validation: {
                    type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
                    params: {
                      type: ValidationTypes.TEXT,
                      params: {
                        regex: /^(?![<|{{]).+/,
                      },
                    },
                  },
                },
                {
                  propertyName: "backgroundColor",
                  helpText: tableV2Text("help.menuBackgroundColorHelp"),
                  label: tableV2Text("menu.backgroundColor"),
                  controlType: "PRIMARY_COLUMNS_COLOR_PICKER_V2",
                  customJSControl: "TABLE_COMPUTE_VALUE",
                  isJSConvertible: true,
                  isBindProperty: true,
                  isTriggerProperty: false,
                  dependencies: ["primaryColumns", "columnOrder"],
                  validation: {
                    type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
                    params: {
                      type: ValidationTypes.TEXT,
                      params: {
                        regex: /^(?![<|{{]).+/,
                      },
                    },
                  },
                },
                {
                  propertyName: "iconColor",
                  helpText: tableV2Text("help.menuIconColorHelp"),
                  label: tableV2Text("menu.iconColor"),
                  controlType: "PRIMARY_COLUMNS_COLOR_PICKER_V2",
                  isBindProperty: false,
                  isTriggerProperty: false,
                  dependencies: ["primaryColumns", "columnOrder"],
                },
              ],
            },
          ],
        },
      },
      {
        helpText: tableV2Text("help.buttonClick"),
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
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        isTriggerProperty: true,
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.BUTTON,
            ColumnTypes.ICON_BUTTON,
          ]);
        },
      },
    ],
  };
}
