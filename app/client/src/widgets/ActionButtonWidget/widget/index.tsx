import React from "react";
import { ValidationTypes } from "constants/WidgetValidation";
import { WIDGET_TAGS } from "constants/WidgetConstants";
import { ResponsiveBehavior } from "layoutSystems/common/utils/constants";
import { BUTTON_MIN_WIDTH } from "constants/minWidthConstants";
import type { AutocompletionDefinitions } from "WidgetProvider/types";
import type { WidgetProps, WidgetState } from "widgets/BaseWidget";
import BaseWidget from "widgets/BaseWidget";
import { DefaultAutocompleteDefinitions } from "widgets/WidgetUtils";
import ActionButtonComponent from "../component";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import { ACTION_BUTTON_WIDGET_TYPE } from "../constants";

export interface ActionButtonWidgetProps extends WidgetProps {
  actionId?: string;
  objectData?: unknown;
  parameters?: unknown;
  label?: string;
  isDisabled?: boolean;
}

class ActionButtonWidget extends BaseWidget<
  ActionButtonWidgetProps,
  WidgetState
> {
  static type = ACTION_BUTTON_WIDGET_TYPE;

  static getConfig() {
    return {
      name: "Action Button",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.BUTTONS],
      searchTags: ["action", "object", "ontology"],
      needsMeta: true,
    };
  }

  static getDefaults() {
    return {
      rows: 4,
      columns: 16,
      widgetName: "ActionButton",
      label: "Run action",
      actionId: undefined,
      objectData: undefined,
      parameters: {},
      isDisabled: false,
      isVisible: true,
      version: 1,
      responsiveBehavior: ResponsiveBehavior.Hug,
      minWidth: BUTTON_MIN_WIDTH,
    };
  }

  static getPropertyPaneContentConfig() {
    return [
      {
        sectionName: "Action",
        children: [
          {
            propertyName: "label",
            label: "Label",
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "actionId",
            label: "Action type",
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "objectData",
            label: "Object data",
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.OBJECT },
          },
          {
            propertyName: "parameters",
            label: "Parameters",
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.OBJECT },
          },
        ],
      },
      {
        sectionName: "General",
        children: [
          {
            propertyName: "isDisabled",
            label: "Disabled",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "isVisible",
            label: "Visible",
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

  static getMetaPropertiesMap(): Record<string, unknown> {
    return {
      executionStatus: "idle",
      lastResult: undefined,
      lastError: undefined,
      requestId: undefined,
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      "!doc": "Runs a CelanWorksmith Action for the bound object.",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      executionStatus: "string",
      lastResult: "?",
      lastError: "?",
      requestId: "string",
    };
  }

  getWidgetView() {
    return (
      <ActionButtonComponent
        actionId={this.props.actionId}
        isDisabled={this.props.isDisabled}
        label={this.props.label}
        objectData={this.props.objectData}
        parameters={this.props.parameters}
        updateWidgetMetaProperty={this.props.updateWidgetMetaProperty}
        updateWidgetProperty={this.props.updateWidgetProperty}
      />
    );
  }
}

export default ActionButtonWidget;
