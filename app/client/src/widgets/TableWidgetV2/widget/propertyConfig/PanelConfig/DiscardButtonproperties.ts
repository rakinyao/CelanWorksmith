import { get } from "lodash";
import i18n from "i18n";
import { ValidationTypes } from "constants/WidgetValidation";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import { hideByColumnType, getBasePropertyPath } from "../../propertyUtils";
import { ButtonVariantTypes } from "components/constants";
import { ICON_NAMES } from "WidgetProvider/constants";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnDiscardButtonPropertiesConfig() {
  return {
    sectionName: tableV2Text("help.discardButtonSection"),
    hidden: (props: TableWidgetProps, propertyPath: string) => {
      return hideByColumnType(
        props,
        propertyPath,
        [ColumnTypes.EDIT_ACTIONS],
        true,
      );
    },
    children: [
      {
        sectionName: tableV2Text("help.labelSection"),
        collapsible: false,
        children: [
          {
            propertyName: "discardActionLabel",
            label: tableV2Text("help.discardTextLabel"),
            helpText: tableV2Text("help.discardButtonText"),
            controlType: "TABLE_COMPUTE_VALUE",
            dependencies: ["primaryColumns"],
            isBindProperty: true,
            isTriggerProperty: false,
          },
        ],
      },
      {
        sectionName: tableV2Text("content.general"),
        collapsible: false,
        children: [
          {
            propertyName: "onDiscard",
            label: "onDiscard",
            helpText: tableV2Text("help.discardButtonClick"),
            controlType: "ACTION_SELECTOR",
            hidden: (props: TableWidgetProps, propertyPath: string) => {
              const baseProperty = getBasePropertyPath(propertyPath);
              const columnType = get(props, `${baseProperty}.columnType`, "");

              return columnType !== ColumnTypes.EDIT_ACTIONS;
            },
            dependencies: ["primaryColumns"],
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: true,
          },
          {
            propertyName: "isDiscardVisible",
            dependencies: ["primaryColumns"],
            label: tableV2Text("help.discardVisibleLabel"),
            helpText: tableV2Text("help.discardButtonVisible"),
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
            propertyName: "isDiscardDisabled",
            label: tableV2Text("help.discardDisabledLabel"),
            helpText: tableV2Text("help.discardButtonDisabled"),
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
            dependencies: ["primaryColumns"],
          },
        ],
      },
    ],
  };
}

export function getTableV2ColumnDiscardButtonStyleConfig() {
  return {
    sectionName: tableV2Text("help.discardButtonSection"),
    hidden: (props: TableWidgetProps, propertyPath: string) => {
      return hideByColumnType(
        props,
        propertyPath,
        [ColumnTypes.EDIT_ACTIONS],
        true,
      );
    },
    children: [
      {
        sectionName: tableV2Text("content.general"),
        collapsible: false,
        children: [
          {
            propertyName: "discardButtonColor",
            label: tableV2Text("help.discardButtonColorLabel"),
            controlType: "PRIMARY_COLUMNS_COLOR_PICKER_V2",
            helpText: tableV2Text("help.discardButtonColor"),
            isJSConvertible: true,
            customJSControl: "TABLE_COMPUTE_VALUE",
            dependencies: ["primaryColumns"],
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
            propertyName: "discardButtonVariant",
            label: tableV2Text("help.discardButtonVariantLabel"),
            controlType: "ICON_TABS",
            fullWidth: true,
            customJSControl: "TABLE_COMPUTE_VALUE",
            isJSConvertible: true,
            helpText: tableV2Text("help.discardButtonVariant"),
            dependencies: ["primaryColumns"],
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
            propertyName: "discardBorderRadius",
            label: tableV2Text("help.discardBorderRadiusLabel"),
            customJSControl: "TABLE_COMPUTE_VALUE",
            isJSConvertible: true,
            helpText: tableV2Text("help.discardButtonRadius"),
            controlType: "BORDER_RADIUS_OPTIONS",
            dependencies: ["primaryColumns"],
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
      },
      {
        sectionName: tableV2Text("help.iconSection"),
        collapsible: false,
        children: [
          {
            propertyName: "discardActionIconName",
            label: tableV2Text("help.discardIconLabel"),
            helpText: tableV2Text("help.discardActionIcon"),
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
            propertyName: "discardIconAlign",
            label: tableV2Text("help.discardPositionLabel"),
            helpText: tableV2Text("help.discardActionPosition"),
            controlType: "ICON_TABS",
            fullWidth: false,
            defaultValue: "left",
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
            dependencies: ["primaryColumns"],
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                allowedValues: ["left", "right"],
              },
            },
          },
        ],
      },
    ],
  };
}
