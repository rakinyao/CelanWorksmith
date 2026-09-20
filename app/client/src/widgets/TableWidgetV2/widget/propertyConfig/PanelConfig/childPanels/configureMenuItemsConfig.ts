import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import { AutocompleteDataType } from "utils/autocomplete/AutocompleteDataType";
import { ICON_NAMES } from "widgets/MenuButtonWidget/constants";
import {
  booleanForEachRowValidation,
  colorForEachRowValidation,
  iconNamesForEachRowValidation,
  iconPositionForEachRowValidation,
  textForEachRowValidation,
} from "widgets/TableWidgetV2/widget/propertyUtils";
import { getSourceDataAndCaluclateKeysForEventAutoComplete } from "widgets/TableWidgetV2/widget/utilities";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ConfigureMenuItemsConfig() {
  return {
    editableTitle: false,
    titlePropertyName: "label",
    panelIdPropertyName: "id",
    contentChildren: [
      {
        sectionName: tableV2Text("menu.general"),
        children: [
          {
            propertyName: "label",
            helpText: tableV2Text("help.menuBindingLabel"),
            label: tableV2Text("menu.label"),
            controlType: "MENU_BUTTON_DYNAMIC_ITEMS",
            placeholderText: "{{currentItem.name}}",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                expected: {
                  type: "Array of values",
                  example: `['option1', 'option2'] | [{ "label": "label1", "value": "value1" }]`,
                  autocompleteDataType: AutocompleteDataType.ARRAY,
                },
                fnString: textForEachRowValidation.toString(),
              },
            },
            evaluatedDependencies: ["primaryColumns"],
          },
          {
            propertyName: "isVisible",
            helpText: tableV2Text("help.menuBindingVisible"),
            label: tableV2Text("menu.visible"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                fnString: booleanForEachRowValidation.toString(),
              },
            },
            customJSControl: "MENU_BUTTON_DYNAMIC_ITEMS",
            evaluatedDependencies: ["primaryColumns"],
          },
          {
            propertyName: "isDisabled",
            helpText: tableV2Text("help.menuBindingDisabled"),
            label: tableV2Text("menu.disabled"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                fnString: booleanForEachRowValidation.toString(),
              },
            },
            customJSControl: "MENU_BUTTON_DYNAMIC_ITEMS",
            evaluatedDependencies: ["primaryColumns"],
          },
        ],
      },
      {
        sectionName: tableV2Text("menu.events"),
        children: [
          {
            helpText: tableV2Text("help.menuBindingOnClick"),
            propertyName: "onClick",
            label: "onClick",
            controlType: "ACTION_SELECTOR",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: true,
            additionalAutoComplete:
              getSourceDataAndCaluclateKeysForEventAutoComplete,
            evaluatedDependencies: ["primaryColumns"],
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
            helpText: tableV2Text("help.menuBindingIcon"),
            controlType: "ICON_SELECT",
            isBindProperty: true,
            isTriggerProperty: false,
            isJSConvertible: true,
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                allowedValues: ICON_NAMES,
                fnString: iconNamesForEachRowValidation.toString(),
              },
            },
            customJSControl: "MENU_BUTTON_DYNAMIC_ITEMS",
            evaluatedDependencies: ["primaryColumns"],
          },
          {
            propertyName: "iconAlign",
            label: tableV2Text("menu.position"),
            helpText: tableV2Text("help.menuBindingIconAlignment"),
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
            isBindProperty: true,
            isTriggerProperty: false,
            isJSConvertible: true,
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                allowedValues: ["center", "left", "right"],
                fnString: iconPositionForEachRowValidation.toString(),
              },
            },
            customJSControl: "MENU_BUTTON_DYNAMIC_ITEMS",
            evaluatedDependencies: ["primaryColumns"],
          },
        ],
      },
      {
        sectionName: tableV2Text("menu.color"),
        children: [
          {
            propertyName: "iconColor",
            helpText: tableV2Text("help.menuBindingIconColor"),
            label: tableV2Text("menu.iconColor"),
            controlType: "COLOR_PICKER",
            isBindProperty: true,
            isTriggerProperty: false,
            isJSConvertible: true,
            customJSControl: "MENU_BUTTON_DYNAMIC_ITEMS",
            evaluatedDependencies: ["primaryColumns"],
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                regex: /^(?![<|{{]).+/,
                fnString: colorForEachRowValidation.toString(),
              },
            },
          },
          {
            propertyName: "backgroundColor",
            helpText: tableV2Text("help.menuBindingBackgroundColor"),
            label: tableV2Text("menu.backgroundColor"),
            controlType: "COLOR_PICKER",
            isBindProperty: true,
            isTriggerProperty: false,
            isJSConvertible: true,
            customJSControl: "MENU_BUTTON_DYNAMIC_ITEMS",
            evaluatedDependencies: ["primaryColumns"],
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                regex: /^(?![<|{{]).+/,
                fnString: colorForEachRowValidation.toString(),
              },
            },
          },
          {
            propertyName: "textColor",
            helpText: tableV2Text("help.menuBindingTextColor"),
            label: tableV2Text("menu.textColor"),
            controlType: "COLOR_PICKER",
            isBindProperty: true,
            isTriggerProperty: false,
            isJSConvertible: true,
            customJSControl: "MENU_BUTTON_DYNAMIC_ITEMS",
            evaluatedDependencies: ["primaryColumns"],
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                regex: /^(?![<|{{]).+/,
                fnString: colorForEachRowValidation.toString(),
              },
            },
          },
        ],
      },
    ],
  };
}
