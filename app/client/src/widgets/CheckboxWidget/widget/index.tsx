import { LabelPosition } from "components/constants";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import { ValidationTypes } from "constants/WidgetValidation";
import type { SetterConfig, Stylesheet } from "entities/AppTheming";
import React from "react";
import { isAutoLayout } from "layoutSystems/autolayout/utils/flexWidgetUtils";
import type { DerivedPropertiesMap } from "WidgetProvider/factory/types";
import { AlignWidgetTypes } from "WidgetProvider/types";
import {
  isAutoHeightEnabledForWidget,
  DefaultAutocompleteDefinitions,
} from "widgets/WidgetUtils";
import type { WidgetProps, WidgetState } from "../../BaseWidget";
import BaseWidget from "../../BaseWidget";
import CheckboxComponent from "../component";
import type {
  AnvilConfig,
  AutocompletionDefinitions,
} from "WidgetProvider/types";
import { FILL_WIDGET_MIN_WIDTH } from "constants/minWidthConstants";
import { ResponsiveBehavior } from "layoutSystems/common/utils/constants";
import type {
  SnipingModeProperty,
  PropertyUpdates,
} from "WidgetProvider/types";

import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import { WIDGET_TAGS } from "constants/WidgetConstants";
import i18n from "i18n";

const checkboxText = (path: string) =>
  i18n.t(`widgetProperty.checkbox.${path}`);

class CheckboxWidget extends BaseWidget<CheckboxWidgetProps, WidgetState> {
  static type = "CHECKBOX_WIDGET";

  static getConfig() {
    return {
      name: "Checkbox",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.TOGGLES],
      needsMeta: true,
      searchTags: ["boolean"],
    };
  }

  static getFeatures() {
    return {
      dynamicHeight: {
        sectionIndex: 2,
        active: true,
      },
    };
  }

  static getDefaults() {
    return {
      rows: 4,
      columns: 12,
      label: "Label",
      defaultCheckedState: true,
      widgetName: "Checkbox",
      version: 1,
      alignWidget: AlignWidgetTypes.LEFT,
      labelPosition: LabelPosition.Left,
      isDisabled: false,
      isRequired: false,
      animateLoading: true,
      responsiveBehavior: ResponsiveBehavior.Fill,
      minWidth: FILL_WIDGET_MIN_WIDTH,
    };
  }

  static getMethods() {
    return {
      getSnipingModeUpdates: (
        propValueMap: SnipingModeProperty,
      ): PropertyUpdates[] => {
        return [
          {
            propertyPath: "defaultCheckedState",
            propertyValue: propValueMap.data,
            isDynamicPropertyPath: true,
          },
        ];
      },
    };
  }

  static getAutoLayoutConfig() {
    return {
      disabledPropsDefaults: {
        labelTextSize: "0.875rem",
      },
      widgetSize: [
        {
          viewportMinWidth: 0,
          configuration: () => {
            return {
              minWidth: "120px",
              minHeight: "40px",
            };
          },
        },
      ],
      disableResizeHandles: {
        vertical: true,
      },
    };
  }

  static getAnvilConfig(): AnvilConfig | null {
    return {
      isLargeWidget: false,
      widgetSize: {
        maxHeight: {},
        maxWidth: {},
        minHeight: { base: "40px" },
        minWidth: { base: "120px" },
      },
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      "!doc":
        "Checkbox is a simple UI widget you can use when you want users to make a binary choice",
      "!url": "https://docs.appsmith.com/widget-reference/checkbox",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      isChecked: "bool",
      isDisabled: "bool",
    };
  }

  static getPropertyPaneContentConfig() {
    return getCheckboxPropertyPaneContentConfig();
  }

  static getCheckboxPropertyPaneContentConfig() {
    return [
      {
        sectionName: checkboxText("content.label"),
        children: [
          {
            propertyName: "label",
            label: checkboxText("content.text"),
            controlType: "INPUT_TEXT",
            helpText: checkboxText("help.label"),
            placeholderText: checkboxText("placeholder.label"),
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: checkboxText("help.labelPosition"),
            propertyName: "labelPosition",
            label: checkboxText("content.position"),
            controlType: "ICON_TABS",
            fullWidth: true,
            options: [
              {
                label: checkboxText("option.left"),
                value: LabelPosition.Left,
              },
              {
                label: checkboxText("option.right"),
                value: LabelPosition.Right,
              },
            ],
            defaultValue: LabelPosition.Left,
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "alignWidget",
            helpText: checkboxText("help.alignment"),
            label: checkboxText("content.alignment"),
            controlType: "LABEL_ALIGNMENT_OPTIONS",
            isBindProperty: true,
            isTriggerProperty: false,
            fullWidth: false,
            options: [
              {
                startIcon: "align-left",
                value: AlignWidgetTypes.LEFT,
              },
              {
                startIcon: "align-right",
                value: AlignWidgetTypes.RIGHT,
              },
            ],
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: checkboxText("content.validations"),
        children: [
          {
            propertyName: "isRequired",
            label: checkboxText("content.required"),
            helpText: checkboxText("help.required"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
        ],
      },
      {
        sectionName: checkboxText("content.general"),
        children: [
          {
            helpText: checkboxText("help.tooltip"),
            propertyName: "labelTooltip",
            label: checkboxText("content.tooltip"),
            controlType: "INPUT_TEXT",
            placeholderText: checkboxText("placeholder.tooltip"),
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "defaultCheckedState",
            label: checkboxText("content.defaultState"),
            helpText: checkboxText("help.defaultState"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "isVisible",
            label: checkboxText("content.visible"),
            helpText: checkboxText("help.visible"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "isDisabled",
            label: checkboxText("content.disabled"),
            controlType: "SWITCH",
            helpText: checkboxText("help.disabled"),
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "animateLoading",
            label: checkboxText("content.animateLoading"),
            controlType: "SWITCH",
            helpText: checkboxText("help.animateLoading"),
            defaultValue: true,
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
        ],
      },
      {
        sectionName: checkboxText("content.events"),
        children: [
          {
            helpText: checkboxText("help.onCheckChange"),
            propertyName: "onCheckChange",
            label: "onCheckChange",
            controlType: "ACTION_SELECTOR",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: true,
          },
        ],
      },
    ];
  }

  static getPropertyPaneStyleConfig() {
    return getCheckboxPropertyPaneStyleConfig();
  }

  static getCheckboxPropertyPaneStyleConfig() {
    return [
      {
        sectionName: checkboxText("style.labelStyles"),
        children: [
          {
            propertyName: "labelTextColor",
            label: checkboxText("style.fontColor"),
            helpText: checkboxText("help.fontColor"),
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                regex: /^(?![<|{{]).+/,
              },
            },
          },
          {
            propertyName: "labelTextSize",
            label: checkboxText("style.fontSize"),
            helpText: checkboxText("help.fontSize"),
            controlType: "DROP_DOWN",
            defaultValue: "0.875rem",
            hidden: isAutoLayout,
            options: [
              {
                label: checkboxText("option.small"),
                value: "0.875rem",
                subText: "0.875rem",
              },
              {
                label: checkboxText("option.medium"),
                value: "1rem",
                subText: "1rem",
              },
              {
                label: checkboxText("option.large"),
                value: "1.25rem",
                subText: "1.25rem",
              },
              {
                label: checkboxText("option.extraLarge"),
                value: "1.875rem",
                subText: "1.875rem",
              },
              {
                label: checkboxText("option.doubleExtraLarge"),
                value: "3rem",
                subText: "3rem",
              },
              {
                label: checkboxText("option.tripleExtraLarge"),
                value: "3.75rem",
                subText: "3.75rem",
              },
            ],
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "labelStyle",
            label: checkboxText("style.emphasis"),
            helpText: checkboxText("help.emphasis"),
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
            ],
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: checkboxText("style.color"),
        children: [
          {
            propertyName: "accentColor",
            helpText: checkboxText("help.accentColor"),
            label: checkboxText("style.accentColor"),
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: checkboxText("style.borderAndShadow"),
        children: [
          {
            propertyName: "borderRadius",
            label: checkboxText("style.borderRadius"),
            helpText: checkboxText("help.borderRadius"),
            controlType: "BORDER_RADIUS_OPTIONS",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
    ];
  }

  static getDefaultPropertiesMap(): Record<string, string> {
    return {
      isChecked: "defaultCheckedState",
    };
  }

  static getDerivedPropertiesMap(): DerivedPropertiesMap {
    return {
      value: `{{!!this.isChecked}}`,
      isValid: `{{ this.isRequired ? !!this.isChecked : true }}`,
    };
  }

  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMetaPropertiesMap(): Record<string, any> {
    return {
      isChecked: undefined,
      isDirty: false,
    };
  }

  static getStylesheetConfig(): Stylesheet {
    return {
      accentColor: "{{appsmith.theme.colors.primaryColor}}",
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
    };
  }

  componentDidUpdate(prevProps: CheckboxWidgetProps) {
    if (
      this.props.defaultCheckedState !== prevProps.defaultCheckedState &&
      this.props.isDirty
    ) {
      this.props.updateWidgetMetaProperty("isDirty", false);
    }

    // Handle programmatic changes
    if (
      this.props.isChecked !== prevProps.isChecked &&
      this.props.onCheckChange
    ) {
      this.props.updateWidgetMetaProperty("isChecked", this.props.isChecked);
    }
  }

  static getSetterConfig(): SetterConfig {
    return {
      __setters: {
        setVisibility: {
          path: "isVisible",
          type: "boolean",
        },
        setDisabled: {
          path: "isDisabled",
          type: "boolean",
        },
        setRequired: {
          path: "isRequired",
          type: "boolean",
        },
        setValue: {
          path: "defaultCheckedState",
          type: "boolean",
          accessor: "isChecked",
        },
      },
    };
  }

  getWidgetView() {
    return (
      <CheckboxComponent
        accentColor={this.props.accentColor}
        alignWidget={this.props.alignWidget}
        borderRadius={this.props.borderRadius}
        isChecked={!!this.props.isChecked}
        isDisabled={this.props.isDisabled}
        isDynamicHeightEnabled={isAutoHeightEnabledForWidget(this.props)}
        isLabelInline={this.isAutoLayoutMode}
        isLoading={this.props.isLoading}
        isRequired={this.props.isRequired}
        key={this.props.widgetId}
        label={this.props.label}
        labelPosition={this.props.labelPosition}
        labelStyle={this.props.labelStyle}
        labelTextColor={this.props.labelTextColor}
        labelTextSize={this.props.labelTextSize}
        labelTooltip={this.props.labelTooltip}
        minHeight={this.props.minHeight}
        onCheckChange={this.onCheckChange}
        widgetId={this.props.widgetId}
      />
    );
  }

  onCheckChange = (isChecked: boolean) => {
    if (!this.props.isDirty) {
      this.props.updateWidgetMetaProperty("isDirty", true);
    }

    this.props.updateWidgetMetaProperty("isChecked", isChecked, {
      triggerPropertyName: "onCheckChange",
      dynamicString: this.props.onCheckChange,
      event: {
        type: EventType.ON_CHECK_CHANGE,
      },
    });
  };
}

export interface CheckboxWidgetProps extends WidgetProps {
  label: string;
  defaultCheckedState: boolean;
  isChecked?: boolean;
  isDisabled?: boolean;
  onCheckChange?: string;
  isRequired?: boolean;
  accentColor: string;
  borderRadius: string;
  alignWidget: AlignWidgetTypes;
  labelPosition: LabelPosition;
  labelTextColor?: string;
  labelTextSize?: string;
  labelStyle?: string;
  labelTooltip?: string;
}

export function getCheckboxPropertyPaneContentConfig() {
  return CheckboxWidget.getCheckboxPropertyPaneContentConfig();
}

export function getCheckboxPropertyPaneStyleConfig() {
  return CheckboxWidget.getCheckboxPropertyPaneStyleConfig();
}

export default CheckboxWidget;
