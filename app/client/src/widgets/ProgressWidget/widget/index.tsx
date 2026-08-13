import React from "react";

import type { DerivedPropertiesMap } from "WidgetProvider/factory/types";
import { DefaultAutocompleteDefinitions } from "widgets/WidgetUtils";
import type { WidgetProps, WidgetState } from "widgets/BaseWidget";
import BaseWidget from "widgets/BaseWidget";

import { Colors } from "constants/Colors";
import { ValidationTypes } from "constants/WidgetValidation";
import type { SetterConfig, Stylesheet } from "entities/AppTheming";
import ProgressComponent from "../component";
import { ProgressType, ProgressVariant } from "../constants";
import { isAutoLayout } from "layoutSystems/autolayout/utils/flexWidgetUtils";
import type {
  AnvilConfig,
  AutocompletionDefinitions,
} from "WidgetProvider/types";
import { WIDGET_TAGS } from "constants/WidgetConstants";
import { ResponsiveBehavior } from "layoutSystems/common/utils/constants";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import ObjectSetBinding from "celanworksmith/widgets/objectBinding/ObjectSetBinding";
import { useSelector } from "react-redux";
import { getCelanworksmithVariablesDataTree } from "selectors/dataTreeSelectors";
import { getProgressObjectValue } from "./progressObjectBinding";

const getProgressObjectStateMessage = (
  status: "loading" | "empty" | "error" | "permissionDenied" | "typeMismatch",
  error?: string,
) => {
  switch (status) {
    case "loading":
      return "Loading object data...";
    case "empty":
      return "No objects found.";
    case "permissionDenied":
      return "Access to object data is denied.";
    case "error":
      return error || "Unable to load objects.";
    case "typeMismatch":
      return "The Object binding is incompatible.";
  }
};

interface ProgressObjectModeProps {
  aggregationVariableName?: string;
  componentProps: Omit<ProgressComponentProps, "value">;
  objectFilter?: unknown;
  objectTypeId?: string;
  valuePropertyId?: string;
  widgetId: string;
}

export function ProgressObjectMode({
  aggregationVariableName,
  componentProps,
  objectFilter,
  objectTypeId,
  valuePropertyId,
  widgetId,
}: ProgressObjectModeProps) {
  const variables = useSelector(getCelanworksmithVariablesDataTree);

  return (
    <ObjectSetBinding
      filter={objectFilter}
      objectTypeId={objectTypeId}
      widgetId={widgetId}
      widgetType="PROGRESS_WIDGET"
    >
      {(objectSet) => {
        const progressValue = getProgressObjectValue({
          aggregationVariableName,
          error: objectSet.error,
          metadata: objectSet.metadata,
          result: objectSet.result,
          status: objectSet.status,
          valuePropertyId,
          variables,
        });

        if (progressValue.status === "ready") {
          return (
            <ProgressComponent
              {...componentProps}
              value={progressValue.value!}
            />
          );
        }

        const message = getProgressObjectStateMessage(
          progressValue.status,
          progressValue.error,
        );

        return progressValue.status === "loading" ? (
          <div aria-live="polite">{message}</div>
        ) : (
          <div role="alert">{message}</div>
        );
      }}
    </ObjectSetBinding>
  );
}

class ProgressWidget extends BaseWidget<ProgressWidgetProps, WidgetState> {
  static type = "PROGRESS_WIDGET";

  static getConfig() {
    return {
      name: "Progress", // The display name which will be made in uppercase and show in the widgets panel ( can have spaces )
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.CONTENT],
      needsMeta: false, // Defines if this widget adds any meta properties
      isCanvas: false, // Defines if this widget has a canvas within in which we can drop other widgets
      searchTags: ["percent"],
    };
  }

  static getDefaults() {
    return {
      widgetName: "Progress",
      rows: 4,
      columns: 28,
      fillColor: Colors.GREEN,
      isIndeterminate: false,
      showResult: false,
      counterClosewise: false,
      isVisible: true,
      steps: 1,
      progressType: ProgressType.LINEAR,
      progress: 50,
      dataMode: "OBJECT",
      objectTypeId: undefined,
      valuePropertyId: undefined,
      aggregationVariableName: undefined,
      version: 1,
      responsiveBehavior: ResponsiveBehavior.Fill,
    };
  }

  static getAutoLayoutConfig() {
    return {
      disabledPropsDefaults: {
        progressType: ProgressType.LINEAR,
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

  static getPropertyPaneContentConfig() {
    return [
      {
        sectionName: "CelanWorksmith Object data",
        children: [
          {
            propertyName: "dataMode",
            label: "Data mode / 数据模式",
            controlType: "DROP_DOWN",
            options: [
              { label: "Object / 本体", value: "OBJECT" },
              { label: "Query / 查询", value: "QUERY" },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "objectTypeId",
            label: "Ontology Object / 本体对象",
            helpText:
              "Select the ontology object collection that supplies progress values.",
            controlType: "CELANWORKSMITH_OBJECT_TYPE",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["dataMode"],
            hidden: (props: ProgressWidgetProps) => props.dataMode !== "OBJECT",
          },
          {
            propertyName: "valuePropertyId",
            label: "Value property / 数值属性",
            helpText: "Select the numeric property used for progress.",
            controlType: "CELANWORKSMITH_OBJECT_PROPERTY",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["dataMode", "objectTypeId"],
            hidden: (props: ProgressWidgetProps) => props.dataMode !== "OBJECT",
          },
          {
            propertyName: "aggregationVariableName",
            label: "Aggregation variable / 聚合变量",
            helpText:
              "Optional variable name or $variables path used instead of the Object value.",
            controlType: "INPUT_TEXT",
            placeholderText: "orderCompletion or $variables.orderCompletion",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["dataMode"],
            hidden: (props: ProgressWidgetProps) => props.dataMode !== "OBJECT",
          },
        ],
      },
      {
        sectionName: "Basic",
        children: [
          {
            helpText:
              "Determines if progress indicator will be determinate or not",
            propertyName: "isIndeterminate",
            label: "Infinite loading",
            controlType: "SWITCH",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            helpText: "Determines the shape of the progress indicator",
            propertyName: "progressType",
            label: "Type",
            controlType: "ICON_TABS",
            fullWidth: true,
            options: [
              {
                label: "Circular",
                value: ProgressType.CIRCULAR,
              },
              {
                label: "Linear",
                value: ProgressType.LINEAR,
              },
            ],
            defaultValue: ProgressType.LINEAR,
            isBindProperty: false,
            isTriggerProperty: false,
            hidden: isAutoLayout,
          },
          {
            helpText: "Sets the value of the progress indicator",
            propertyName: "progress",
            label: "Progress",
            controlType: "INPUT_TEXT",
            placeholderText: "Enter progress value",
            isBindProperty: true,
            isTriggerProperty: false,
            defaultValue: 50,
            validation: {
              type: ValidationTypes.NUMBER,
              params: { min: 0, max: 100, default: 50 },
            },
            hidden: (props: ProgressWidgetProps) =>
              props.isIndeterminate || props.dataMode === "OBJECT",
            dependencies: ["dataMode", "isIndeterminate"],
          },
        ],
      },
      {
        sectionName: "General",
        children: [
          {
            helpText: "Sets the number of steps",
            propertyName: "steps",
            label: "Number of steps",
            controlType: "INPUT_TEXT",
            placeholderText: "Enter number of steps",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.NUMBER,
              params: {
                min: 1,
                max: 100,
                default: 1,
                natural: true,
                passThroughOnZero: false,
              },
            },
            hidden: (props: ProgressWidgetProps) => props.isIndeterminate,
            dependencies: ["isIndeterminate"],
          },
          {
            helpText: "Controls the visibility of the widget",
            propertyName: "isVisible",
            label: "Visible",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "counterClockwise",
            helpText: "Whether to rotate in counterclockwise direction",
            label: "Counterclockwise",
            controlType: "SWITCH",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
            hidden: (props: ProgressWidgetProps) =>
              props.progressType === ProgressType.LINEAR ||
              props.isIndeterminate,
            dependencies: ["isIndeterminate", "progressType"],
          },
          {
            helpText:
              "Controls the visibility with the value of progress indicator",
            propertyName: "showResult",
            label: "Show result",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
            hidden: (props: ProgressWidgetProps) => props.isIndeterminate,
            dependencies: ["isIndeterminate"],
          },
        ],
      },
    ];
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      "!doc":
        "Progress indicators commonly known as spinners, express an unspecified wait time or display the length of a process.",
      "!url": "https://docs.appsmith.com/widget-reference/progress",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      progress: "number",
    };
  }

  static getPropertyPaneStyleConfig() {
    return [
      {
        sectionName: "Color",
        children: [
          {
            helpText: "Sets the color of the progress indicator",
            propertyName: "fillColor",
            label: "Fill color",
            controlType: "COLOR_PICKER",
            defaultColor: Colors.GREEN,
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
        ],
      },
    ];
  }

  static getStylesheetConfig(): Stylesheet {
    return {
      fillColor: "{{appsmith.theme.colors.primaryColor}}",
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
    };
  }

  static getDerivedPropertiesMap(): DerivedPropertiesMap {
    return {};
  }

  static getDefaultPropertiesMap(): Record<string, string> {
    return {};
  }

  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMetaPropertiesMap(): Record<string, any> {
    return {};
  }

  static getSetterConfig(): SetterConfig {
    return {
      __setters: {
        setVisibility: {
          path: "isVisible",
          type: "boolean",
        },
        setProgress: {
          path: "progress",
          type: "number",
        },
      },
    };
  }

  getWidgetView() {
    const {
      borderRadius,
      counterClockwise,
      fillColor,
      isIndeterminate,
      progress,
      progressType,
      showResult,
      steps,
    } = this.props;
    const { componentHeight, componentWidth } = this.props;
    const isScaleY = componentHeight > componentWidth;
    const componentProps = {
      borderRadius,
      counterClockwise,
      fillColor,
      isScaleY,
      showResult,
      steps,
      type: progressType,
      variant: isIndeterminate
        ? ProgressVariant.INDETERMINATE
        : ProgressVariant.DETERMINATE,
    };

    if (this.props.dataMode === "OBJECT") {
      return (
        <ProgressObjectMode
          aggregationVariableName={this.props.aggregationVariableName}
          componentProps={componentProps}
          objectFilter={this.props.objectFilter}
          objectTypeId={this.props.objectTypeId}
          valuePropertyId={this.props.valuePropertyId}
          widgetId={this.props.widgetId}
        />
      );
    }

    return <ProgressComponent {...componentProps} value={progress} />;
  }
}

export interface ProgressWidgetProps extends WidgetProps {
  aggregationVariableName?: string;
  dataMode?: "OBJECT" | "QUERY";
  isIndeterminate: boolean;
  objectFilter?: unknown;
  objectTypeId?: string;
  progressType: ProgressType;
  progress: number;
  steps: number;
  showResult: boolean;
  counterClockwise: boolean;
  fillColor: string;
  valuePropertyId?: string;
}

export default ProgressWidget;
