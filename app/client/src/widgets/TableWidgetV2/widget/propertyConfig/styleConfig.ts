import { ValidationTypes } from "constants/WidgetValidation";
import type { PropertyPaneConfig } from "constants/PropertyControlConstants";
import i18n from "i18n";
import { updateColumnStyles } from "../propertyUtils";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2StyleConfig(): PropertyPaneConfig[] {
  return [
    {
      sectionName: tableV2Text("style.general"),
      children: [
        {
          propertyName: "compactMode",
          helpText: tableV2Text("help.defaultRowHeight"),
          label: tableV2Text("style.defaultRowHeight"),
          controlType: "ICON_TABS",
          fullWidth: true,
          defaultValue: "DEFAULT",
          isBindProperty: true,
          isTriggerProperty: false,
          options: [
            {
              label: tableV2Text("option.short"),
              value: "SHORT",
            },
            {
              label: tableV2Text("option.default"),
              value: "DEFAULT",
            },
            {
              label: tableV2Text("option.tall"),
              value: "TALL",
            },
          ],
        },
      ],
    },
    {
      sectionName: tableV2Text("style.textFormatting"),
      children: [
        {
          propertyName: "textSize",
          label: tableV2Text("style.textSize"),
          helpText: tableV2Text("help.textSize"),
          controlType: "DROP_DOWN",
          updateHook: updateColumnStyles,
          dependencies: ["primaryColumns"],
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
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
        {
          propertyName: "fontStyle",
          label: tableV2Text("style.emphasis"),
          helpText: tableV2Text("help.emphasis"),
          controlType: "BUTTON_GROUP",
          updateHook: updateColumnStyles,
          dependencies: ["primaryColumns"],
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
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
        {
          propertyName: "horizontalAlignment",
          label: tableV2Text("style.textAlign"),
          helpText: tableV2Text("help.textAlign"),
          controlType: "ICON_TABS",
          fullWidth: true,
          updateHook: updateColumnStyles,
          dependencies: ["primaryColumns"],
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
          isBindProperty: true,
          isTriggerProperty: false,
          validation: {
            type: ValidationTypes.TEXT,
            params: {
              allowedValues: ["LEFT", "CENTER", "RIGHT"],
            },
          },
        },
        {
          propertyName: "verticalAlignment",
          label: tableV2Text("style.verticalAlignment"),
          helpText: tableV2Text("help.verticalAlignment"),
          controlType: "ICON_TABS",
          fullWidth: true,
          updateHook: updateColumnStyles,
          dependencies: ["primaryColumns"],
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
          isBindProperty: true,
          isTriggerProperty: false,
          validation: {
            type: ValidationTypes.TEXT,
            params: {
              allowedValues: ["TOP", "CENTER", "BOTTOM"],
            },
          },
        },
      ],
    },
    {
      sectionName: tableV2Text("style.color"),
      children: [
        {
          propertyName: "cellBackground",
          label: tableV2Text("style.cellBackgroundColor"),
          helpText: tableV2Text("help.cellBackground"),
          controlType: "COLOR_PICKER",
          updateHook: updateColumnStyles,
          dependencies: ["primaryColumns"],
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
        {
          propertyName: "headerRowColor",
          label: tableV2Text("style.headerRowColor"),
          helpText: tableV2Text("help.headerRowColor"),
          controlType: "COLOR_PICKER",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
        {
          propertyName: "headerTextColor",
          label: tableV2Text("style.headerTextColor"),
          helpText: tableV2Text("help.headerTextColor"),
          controlType: "COLOR_PICKER",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
        {
          propertyName: "oddRowColor",
          label: tableV2Text("style.oddRowColor"),
          helpText: tableV2Text("help.oddRowColor"),
          controlType: "COLOR_PICKER",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
        {
          propertyName: "evenRowColor",
          label: tableV2Text("style.evenRowColor"),
          helpText: tableV2Text("help.evenRowColor"),
          controlType: "COLOR_PICKER",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
        {
          propertyName: "accentColor",
          label: tableV2Text("style.accentColor"),
          controlType: "COLOR_PICKER",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
          invisible: true,
        },
        {
          propertyName: "textColor",
          label: tableV2Text("style.textColor"),
          helpText: tableV2Text("help.textColor"),
          controlType: "COLOR_PICKER",
          updateHook: updateColumnStyles,
          dependencies: ["primaryColumns"],
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
      ],
    },
    {
      sectionName: tableV2Text("style.borderAndShadow"),
      children: [
        {
          propertyName: "variant",
          helpText: tableV2Text("help.cellBorders"),
          label: tableV2Text("style.cellBorders"),
          controlType: "DROP_DOWN",
          defaultValue: "DEFAULT",
          isBindProperty: true,
          isTriggerProperty: false,
          options: [
            {
              label: tableV2Text("option.default"),
              value: "DEFAULT",
            },
            {
              label: tableV2Text("option.noBorders"),
              value: "VARIANT2",
            },
            {
              label: tableV2Text("option.horizonalBordersOnly"),
              value: "VARIANT3",
            },
          ],
        },
        {
          propertyName: "borderRadius",
          label: tableV2Text("style.borderRadius"),
          helpText: tableV2Text("help.borderRadius"),
          controlType: "BORDER_RADIUS_OPTIONS",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
        {
          propertyName: "boxShadow",
          label: tableV2Text("style.boxShadow"),
          helpText: tableV2Text("help.boxShadow"),
          controlType: "BOX_SHADOW_OPTIONS",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
        {
          helpText: tableV2Text("help.borderColor"),
          placeholderText: "#FFFFFF / Gray / rgb(255, 99, 71)",
          propertyName: "borderColor",
          label: tableV2Text("style.borderColor"),
          controlType: "COLOR_PICKER",
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
        {
          helpText: tableV2Text("help.borderWidth"),
          propertyName: "borderWidth",
          label: tableV2Text("style.borderWidth"),
          placeholderText: tableV2Text("placeholder.borderWidth"),
          controlType: "INPUT_TEXT",
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.NUMBER },
        },
      ],
    },
  ];
}
