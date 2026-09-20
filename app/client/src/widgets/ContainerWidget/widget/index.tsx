import type { MouseEventHandler } from "react";
import React from "react";
import type { DerivedPropertiesMap } from "WidgetProvider/factory/types";
import type { ContainerStyle } from "../component";
import ContainerComponent from "../component";
import type { WidgetProps, WidgetState } from "widgets/BaseWidget";
import BaseWidget from "widgets/BaseWidget";
import { ValidationTypes } from "constants/WidgetValidation";
import { compact, get, map, sortBy } from "lodash";
import WidgetsMultiSelectBox from "layoutSystems/fixedlayout/common/widgetGrouping/WidgetsMultiSelectBox";
import type { SetterConfig, Stylesheet } from "entities/AppTheming";
import { getSnappedGrid } from "sagas/WidgetOperationUtils";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import {
  isAutoHeightEnabledForWidget,
  DefaultAutocompleteDefinitions,
  isAutoHeightEnabledForWidgetWithLimits,
} from "widgets/WidgetUtils";
import {
  BlueprintOperationTypes,
  type AnvilConfig,
  type AutocompletionDefinitions,
  type AutoLayoutConfig,
  type WidgetBaseConfiguration,
  type WidgetDefaultProps,
  type FlattenedWidgetProps,
} from "WidgetProvider/types";
import { WIDGET_TAGS } from "constants/WidgetConstants";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import { ButtonBoxShadowTypes } from "components/constants";
import { Colors } from "constants/Colors";
import { FILL_WIDGET_MIN_WIDTH } from "constants/minWidthConstants";
import { GridDefaults, WidgetHeightLimits } from "constants/WidgetConstants";
import {
  FlexVerticalAlignment,
  Positioning,
  ResponsiveBehavior,
} from "layoutSystems/common/utils/constants";
import { renderAppsmithCanvas } from "layoutSystems/CanvasFactory";
import { generateDefaultLayoutPreset } from "layoutSystems/anvil/layoutComponents/presets/DefaultLayoutPreset";
import type { CanvasWidgetsReduxState } from "ee/reducers/entityReducers/canvasWidgetsReducer";
import { LayoutSystemTypes } from "layoutSystems/types";
import type { LayoutProps } from "layoutSystems/anvil/utils/anvilTypes";
import { getWidgetBluePrintUpdates } from "utils/WidgetBlueprintUtils";
import i18n from "i18n";

const containerText = (path: string) =>
  i18n.t(`widgetProperty.container.${path}`);

export class ContainerWidget extends BaseWidget<
  ContainerWidgetProps<WidgetProps>,
  WidgetState
> {
  static type = "CONTAINER_WIDGET";

  constructor(props: ContainerWidgetProps<WidgetProps>) {
    super(props);
    this.renderChildWidget = this.renderChildWidget.bind(this);
  }

  static getConfig(): WidgetBaseConfiguration {
    return {
      name: "Container",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.LAYOUT],
      isCanvas: true,
      searchTags: ["div", "parent", "group"],
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

  static getDefaults(): WidgetDefaultProps {
    return {
      backgroundColor: "#FFFFFF",
      rows: WidgetHeightLimits.MIN_CANVAS_HEIGHT_IN_ROWS,
      columns: 24,
      widgetName: "Container",
      containerStyle: "card",
      borderColor: Colors.GREY_5,
      borderWidth: "1",
      boxShadow: ButtonBoxShadowTypes.NONE,
      animateLoading: true,
      children: [],
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
              if (layoutSystemType !== LayoutSystemTypes.ANVIL) {
                return [];
              }

              //get Canvas Widget
              const canvasWidget: FlattenedWidgetProps = get(
                widget,
                "children.0",
              );

              const layout: LayoutProps[] = generateDefaultLayoutPreset();

              return getWidgetBluePrintUpdates({
                [canvasWidget.widgetId]: {
                  layout,
                },
              });
            },
          },
        ],
      },
      version: 1,
      flexVerticalAlignment: FlexVerticalAlignment.Stretch,
      responsiveBehavior: ResponsiveBehavior.Fill,
      minWidth: FILL_WIDGET_MIN_WIDTH,
    };
  }

  static getAutoLayoutConfig(): AutoLayoutConfig {
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
      disableResizeHandles: (props: ContainerWidgetProps<WidgetProps>) => ({
        // Disables vertical resize handles for all container widgets except for the List item container
        vertical: !props.isListItemContainer,
      }),
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

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      "!doc":
        "Containers are used to group widgets together to form logical higher order widgets. Containers let you organize your page better and move all the widgets inside them together.",
      "!url": "https://docs.appsmith.com/widget-reference/container",
      backgroundColor: {
        "!type": "string",
        "!url": "https://docs.appsmith.com/widget-reference/container",
      },
      isVisible: DefaultAutocompleteDefinitions.isVisible,
    };
  }

  static getSetterConfig(): SetterConfig | null {
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
    return getContainerPropertyPaneContentConfig();
  }

  static getContainerPropertyPaneContentConfig() {
    return [
      {
        sectionName: containerText("content.general"),
        children: [
          {
            helpText: containerText("help.visible"),
            propertyName: "isVisible",
            label: containerText("content.visible"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            helpText: containerText("help.shouldScrollContents"),
            propertyName: "shouldScrollContents",
            label: containerText("content.shouldScrollContents"),
            controlType: "SWITCH",
            isBindProperty: false,
            isTriggerProperty: false,
          },
          {
            propertyName: "animateLoading",
            label: containerText("content.animateLoading"),
            controlType: "SWITCH",
            helpText: containerText("help.animateLoading"),
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
    return getContainerPropertyPaneStyleConfig();
  }

  static getContainerPropertyPaneStyleConfig() {
    return [
      {
        sectionName: containerText("style.color"),
        children: [
          {
            helpText: containerText("help.backgroundColor"),
            placeholderText: containerText("placeholder.backgroundColor"),
            propertyName: "backgroundColor",
            label: containerText("style.backgroundColor"),
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: containerText("help.borderColor"),
            placeholderText: containerText("placeholder.borderColor"),
            propertyName: "borderColor",
            label: containerText("style.borderColor"),
            controlType: "COLOR_PICKER",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: containerText("style.borderAndShadow"),
        children: [
          {
            helpText: containerText("help.borderWidth"),
            propertyName: "borderWidth",
            label: containerText("style.borderWidth"),
            placeholderText: containerText("placeholder.borderWidth"),
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.NUMBER },
            postUpdateAction: ReduxActionTypes.CHECK_CONTAINERS_FOR_AUTO_HEIGHT,
          },
          {
            propertyName: "borderRadius",
            label: containerText("style.borderRadius"),
            helpText: containerText("help.borderRadius"),
            controlType: "BORDER_RADIUS_OPTIONS",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "boxShadow",
            label: containerText("style.boxShadow"),
            helpText: containerText("help.boxShadow"),
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

  static getStylesheetConfig(): Stylesheet {
    return {
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
      boxShadow: "{{appsmith.theme.boxShadow.appBoxShadow}}",
    };
  }

  getSnapSpaces = () => {
    const { componentWidth } = this.props;
    const { snapGrid } = getSnappedGrid(this.props, componentWidth);

    return snapGrid;
  };

  renderChildWidget(childWidgetData: WidgetProps): React.ReactNode {
    const childWidget = { ...childWidgetData };

    const { componentHeight, componentWidth } = this.props;

    childWidget.rightColumn = componentWidth;
    childWidget.bottomRow = this.props.shouldScrollContents
      ? childWidget.bottomRow
      : componentHeight;
    childWidget.minHeight = componentHeight;
    childWidget.shouldScrollContents = false;
    childWidget.canExtend = this.props.shouldScrollContents;

    childWidget.parentId = this.props.widgetId;
    // Pass layout controls to children
    childWidget.positioning =
      childWidget?.positioning || this.props.positioning;
    childWidget.useAutoLayout = this.props.positioning
      ? this.props.positioning === Positioning.Vertical
      : false;

    return renderAppsmithCanvas(childWidget as WidgetProps);
  }

  renderChildren = () => {
    return map(
      // sort by row so stacking context is correct
      // TODO(abhinav): This is hacky. The stacking context should increase for widgets rendered top to bottom, always.
      // Figure out a way in which the stacking context is consistent.
      this.props.positioning !== Positioning.Fixed
        ? this.props.children
        : sortBy(compact(this.props.children), (child) => child.topRow),
      this.renderChildWidget,
    );
  };

  renderAsContainerComponent(props: ContainerWidgetProps<WidgetProps>) {
    const isAutoHeightEnabled: boolean =
      isAutoHeightEnabledForWidget(this.props) &&
      !isAutoHeightEnabledForWidgetWithLimits(this.props) &&
      this.props.positioning !== Positioning.Vertical;

    return (
      <ContainerComponent
        key={props.widgetId}
        {...props}
        noScroll={isAutoHeightEnabled}
      >
        <WidgetsMultiSelectBox
          {...this.getSnapSpaces()}
          noContainerOffset={!!props.noContainerOffset}
          widgetId={this.props.widgetId}
          widgetType={this.props.type}
        />
        {/* without the wrapping div onClick events are triggered twice */}
        <>{this.renderChildren()}</>
      </ContainerComponent>
    );
  }

  getWidgetView() {
    return this.renderAsContainerComponent(this.props);
  }
}

export interface ContainerWidgetProps<T extends WidgetProps>
  extends WidgetProps {
  children?: T[];
  containerStyle?: ContainerStyle;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onClickCapture?: MouseEventHandler<HTMLDivElement>;
  shouldScrollContents?: boolean;
  noPad?: boolean;
  positioning?: Positioning;
  forceFullOpacity?: boolean; // used to force full opacity for ui module instance meta widgets
}

export function getContainerPropertyPaneContentConfig() {
  return ContainerWidget.getContainerPropertyPaneContentConfig();
}

export function getContainerPropertyPaneStyleConfig() {
  return ContainerWidget.getContainerPropertyPaneStyleConfig();
}

export default ContainerWidget;
