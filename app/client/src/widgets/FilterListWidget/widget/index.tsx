import React from "react";
import { ValidationTypes } from "constants/WidgetValidation";
import { WIDGET_TAGS } from "constants/WidgetConstants";
import { ResponsiveBehavior } from "layoutSystems/common/utils/constants";
import { FILL_WIDGET_MIN_WIDTH } from "constants/minWidthConstants";
import type { AutocompletionDefinitions } from "WidgetProvider/types";
import type { WidgetProps, WidgetState } from "widgets/BaseWidget";
import BaseWidget from "widgets/BaseWidget";
import { DefaultAutocompleteDefinitions } from "widgets/WidgetUtils";
import FilterListComponent from "../component";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import { FILTER_LIST_WIDGET_TYPE } from "../constants";
import type { FilterCondition } from "./filterUtils";

export interface FilterListWidgetProps extends WidgetProps {
  objectTypeId?: string;
  filter?: { typeId: string; conditions: FilterCondition[]; version: 1 };
}

class FilterListWidget extends BaseWidget<FilterListWidgetProps, WidgetState> {
  static type = FILTER_LIST_WIDGET_TYPE;

  static getConfig() {
    return {
      name: "Filter List",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.DATA],
      searchTags: ["filter", "list", "object", "ontology"],
      needsMeta: true,
    };
  }

  static getDefaults() {
    return {
      rows: 16,
      columns: 24,
      widgetName: "FilterList",
      isVisible: true,
      version: 1,
      objectTypeId: undefined,
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
            propertyName: "objectTypeId",
            label: "Object type",
            helpText: "Selects the CelanWorksmith object type to filter",
            controlType: "INPUT_TEXT",
            isBindProperty: true,
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
      filter: { typeId: "", conditions: [], version: 1 },
      objectTypeId: undefined,
      isValid: false,
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      "!doc":
        "Filter List builds structured filters for CelanWorksmith objects.",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      objectTypeId: "string",
      filter: "?",
      isValid: "boolean",
    };
  }

  getWidgetView() {
    return (
      <FilterListComponent
        initialConditions={this.props.filter?.conditions}
        initialObjectTypeId={this.props.objectTypeId}
        updateWidgetMetaProperty={this.props.updateWidgetMetaProperty}
      />
    );
  }
}

export default FilterListWidget;
