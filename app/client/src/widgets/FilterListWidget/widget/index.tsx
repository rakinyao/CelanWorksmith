import React from "react";
import { Text } from "@appsmith/ads";
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
  dataMode?: "QUERY" | "OBJECT";
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
      tags: [WIDGET_TAGS.DISPLAY],
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
      dataMode: "OBJECT",
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
            propertyName: "dataMode",
            label: "Data mode",
            controlType: "DROP_DOWN",
            options: [
              { label: "Object", value: "OBJECT" },
              { label: "Query", value: "QUERY" },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "objectTypeId",
            label: "Ontology Object / 本体对象",
            helpText: "Select the ontology object collection to filter.",
            controlType: "CELANWORKSMITH_OBJECT_TYPE",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["dataMode"],
            hidden: (props: FilterListWidgetProps) =>
              props.dataMode !== "OBJECT",
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
    if (this.props.dataMode !== "OBJECT") {
      return (
        <div className="t--filter-list-query-mode">
          <Text>
            FilterList structured conditions are consumed by Object mode
            collection Widgets through objectFilter. Switch to Object mode to
            apply this filter. / FilterList 结构化条件仅由 Object 模式集合
            Widget 通过 objectFilter 使用；请切换到 Object 模式后应用筛选。
          </Text>
        </div>
      );
    }

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
