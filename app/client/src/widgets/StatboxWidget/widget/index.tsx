import { ContainerWidget } from "widgets/ContainerWidget/widget";
import ObjectSetBinding, {
  type ObjectSetBindingValue,
} from "celanworksmith/widgets/objectBinding/ObjectSetBinding";
import { normalizeObjectBinding } from "celanworksmith/widgets/objectBinding/normalizeObjectBinding";
import type { ObjectBinding } from "celanworksmith/widgets/objectBinding/types";
import type { ObjectSetWidgetState } from "celanworksmith/widgets/objectBinding/objectSetUtils";
import type {
  CelanworksmithObjectSet,
  CelanworksmithObjectType,
} from "api/CelanworksmithAPI";
import { getCelanworksmithVariablesDataTree } from "selectors/dataTreeSelectors";
import { useSelector } from "react-redux";
import React, { useEffect, useRef } from "react";
import { ValidationTypes } from "constants/WidgetValidation";
import type { SetterConfig, Stylesheet } from "entities/AppTheming";
import type { DerivedPropertiesMap } from "WidgetProvider/factory/types";
import {
  FlexVerticalAlignment,
  Positioning,
} from "layoutSystems/common/utils/constants";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { DefaultAutocompleteDefinitions } from "widgets/WidgetUtils";
import type {
  AnvilConfig,
  AutocompletionDefinitions,
} from "WidgetProvider/types";
import { ButtonVariantTypes } from "components/constants";
import { Colors } from "constants/Colors";
import {
  FlexLayerAlignment,
  ResponsiveBehavior,
} from "layoutSystems/common/utils/constants";
import { GridDefaults, WIDGET_TAGS } from "constants/WidgetConstants";
import type { WidgetProps } from "widgets/BaseWidget";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import type { FlattenedWidgetProps } from "WidgetProvider/types";
import { BlueprintOperationTypes } from "WidgetProvider/types";
import get from "lodash/get";
import type { CanvasWidgetsReduxState } from "ee/reducers/entityReducers/canvasWidgetsReducer";
import { DynamicHeight } from "utils/WidgetFeatures";
import { getWidgetBluePrintUpdates } from "utils/WidgetBlueprintUtils";
import type { FlexLayer } from "layoutSystems/autolayout/utils/types";
import type { LayoutProps } from "layoutSystems/anvil/utils/anvilTypes";
import { statBoxPreset } from "layoutSystems/anvil/layoutComponents/presets/StatboxPreset";
import { LayoutSystemTypes } from "layoutSystems/types";

class StatboxWidget extends ContainerWidget {
  static type = "STATBOX_WIDGET";

  static getConfig() {
    return {
      name: "Stats Box",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.DISPLAY],
      needsMeta: true,
      searchTags: ["statbox"],
      isCanvas: true,
    };
  }

  static getFeatures() {
    return {
      dynamicHeight: {
        sectionIndex: 0,
        active: true,
      },
    };
  }

  static getMethods() {
    return {
      getCanvasHeightOffset: (props: WidgetProps): number => {
        const offset =
          props.borderWidth && props.borderWidth > 1
            ? Math.ceil(
                (2 * parseInt(props.borderWidth, 10) || 0) /
                  GridDefaults.DEFAULT_GRID_ROW_HEIGHT,
              )
            : 0;

        return offset;
      },
    };
  }

  static getDefaults() {
    return {
      rows: 14,
      columns: 22,
      animateLoading: true,
      dataMode: "OBJECT",
      objectTypeId: undefined,
      valuePropertyId: undefined,
      aggregationVariableName: undefined,
      title: "Page Views",
      widgetName: "Statbox",
      backgroundColor: "white",
      borderWidth: "1",
      borderColor: Colors.GREY_5,
      children: [],
      positioning: Positioning.Fixed,
      responsiveBehavior: ResponsiveBehavior.Fill,
      flexVerticalAlignment: FlexVerticalAlignment.Stretch,
      blueprint: {
        view: [
          {
            type: "CANVAS_WIDGET",
            position: { top: 0, left: 0 },
            props: {
              containerStyle: "none",
              canExtend: false,
              detachFromLayout: true,
              children: [],
              version: 1,
              blueprint: {
                view: [
                  {
                    type: "TEXT_WIDGET",
                    size: {
                      rows: 4,
                      cols: 36,
                    },
                    position: { top: 0, left: 1 },
                    props: {
                      text: "Page Views",
                      fontSize: "0.875rem",
                      textColor: "#999999",
                      version: 1,
                    },
                  },
                  {
                    type: "TEXT_WIDGET",
                    size: {
                      rows: 4,
                      cols: 36,
                    },
                    position: {
                      top: 4,
                      left: 1,
                    },
                    props: {
                      text: "2.6 M",
                      fontSize: "1.25rem",
                      fontStyle: "BOLD",
                      version: 1,
                    },
                  },
                  {
                    type: "ICON_BUTTON_WIDGET",
                    size: {
                      rows: 8,
                      cols: 16,
                    },
                    position: {
                      top: 2,
                      left: 46,
                    },
                    props: {
                      iconName: "arrow-top-right",
                      buttonStyle: "PRIMARY",
                      buttonVariant: ButtonVariantTypes.PRIMARY,
                      version: 1,
                    },
                  },
                  {
                    type: "TEXT_WIDGET",
                    size: {
                      rows: 4,
                      cols: 36,
                    },
                    position: {
                      top: 8,
                      left: 1,
                    },
                    props: {
                      text: "21% more than last month",
                      fontSize: "0.875rem",
                      textColor: Colors.GREEN,
                      version: 1,
                    },
                  },
                ],
              },
            },
          },
        ],
        operations: [
          {
            type: BlueprintOperationTypes.MODIFY_PROPS,
            fn: (
              widget: FlattenedWidgetProps,
              widgets: CanvasWidgetsReduxState,
              parent: FlattenedWidgetProps,
              layoutSystemType: LayoutSystemTypes,
            ) => {
              if (layoutSystemType === LayoutSystemTypes.FIXED) {
                return [];
              }

              //get Canvas Widget
              const canvasWidget: FlattenedWidgetProps = get(
                widget,
                "children.0",
              );

              //get Children Ids of the StatBox
              const childrenIds: string[] = get(widget, "children.0.children");

              //get Children props of the StatBox
              const children: FlattenedWidgetProps[] = childrenIds.map(
                (childId) => widgets[childId],
              );

              //get the Text Widgets
              const textWidgets = children.filter(
                (child) => child.type === "TEXT_WIDGET",
              );

              //get all the Icon button Widgets
              const iconWidget = children.filter(
                (child) => child.type === "ICON_BUTTON_WIDGET",
              )?.[0];

              //Create flex layer object based on the children
              const flexLayers: FlexLayer[] = [
                {
                  children: [
                    {
                      id: textWidgets[0].widgetId,
                      align: FlexLayerAlignment.Start,
                    },
                  ],
                },
                {
                  children: [
                    {
                      id: textWidgets[1].widgetId,
                      align: FlexLayerAlignment.Start,
                    },
                    {
                      id: iconWidget.widgetId,
                      align: FlexLayerAlignment.End,
                    },
                  ],
                },
                {
                  children: [
                    {
                      id: textWidgets[2].widgetId,
                      align: FlexLayerAlignment.Start,
                    },
                  ],
                },
              ];

              const layout: LayoutProps[] = statBoxPreset(
                textWidgets[0].widgetId,
                textWidgets[1].widgetId,
                textWidgets[2].widgetId,
                iconWidget.widgetId,
              );

              //create properties to be updated
              return getWidgetBluePrintUpdates({
                [widget.widgetId]: {
                  dynamicHeight: DynamicHeight.AUTO_HEIGHT,
                },
                [canvasWidget.widgetId]: {
                  flexLayers,
                  useAutoLayout: true,
                  positioning: Positioning.Vertical,
                  layout,
                },
                [textWidgets[0].widgetId]: {
                  responsiveBehavior: ResponsiveBehavior.Fill,
                  alignment: FlexLayerAlignment.Start,
                  rightColumn: GridDefaults.DEFAULT_GRID_COLUMNS,
                },
                [textWidgets[1].widgetId]: {
                  responsiveBehavior: ResponsiveBehavior.Fill,
                  alignment: FlexLayerAlignment.Start,
                  rightColumn: GridDefaults.DEFAULT_GRID_COLUMNS - 16,
                },
                [textWidgets[2].widgetId]: {
                  responsiveBehavior: ResponsiveBehavior.Fill,
                  alignment: FlexLayerAlignment.Start,
                  rightColumn: GridDefaults.DEFAULT_GRID_COLUMNS,
                },
                [iconWidget.widgetId]: {
                  responsiveBehavior: ResponsiveBehavior.Hug,
                  alignment: FlexLayerAlignment.End,
                  topRow: 4,
                  bottomRow: 8,
                  leftColumn: GridDefaults.DEFAULT_GRID_COLUMNS - 16,
                  rightColumn: GridDefaults.DEFAULT_GRID_COLUMNS,
                },
              });
            },
          },
        ],
      },
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
              minHeight: "50px",
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
        minHeight: { base: "50px" },
        minWidth: { base: "280px" },
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
              { label: "Query / 查询", value: "QUERY" },
              { label: "Object / 本体", value: "OBJECT" },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "objectTypeId",
            label: "Ontology Object / 本体对象",
            helpText: "Select the stable Object Type ID for this statistic.",
            controlType: "CELANWORKSMITH_OBJECT_TYPE",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["dataMode"],
            hidden: (props: StatboxWidgetProps) => props.dataMode !== "OBJECT",
          },
          {
            propertyName: "valuePropertyId",
            label: "Value property / 数值属性",
            helpText:
              "Select a numeric property when this Object query returns one object.",
            controlType: "CELANWORKSMITH_OBJECT_PROPERTY",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["dataMode", "objectTypeId"],
            hidden: (props: StatboxWidgetProps) => props.dataMode !== "OBJECT",
          },
          {
            propertyName: "aggregationVariableName",
            label: "Aggregation variable / 聚合变量",
            helpText:
              "Use a numeric CelanWorksmith aggregation variable for multi-object results.",
            controlType: "INPUT_TEXT",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["dataMode"],
            hidden: (props: StatboxWidgetProps) => props.dataMode !== "OBJECT",
          },
          {
            propertyName: "title",
            label: "Title / 标题",
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["dataMode"],
            hidden: (props: StatboxWidgetProps) => props.dataMode !== "OBJECT",
          },
        ],
      },
      {
        sectionName: "General",
        children: [
          {
            propertyName: "isVisible",
            helpText: "Controls the visibility of the widget",
            label: "Visible",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "shouldScrollContents",
            helpText: "Enables scrolling for content inside the widget",
            label: "Scroll contents",
            controlType: "SWITCH",
            isBindProperty: false,
            isTriggerProperty: false,
          },
          {
            propertyName: "animateLoading",
            label: "Animate loading",
            controlType: "SWITCH",
            helpText: "Controls the loading of the widget",
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

  static getPropertyPaneStyleConfig() {
    return [
      {
        sectionName: "Color",
        children: [
          {
            propertyName: "backgroundColor",
            helpText: "Use a html color name, HEX, RGB or RGBA value",
            placeholderText: "#FFFFFF / Gray / rgb(255, 99, 71)",
            label: "Background color",
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "borderColor",
            helpText: "Use a html color name, HEX, RGB or RGBA value",
            placeholderText: "#FFFFFF / Gray / rgb(255, 99, 71)",
            label: "Border color",
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: "Border and shadow",
        children: [
          {
            propertyName: "borderWidth",
            helpText: "Enter value for border width",
            label: "Border width",
            placeholderText: "Enter value in px",
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.NUMBER },
            postUpdateAction: ReduxActionTypes.CHECK_CONTAINERS_FOR_AUTO_HEIGHT,
          },
          {
            propertyName: "borderRadius",
            label: "Border radius",
            helpText:
              "Rounds the corners of the icon button's outer border edge",
            controlType: "BORDER_RADIUS_OPTIONS",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "boxShadow",
            label: "Box shadow",
            helpText:
              "Enables you to cast a drop shadow from the frame of the widget",
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
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
      boxShadow: "{{appsmith.theme.boxShadow.appBoxShadow}}",
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      "!doc": "Show and highlight stats from your data sources",
      "!url": "https://docs.appsmith.com/widget-reference/stat-box",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
    };
  }

  static getDerivedPropertiesMap(): DerivedPropertiesMap {
    return { positioning: Positioning.Fixed };
  }

  getWidgetView() {
    const props = this.props as StatboxWidgetProps;
    const objectBinding = normalizeObjectBinding(
      StatboxWidget.type,
      props as unknown as Record<string, unknown>,
      {},
    );

    if (objectBinding.mode !== "OBJECT") {
      return super.getWidgetView();
    }

    return (
      <StatboxObjectMode
        aggregationVariableName={objectBinding.binding.aggregationVariableName}
        backgroundColor={props.backgroundColor}
        binding={objectBinding.binding}
        filter={props.objectFilter}
        objectTypeId={objectBinding.binding.objectTypeId}
        title={props.title}
        widgetId={props.widgetId}
      />
    );
  }
}

export type StatboxObjectState = ObjectSetWidgetState | "missingBinding";

interface StatboxAggregationVariableMeta {
  error?: string;
  status?: ObjectSetWidgetState | "idle";
}

interface StatboxVariables {
  _meta?: Record<string, StatboxAggregationVariableMeta>;
  [name: string]: unknown;
}

export interface StatboxObjectValueInput {
  aggregationVariableName?: string;
  binding?: Pick<ObjectBinding, "valuePropertyId">;
  metadata?: CelanworksmithObjectType;
  result?: CelanworksmithObjectSet;
  variables?: StatboxVariables;
}

export interface StatboxObjectValue {
  errorMessage?: string;
  state: StatboxObjectState;
  value?: number;
}

export const resolveStatboxObjectValue = ({
  aggregationVariableName,
  binding,
  metadata,
  result,
  variables,
}: StatboxObjectValueInput): StatboxObjectValue => {
  if (aggregationVariableName) {
    const variableName = getAggregationVariableName(aggregationVariableName);
    const metadata = variables?._meta?.[variableName];

    if (metadata?.status === "idle" || metadata?.status === "loading") {
      return { state: "loading" };
    }

    if (metadata?.status === "permissionDenied") {
      return { state: "permissionDenied" };
    }

    if (metadata?.status === "error") {
      return isPermissionError(metadata.error)
        ? { state: "permissionDenied" }
        : { errorMessage: metadata.error, state: "error" };
    }

    if (metadata?.status === "empty") return { state: "empty" };

    const value = variables?.[variableName];

    if (value === undefined || value === null) return { state: "empty" };

    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { state: "typeMismatch" };
    }

    return { state: "ready", value };
  }

  if (!binding?.valuePropertyId) return { state: "missingBinding" };

  if (!result?.items.length) return { state: "empty" };

  if (result.items.length !== 1) return { state: "typeMismatch" };

  const property = metadata?.properties.find(
    (candidate) => candidate.id === binding.valuePropertyId,
  );

  if (
    !property ||
    (property.dataType !== "INTEGER" && property.dataType !== "DECIMAL")
  ) {
    return { state: "typeMismatch" };
  }

  const value = result.items[0].properties[binding.valuePropertyId];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { state: "typeMismatch" };
  }

  return { state: "ready", value };
};

const getAggregationVariableName = (value: string) => {
  const trimmedValue = value.trim();
  const variablePath = trimmedValue.match(
    /^(?:\{\{\s*)?\$variables\.([^\s{}]+?)(?:\s*\}\})?$/,
  );

  return variablePath?.[1] || trimmedValue;
};

const isPermissionError = (error?: string) =>
  Boolean(error?.match(/permission denied|forbidden/i));

export const getStatboxObjectStateMessage = (
  state: StatboxObjectState,
  errorMessage?: string,
) => {
  switch (state) {
    case "missingBinding":
      return "Select an Object Type and a numeric value source.";
    case "loading":
      return "Loading object data...";
    case "empty":
      return "No objects found.";
    case "permissionDenied":
      return "Access to object data is denied.";
    case "error":
      return errorMessage || "Unable to load objects.";
    case "typeMismatch":
      return "The Object value must be a finite number.";
    default:
      return undefined;
  }
};

interface StatboxObjectModeProps {
  aggregationVariableName?: string;
  backgroundColor?: string;
  binding: ObjectBinding;
  filter?: unknown;
  objectTypeId?: string;
  title?: string;
  widgetId: string;
}

interface StatboxObjectOverlayProps {
  objectSet: ObjectSetBindingValue;
  props: StatboxObjectModeProps;
  variables: StatboxVariables;
}

const StatboxObjectOverlay = ({
  objectSet,
  props,
  variables,
}: StatboxObjectOverlayProps) => {
  const lastValue = useRef<number>();
  const value = resolveStatboxObjectValue({
    aggregationVariableName: props.aggregationVariableName,
    binding: props.binding,
    metadata: objectSet.metadata,
    result: objectSet.result,
    variables,
  });
  const hasAggregationVariable = Boolean(props.aggregationVariableName);
  const hasBinding =
    hasAggregationVariable ||
    Boolean(props.objectTypeId && props.binding.valuePropertyId);
  const state = !hasBinding
    ? "missingBinding"
    : hasAggregationVariable && !props.objectTypeId
      ? value.state
      : hasAggregationVariable && value.state === "ready"
        ? "ready"
        : objectSet.status === "ready"
          ? value.state
          : objectSet.status;
  const resolvedValue = state === "ready" ? value.value : undefined;
  const visibleValue =
    resolvedValue === undefined && state === "loading"
      ? lastValue.current
      : resolvedValue;
  const message = getStatboxObjectStateMessage(
    state,
    value.errorMessage ||
      (hasAggregationVariable ? undefined : objectSet.error?.message),
  );

  useEffect(() => {
    if (resolvedValue !== undefined) lastValue.current = resolvedValue;
  }, [resolvedValue]);

  return (
    <div
      aria-label="Object statistic"
      style={{
        alignItems: "flex-start",
        backgroundColor: props.backgroundColor || "white",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        inset: 0,
        justifyContent: "center",
        padding: "12px",
        pointerEvents: "none",
        position: "absolute",
        width: "100%",
      }}
    >
      <div style={{ color: "#999999", fontSize: "0.875rem" }}>
        {props.title || "Page Views"}
      </div>
      {visibleValue !== undefined ? (
        <div data-testid="statbox-object-value" style={{ fontWeight: "bold" }}>
          {visibleValue}
        </div>
      ) : null}
      {message ? (
        <div
          aria-live={state === "loading" ? "polite" : undefined}
          role={state === "loading" ? undefined : "alert"}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
};

export function StatboxObjectMode(props: StatboxObjectModeProps) {
  const variables = useSelector(
    getCelanworksmithVariablesDataTree,
  ) as StatboxVariables;

  return (
    <div style={{ height: "100%", position: "relative", width: "100%" }}>
      {props.aggregationVariableName && !props.objectTypeId ? (
        <StatboxObjectOverlay
          objectSet={{ status: "typeMismatch" }}
          props={props}
          variables={variables}
        />
      ) : (
        <ObjectSetBinding
          filter={props.filter}
          objectTypeId={props.objectTypeId}
          widgetId={props.widgetId}
          widgetType={StatboxWidget.type}
        >
          {(objectSet) => (
            <StatboxObjectOverlay
              objectSet={objectSet}
              props={props}
              variables={variables}
            />
          )}
        </ObjectSetBinding>
      )}
    </div>
  );
}

export interface StatboxWidgetProps extends WidgetProps {
  aggregationVariableName?: string;
  backgroundColor?: string;
  dataMode?: "OBJECT" | "QUERY";
  objectFilter?: unknown;
  objectTypeId?: string;
  title?: string;
  valuePropertyId?: string;
}

export default StatboxWidget;
