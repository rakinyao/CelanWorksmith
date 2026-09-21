import React from "react";
import type { WidgetProps, WidgetState } from "widgets/BaseWidget";
import BaseWidget from "widgets/BaseWidget";
import DividerComponent from "../component";
import { ValidationTypes } from "constants/WidgetValidation";
import { DefaultAutocompleteDefinitions } from "widgets/WidgetUtils";
import { isAutoLayout } from "layoutSystems/autolayout/utils/flexWidgetUtils";
import type {
  AnvilConfig,
  AutocompletionDefinitions,
} from "WidgetProvider/types";
import type { SetterConfig } from "entities/AppTheming";
import { Colors } from "constants/Colors";
import { FILL_WIDGET_MIN_WIDTH } from "constants/minWidthConstants";
import { ResponsiveBehavior } from "layoutSystems/common/utils/constants";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";

import { WIDGET_TAGS } from "constants/WidgetConstants";
import i18n from "i18n";

const dividerText = (path: string) => i18n.t(`widgetProperty.divider.${path}`);

class DividerWidget extends BaseWidget<DividerWidgetProps, WidgetState> {
  static type = "DIVIDER_WIDGET";

  static getConfig() {
    return {
      name: "Divider",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.LAYOUT],
      searchTags: ["line"],
    };
  }

  static getDefaults() {
    return {
      rows: 4,
      columns: 20,
      widgetName: "Divider",
      orientation: "horizontal",
      capType: "nc",
      capSide: 0,
      strokeStyle: "solid",
      dividerColor: Colors.GRAY,
      thickness: 2,
      isVisible: true,
      version: 1,
      animateLoading: true,
      responsiveBehavior: ResponsiveBehavior.Fill,
      minWidth: FILL_WIDGET_MIN_WIDTH,
    };
  }

  static getAutoLayoutConfig() {
    return {
      widgetSize: [
        {
          viewportMinWidth: 0,
          configuration: () => {
            return {
              minWidth: "280px",
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
        minWidth: { base: "280px" },
      },
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      "!doc": "Divider is a simple UI widget used as a separator",
      "!url": "https://docs.appsmith.com/widget-reference/divider",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      orientation: "string",
      capType: "string",
      capSide: "number",
      strokeStyle: "string",
      dividerColor: "string",
      thickness: "number",
    };
  }

  static getSetterConfig(): SetterConfig {
    return {
      __setters: {
        setVisibility: {
          path: "isVisible",
          type: "boolean",
        },
      },
    };
  }

  static getPropertyPaneContentConfig() {
    return getDividerPropertyPaneContentConfig();
  }

  static getDividerPropertyPaneContentConfig() {
    return [
      {
        sectionName: dividerText("content.general"),
        children: [
          {
            helpText: dividerText("help.visible"),
            propertyName: "isVisible",
            label: dividerText("content.visible"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "animateLoading",
            label: dividerText("content.animateLoading"),
            controlType: "SWITCH",
            helpText: dividerText("help.animateLoading"),
            defaultValue: true,
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
    return getDividerPropertyPaneStyleConfig();
  }

  static getDividerPropertyPaneStyleConfig() {
    return [
      {
        sectionName: dividerText("style.general"),
        children: [
          {
            helpText: dividerText("help.orientation"),
            propertyName: "orientation",
            label: dividerText("style.orientation"),
            controlType: "ICON_TABS",
            defaultValue: "horizontal",
            fullWidth: true,
            options: [
              {
                label: dividerText("option.horizontal"),
                value: "horizontal",
              },
              {
                label: dividerText("option.vertical"),
                value: "vertical",
              },
            ],
            hidden: isAutoLayout,
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: dividerText("style.stroke"),
        children: [
          {
            helpText: dividerText("help.dividerColor"),
            propertyName: "dividerColor",
            label: dividerText("style.color"),
            controlType: "COLOR_PICKER",
            isBindProperty: true,
            isJSConvertible: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                regex: /^(?![<|{{]).+/,
              },
            },
          },
          {
            helpText: dividerText("help.strokeStyle"),
            propertyName: "strokeStyle",
            label: dividerText("style.strokeStyle"),
            controlType: "DROP_DOWN",
            options: [
              {
                label: dividerText("option.solid"),
                value: "solid",
                icon: "cap-solid",
              },
              {
                label: dividerText("option.dashed"),
                value: "dashed",
                icon: "line-dashed",
              },
              {
                label: dividerText("option.dotted"),
                value: "dotted",
                icon: "line-dotted",
              },
            ],
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: dividerText("help.thickness"),
            propertyName: "thickness",
            label: dividerText("style.thickness"),
            controlType: "INPUT_TEXT",
            placeholderText: dividerText("placeholder.thickness"),
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.NUMBER,
              params: { min: 0, default: 0 },
            },
          },
        ],
      },
      {
        sectionName: dividerText("style.cap"),
        children: [
          {
            helpText: dividerText("help.capType"),
            propertyName: "capType",
            label: dividerText("style.cap"),
            controlType: "DROP_DOWN",
            isJSConvertible: true,
            options: [
              {
                label: dividerText("option.noCap"),
                value: "nc",
                icon: "cap-solid",
              },
              {
                label: dividerText("option.arrow"),
                value: "arrow",
                icon: "arrow-forward",
              },
              {
                label: dividerText("option.dot"),
                value: "dot",
                icon: "cap-dot",
              },
            ],
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                allowedValues: ["nc", "arrow", "dot"],
                required: true,
                default: "nc",
              },
            },
          },
          {
            helpText: dividerText("help.capSide"),
            propertyName: "capSide",
            label: dividerText("style.capPosition"),
            controlType: "ICON_TABS",
            fullWidth: true,
            options: [
              {
                startIcon: "contract-left-line",
                value: -1,
              },
              {
                startIcon: "column-freeze",
                value: 0,
                width: 48,
              },
              {
                startIcon: "contract-right-line",
                value: 1,
              },
            ],
            defaultValue: 0,
            isBindProperty: false,
            isTriggerProperty: false,
          },
        ],
      },
    ];
  }

  getWidgetView() {
    return (
      <DividerComponent
        capSide={this.props.capSide}
        capType={this.props.capType}
        dividerColor={this.props.dividerColor}
        orientation={this.props.orientation}
        strokeStyle={this.props.strokeStyle}
        thickness={this.props.thickness}
      />
    );
  }
}

export interface DividerWidgetProps extends WidgetProps {
  orientation: string;
  capType: string;
  capSide?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  dividerColor?: string;
  thickness?: number;
}

export function getDividerPropertyPaneContentConfig() {
  return DividerWidget.getDividerPropertyPaneContentConfig();
}

export function getDividerPropertyPaneStyleConfig() {
  return DividerWidget.getDividerPropertyPaneStyleConfig();
}

export default DividerWidget;
