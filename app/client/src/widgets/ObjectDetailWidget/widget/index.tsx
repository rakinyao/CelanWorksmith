import React from "react";
import { ValidationTypes } from "constants/WidgetValidation";
import { WIDGET_TAGS } from "constants/WidgetConstants";
import { ResponsiveBehavior } from "layoutSystems/common/utils/constants";
import { FILL_WIDGET_MIN_WIDTH } from "constants/minWidthConstants";
import type { AutocompletionDefinitions } from "WidgetProvider/types";
import type { WidgetProps, WidgetState } from "widgets/BaseWidget";
import BaseWidget from "widgets/BaseWidget";
import { DefaultAutocompleteDefinitions } from "widgets/WidgetUtils";
import ObjectDetailComponent from "../component";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import {
  OBJECT_DETAIL_DISPLAY_MODE_OPTIONS,
  OBJECT_DETAIL_WIDGET_TYPE,
} from "../constants";
import { ObjectDetailDisplayMode } from "./objectDetailUtils";

export interface ObjectDetailWidgetProps extends WidgetProps {
  objectData?: unknown;
  displayMode?: ObjectDetailDisplayMode;
}

class ObjectDetailWidget extends BaseWidget<
  ObjectDetailWidgetProps,
  WidgetState
> {
  static type = OBJECT_DETAIL_WIDGET_TYPE;

  static getConfig() {
    return {
      name: "Object Detail",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.DATA],
      searchTags: ["object", "detail", "ontology"],
      needsMeta: true,
    };
  }

  static getDefaults() {
    return {
      rows: 16,
      columns: 24,
      widgetName: "ObjectDetail",
      isVisible: true,
      version: 1,
      objectData: undefined,
      displayMode: ObjectDetailDisplayMode.BUSINESS_ONLY,
      responsiveBehavior: ResponsiveBehavior.Fill,
      minWidth: FILL_WIDGET_MIN_WIDTH,
    };
  }

  static getPropertyPaneContentConfig() {
    return [
      {
        sectionName: "Data",
        children: [
          {
            propertyName: "objectData",
            label: "Object data",
            helpText: "Binds one CelanWorksmith object to this widget",
            controlType: "INPUT_TEXT",
            placeholderText: "{{Table1.selectedRow}}",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "displayMode",
            label: "Display mode",
            controlType: "DROP_DOWN",
            options: OBJECT_DETAIL_DISPLAY_MODE_OPTIONS,
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: "General",
        children: [
          {
            propertyName: "isVisible",
            label: "Visible",
            helpText: "Controls the visibility of the widget",
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
      selectedLinkedObject: undefined,
      selectedLinkedObjectId: undefined,
      selectedLinkType: undefined,
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      "!doc":
        "Object Detail renders a CelanWorksmith object and linked object selection.",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      objectData: "?",
      selectedLinkedObject: "?",
      selectedLinkedObjectId: "string",
      selectedLinkType: "string",
    };
  }

  getWidgetView() {
    return (
      <ObjectDetailComponent
        displayMode={this.props.displayMode}
        objectData={this.props.objectData}
        updateWidgetMetaProperty={this.props.updateWidgetMetaProperty}
        widgetId={this.props.widgetId}
      />
    );
  }
}

export default ObjectDetailWidget;
