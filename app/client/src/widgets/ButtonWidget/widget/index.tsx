import { Alignment } from "@blueprintjs/core";
import type { IconName } from "@blueprintjs/icons";
import type {
  ButtonPlacement,
  ButtonVariant,
  RecaptchaType,
} from "components/constants";
import {
  ButtonPlacementTypes,
  ButtonVariantTypes,
  RecaptchaTypes,
} from "components/constants";
import type { ExecutionResult } from "constants/AppsmithActionConstants/ActionConstants";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import { ValidationTypes } from "constants/WidgetValidation";
import type { SetterConfig, Stylesheet } from "entities/AppTheming";
import React from "react";
import type { DerivedPropertiesMap } from "WidgetProvider/factory/types";
import type { WidgetProps, WidgetState } from "widgets/BaseWidget";
import BaseWidget from "widgets/BaseWidget";
import ButtonComponent, { ButtonType } from "../component";
import { DefaultAutocompleteDefinitions } from "widgets/WidgetUtils";
import type {
  AnvilConfig,
  AutocompletionDefinitions,
} from "WidgetProvider/types";
import { isAirgapped } from "ee/utils/airgapHelpers";
import { BUTTON_MIN_WIDTH } from "constants/minWidthConstants";
import { ResponsiveBehavior } from "layoutSystems/common/utils/constants";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";

import type {
  PropertyUpdates,
  SnipingModeProperty,
} from "WidgetProvider/types";
import { WIDGET_TAGS } from "constants/WidgetConstants";
import i18n from "i18n";

const buttonText = (path: string) => i18n.t(`widgetProperty.button.${path}`);

class ButtonWidget extends BaseWidget<ButtonWidgetProps, ButtonWidgetState> {
  onButtonClickBound: (event: React.MouseEvent<HTMLElement>) => void;
  clickWithRecaptchaBound: (token: string) => void;
  constructor(props: ButtonWidgetProps) {
    super(props);
    this.onButtonClickBound = this.onButtonClick.bind(this);
    this.clickWithRecaptchaBound = this.clickWithRecaptcha.bind(this);
    this.state = {
      isLoading: false,
    };
  }

  static type = "BUTTON_WIDGET";

  static getConfig() {
    return {
      name: "Button",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.BUTTONS],
      needsMeta: true,
      searchTags: ["click", "submit"],
    };
  }

  static getDefaults() {
    return {
      animateLoading: true,
      text: "Submit",
      buttonVariant: ButtonVariantTypes.PRIMARY,
      placement: ButtonPlacementTypes.CENTER,
      rows: 4,
      columns: 16,
      widgetName: "Button",
      isDisabled: false,
      isVisible: true,
      isDefaultClickDisabled: true,
      disabledWhenInvalid: false,
      resetFormOnClick: false,
      recaptchaType: RecaptchaTypes.V3,
      version: 1,
      responsiveBehavior: ResponsiveBehavior.Hug,
      minWidth: BUTTON_MIN_WIDTH,
    };
  }

  static getMethods() {
    return {
      getSnipingModeUpdates: (
        propValueMap: SnipingModeProperty,
      ): PropertyUpdates[] => {
        return [
          {
            propertyPath: "onClick",
            propertyValue: propValueMap.run,
            isDynamicPropertyPath: true,
          },
        ];
      },
    };
  }

  static getAutoLayoutConfig() {
    return {
      defaults: {
        rows: 4,
        columns: 6.453,
      },
      autoDimension: {
        width: true,
      },
      widgetSize: [
        {
          viewportMinWidth: 0,
          configuration: () => {
            return {
              minWidth: "120px",
              maxWidth: "360px",
              minHeight: "40px",
            };
          },
        },
      ],
      disableResizeHandles: {
        horizontal: true,
        vertical: true,
      },
    };
  }

  static getAnvilConfig(): AnvilConfig | null {
    return {
      isLargeWidget: false,
      widgetSize: {
        maxHeight: {},
        maxWidth: { base: "360px" },
        minHeight: { base: "40px" },
        minWidth: { base: "120px" },
      },
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      "!doc":
        "Buttons are used to capture user intent and trigger actions based on that intent",
      "!url": "https://docs.appsmith.com/widget-reference/button",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      text: "string",
      isDisabled: "bool",
      recaptchaToken: "string",
    };
  }

  static getPropertyPaneContentConfig() {
    return getButtonPropertyPaneContentConfig();
  }

  static getButtonPropertyPaneContentConfig() {
    return [
      {
        sectionName: buttonText("basic"),
        children: [
          {
            propertyName: "text",
            label: buttonText("label"),
            helpText: buttonText("help.label"),
            controlType: "INPUT_TEXT",
            placeholderText: buttonText("placeholders.text"),
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: buttonText("help.onClick"),
            propertyName: "onClick",
            label: "onClick",
            controlType: "ACTION_SELECTOR",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: true,
          },
        ],
      },
      {
        sectionName: buttonText("labels.general"),
        children: [
          {
            helpText: buttonText("help.tooltip"),
            propertyName: "tooltip",
            label: buttonText("labels.tooltip"),
            controlType: "INPUT_TEXT",
            placeholderText: buttonText("placeholders.tooltip"),
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "isVisible",
            label: buttonText("labels.visible"),
            helpText: buttonText("help.visible"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "isDisabled",
            label: buttonText("labels.disabled"),
            controlType: "SWITCH",
            helpText: buttonText("help.disabled"),
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "animateLoading",
            label: buttonText("labels.animateLoading"),
            controlType: "SWITCH",
            helpText: buttonText("help.animateLoading"),
            defaultValue: true,
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
        ],
      },
      {
        sectionName: buttonText("labels.validation"),
        hidden: isAirgapped,
        children: [
          {
            propertyName: "googleRecaptchaKey",
            label: buttonText("labels.recaptchaKey"),
            helpText: buttonText("help.recaptchaKey"),
            controlType: "INPUT_TEXT",
            placeholderText: buttonText("placeholders.recaptchaKey"),
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "recaptchaType",
            label: buttonText("labels.recaptchaVersion"),
            controlType: "DROP_DOWN",
            helpText: buttonText("help.recaptchaVersion"),
            options: [
              {
                label: buttonText("options.recaptchaV3"),
                value: RecaptchaTypes.V3,
              },
              {
                label: buttonText("options.recaptchaV2"),
                value: RecaptchaTypes.V2,
              },
            ],
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                allowedValues: [RecaptchaTypes.V3, RecaptchaTypes.V2],
                default: RecaptchaTypes.V3,
              },
            },
          },
        ],
      },
      // TODO: refactor widgetParentProps implementation when we address #10659
      {
        sectionName: buttonText("labels.formSettings"),
        children: [
          {
            helpText: buttonText("help.disableWhenFormInvalid"),
            propertyName: "disabledWhenInvalid",
            label: buttonText("labels.disableWhenFormInvalid"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            helpText: buttonText("help.resetFormOnSuccess"),
            propertyName: "resetFormOnClick",
            label: buttonText("labels.resetFormOnSuccess"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
        ],
      },
    ];
  }

  static getPropertyPaneStyleConfig() {
    return getButtonPropertyPaneStyleConfig();
  }

  static getButtonPropertyPaneStyleConfig() {
    return [
      {
        sectionName: buttonText("labels.general"),
        children: [
          {
            propertyName: "buttonVariant",
            label: buttonText("labels.buttonVariant"),
            controlType: "ICON_TABS",
            defaultValue: ButtonVariantTypes.PRIMARY,
            fullWidth: true,
            helpText: buttonText("help.buttonVariant"),
            options: [
              {
                label: buttonText("options.primary"),
                value: ButtonVariantTypes.PRIMARY,
              },
              {
                label: buttonText("options.secondary"),
                value: ButtonVariantTypes.SECONDARY,
              },
              {
                label: buttonText("options.tertiary"),
                value: ButtonVariantTypes.TERTIARY,
              },
            ],
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                allowedValues: [
                  ButtonVariantTypes.PRIMARY,
                  ButtonVariantTypes.SECONDARY,
                  ButtonVariantTypes.TERTIARY,
                ],
                default: ButtonVariantTypes.PRIMARY,
              },
            },
          },
        ],
      },
      {
        sectionName: buttonText("labels.icon"),
        children: [
          {
            propertyName: "iconName",
            label: buttonText("labels.selectIcon"),
            helpText: buttonText("help.selectIcon"),
            controlType: "ICON_SELECT",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            updateHook: (
              props: ButtonWidgetProps,
              propertyPath: string,
              propertyValue: string,
            ) => {
              const propertiesToUpdate = [{ propertyPath, propertyValue }];

              if (!props.iconAlign) {
                propertiesToUpdate.push({
                  propertyPath: "iconAlign",
                  propertyValue: Alignment.LEFT,
                });
              }

              return propertiesToUpdate;
            },
            dependencies: ["iconAlign"],
            validation: {
              type: ValidationTypes.TEXT,
            },
          },
          {
            propertyName: "iconAlign",
            label: buttonText("labels.position"),
            helpText: buttonText("help.position"),
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
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                allowedValues: ["center", "left", "right"],
              },
            },
          },
          {
            propertyName: "placement",
            label: buttonText("labels.placement"),
            controlType: "ICON_TABS",
            fullWidth: true,
            helpText: buttonText("help.placement"),
            options: [
              {
                label: buttonText("options.start"),
                value: ButtonPlacementTypes.START,
              },
              {
                label: buttonText("options.between"),
                value: ButtonPlacementTypes.BETWEEN,
              },
              {
                label: buttonText("options.center"),
                value: ButtonPlacementTypes.CENTER,
              },
            ],
            defaultValue: ButtonPlacementTypes.CENTER,
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                allowedValues: [
                  ButtonPlacementTypes.START,
                  ButtonPlacementTypes.BETWEEN,
                  ButtonPlacementTypes.CENTER,
                ],
                default: ButtonPlacementTypes.CENTER,
              },
            },
          },
        ],
      },
      {
        sectionName: buttonText("labels.labelStyles"),
        children: [
          {
            propertyName: "labelTextColor",
            label: buttonText("labels.fontColor"),
            helpText: buttonText("help.fontColor"),
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                regex: /^(?!(?:<|\{\{)).+/,
              },
            },
          },
          {
            propertyName: "labelTextSize",
            label: buttonText("labels.fontSize"),
            helpText: buttonText("help.fontSize"),
            controlType: "DROP_DOWN",
            defaultValue: "0.875rem",
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
              {
                label: "XXL",
                value: "3rem",
                subText: "3rem",
              },
              {
                label: "3XL",
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
            label: buttonText("labels.emphasis"),
            helpText: buttonText("help.emphasis"),
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
        sectionName: buttonText("labels.color"),
        children: [
          {
            propertyName: "buttonColor",
            helpText: buttonText("help.buttonColor"),
            label: buttonText("labels.buttonColor"),
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: buttonText("labels.borderAndShadow"),
        children: [
          {
            propertyName: "borderRadius",
            label: buttonText("labels.borderRadius"),
            helpText: buttonText("help.borderRadius"),
            controlType: "BORDER_RADIUS_OPTIONS",
            isBindProperty: true,
            isJSConvertible: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.TEXT,
            },
          },
          {
            propertyName: "boxShadow",
            label: buttonText("labels.boxShadow"),
            helpText: buttonText("help.boxShadow"),
            controlType: "BOX_SHADOW_OPTIONS",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
    ];
  }

  static getStylesheetConfig(): Stylesheet {
    return {
      buttonColor: "{{appsmith.theme.colors.primaryColor}}",
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
      boxShadow: "none",
    };
  }

  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMetaPropertiesMap(): Record<string, any> {
    return {
      recaptchaToken: undefined,
    };
  }

  static getDerivedPropertiesMap(): DerivedPropertiesMap {
    return {};
  }

  onButtonClick() {
    if (this.props.onClick) {
      this.setState({
        isLoading: true,
      });
      super.executeAction({
        triggerPropertyName: "onClick",
        dynamicString: this.props.onClick,
        event: {
          type: EventType.ON_CLICK,
          callback: this.handleActionComplete,
        },
      });
    } else if (this.props.resetFormOnClick && this.props.onReset) {
      this.props.onReset();
    }
  }

  hasOnClickAction = () => {
    const { isDisabled, onClick, onReset, resetFormOnClick } = this.props;

    return Boolean((onClick || onReset || resetFormOnClick) && !isDisabled);
  };

  clickWithRecaptcha(token: string) {
    this.props.updateWidgetMetaProperty("recaptchaToken", token, {
      triggerPropertyName: "onClick",
      dynamicString: this.props.onClick,
      event: {
        type: EventType.ON_CLICK,
        callback: this.handleActionComplete,
      },
    });
  }

  handleRecaptchaV2Loading = (isLoading: boolean) => {
    if (this.props.onClick) {
      this.setState({ isLoading });
    }
  };

  handleActionComplete = (result: ExecutionResult) => {
    this.setState({
      isLoading: false,
    });

    if (result.success) {
      if (this.props.resetFormOnClick && this.props.onReset)
        this.props.onReset();
    }
  };

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
        setLabel: {
          path: "text",
          type: "string",
        },
        setColor: {
          path: "buttonColor",
          type: "string",
        },
      },
    };
  }

  getWidgetView() {
    const disabled =
      this.props.disabledWhenInvalid &&
      "isFormValid" in this.props &&
      !this.props.isFormValid;
    const isDisabled = this.props.isDisabled || disabled;

    return (
      <ButtonComponent
        borderRadius={this.props.borderRadius}
        boxShadow={this.props.boxShadow}
        buttonColor={this.props.buttonColor}
        buttonVariant={this.props.buttonVariant}
        clickWithRecaptcha={this.clickWithRecaptchaBound}
        googleRecaptchaKey={this.props.googleRecaptchaKey}
        handleRecaptchaV2Loading={this.handleRecaptchaV2Loading}
        iconAlign={this.props.iconAlign}
        iconName={this.props.iconName}
        isDisabled={isDisabled}
        isLoading={this.props.isLoading || this.state.isLoading}
        key={this.props.widgetId}
        labelStyle={this.props.labelStyle}
        labelTextColor={this.props.labelTextColor}
        labelTextSize={this.props.labelTextSize}
        maxWidth={this.props.maxWidth}
        minHeight={this.props.minHeight}
        minWidth={this.props.minWidth}
        onClick={this.hasOnClickAction() ? this.onButtonClickBound : undefined}
        placement={this.props.placement}
        recaptchaType={this.props.recaptchaType}
        shouldFitContent={this.isAutoLayoutMode}
        text={this.props.text}
        tooltip={this.props.tooltip}
        type={this.props.buttonType || ButtonType.BUTTON}
        widgetId={this.props.widgetId}
        widgetName={this.props.widgetName}
      />
    );
  }
}

export interface ButtonWidgetProps extends WidgetProps {
  text?: string;
  onClick?: string;
  isDisabled?: boolean;
  isVisible?: boolean;
  recaptchaType?: RecaptchaType;
  buttonType?: ButtonType;
  googleRecaptchaKey?: string;
  buttonVariant?: ButtonVariant;
  buttonColor?: string;
  borderRadius?: string;
  boxShadow?: string;
  iconName?: IconName;
  iconAlign?: Alignment;
  placement?: ButtonPlacement;
  disabledWhenInvalid?: boolean;
  resetFormOnClick?: boolean;
  labelStyle?: string;
  labelTextColor?: string;
  labelTextSize?: string;
}

interface ButtonWidgetState extends WidgetState {
  isLoading: boolean;
}

export function getButtonPropertyPaneContentConfig() {
  return ButtonWidget.getButtonPropertyPaneContentConfig();
}

export function getButtonPropertyPaneStyleConfig() {
  return ButtonWidget.getButtonPropertyPaneStyleConfig();
}

export default ButtonWidget;
