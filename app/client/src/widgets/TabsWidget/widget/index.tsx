import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import {
  FlexVerticalAlignment,
  LayoutDirection,
  Positioning,
} from "layoutSystems/common/utils/constants";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import { WIDGET_PADDING } from "constants/WidgetConstants";
import type { ValidationResponse } from "constants/WidgetValidation";
import { ValidationTypes } from "constants/WidgetValidation";
import { find } from "lodash";
import React from "react";
import { LayoutSystemTypes } from "layoutSystems/types";
import type { WidgetProperties } from "selectors/propertyPaneSelectors";
import { AutocompleteDataType } from "utils/autocomplete/AutocompleteDataType";
import type { WidgetState } from "../../BaseWidget";
import BaseWidget from "../../BaseWidget";
import TabsComponent from "../component";
import type { TabContainerWidgetProps, TabsWidgetProps } from "../constants";
import derivedProperties from "./parseDerivedProperties";
import type { SetterConfig, Stylesheet } from "entities/AppTheming";
import {
  isAutoHeightEnabledForWidget,
  isAutoHeightEnabledForWidgetWithLimits,
  DefaultAutocompleteDefinitions,
} from "widgets/WidgetUtils";
import type {
  AnvilConfig,
  AutocompletionDefinitions,
} from "WidgetProvider/types";
import { ResponsiveBehavior } from "layoutSystems/common/utils/constants";
import { Colors } from "constants/Colors";
import { FILL_WIDGET_MIN_WIDTH } from "constants/minWidthConstants";
import {
  GridDefaults,
  WIDGET_TAGS,
  WidgetHeightLimits,
} from "constants/WidgetConstants";
import type { WidgetProps } from "widgets/BaseWidget";
import { BlueprintOperationTypes } from "WidgetProvider/types";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import { renderAppsmithCanvas } from "layoutSystems/CanvasFactory";
import i18n from "i18n";

const tabsText = (path: string) => i18n.t(`widgetProperty.tabs.${path}`);

export function selectedTabValidation(
  value: unknown,
  props: TabContainerWidgetProps,
): ValidationResponse {
  const tabs: Array<{
    label: string;
    id: string;
  }> = props.tabsObj ? Object.values(props.tabsObj) : props.tabs || [];
  const tabNames = tabs.map((i: { label: string; id: string }) => i.label);

  return {
    isValid: value === "" ? true : tabNames.includes(value as string),
    parsed: value,
    messages: [
      {
        name: "ValidationError",
        message: `Tab name ${value} does not exist`,
      },
    ],
  };
}
class TabsWidget extends BaseWidget<
  TabsWidgetProps<TabContainerWidgetProps>,
  WidgetState
> {
  static type = "TABS_WIDGET";

  static getConfig() {
    return {
      name: "Tabs",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.LAYOUT],
      needsMeta: true,
      isCanvas: true,
    };
  }

  static getFeatures() {
    return {
      dynamicHeight: {
        sectionIndex: 1,
        active: true,
      },
    };
  }

  static getDefaults() {
    return {
      flexVerticalAlignment: FlexVerticalAlignment.Stretch,
      responsiveBehavior: ResponsiveBehavior.Fill,
      minWidth: FILL_WIDGET_MIN_WIDTH,
      rows: WidgetHeightLimits.MIN_CANVAS_HEIGHT_IN_ROWS + 5,
      columns: 24,
      shouldScrollContents: false,
      widgetName: "Tabs",
      animateLoading: true,
      borderWidth: 1,
      borderColor: Colors.GREY_5,
      backgroundColor: Colors.WHITE,
      minDynamicHeight: WidgetHeightLimits.MIN_CANVAS_HEIGHT_IN_ROWS + 5,
      tabsObj: {
        tab1: {
          label: "Tab 1",
          id: "tab1",
          widgetId: "",
          isVisible: true,
          index: 0,
          positioning: Positioning.Vertical,
        },
        tab2: {
          label: "Tab 2",
          id: "tab2",
          widgetId: "",
          isVisible: true,
          index: 1,
          positioning: Positioning.Vertical,
        },
      },
      shouldShowTabs: true,
      defaultTab: "Tab 1",
      blueprint: {
        view: [
          {
            type: "CANVAS_WIDGET",
            position: { left: 0, top: 0 },
            props: {
              detachFromLayout: true,
              canExtend: true,
              isVisible: true,
              isDisabled: false,
              shouldScrollContents: false,
              tabId: "tab1",
              tabName: "Tab 1",
              children: [],
              version: 1,
              bottomRow: WidgetHeightLimits.MIN_CANVAS_HEIGHT_IN_ROWS,
            },
          },
          {
            type: "CANVAS_WIDGET",
            position: { left: 0, top: 0 },
            props: {
              detachFromLayout: true,
              canExtend: true,
              isVisible: true,
              isDisabled: false,
              shouldScrollContents: false,
              tabId: "tab2",
              tabName: "Tab 2",
              children: [],
              version: 1,
              bottomRow: WidgetHeightLimits.MIN_CANVAS_HEIGHT_IN_ROWS,
            },
          },
        ],
        operations: [
          {
            type: BlueprintOperationTypes.MODIFY_PROPS,
            fn: (widget: WidgetProps & { children?: WidgetProps[] }) => {
              const tabs = Object.values({ ...widget.tabsObj });
              const tabIds: Record<string, string> = (
                widget.children || []
              ).reduce((idsObj, eachChild) => {
                idsObj = { ...idsObj, [eachChild.tabId]: eachChild.widgetId };

                return idsObj;
              }, {});
              // TODO: Fix this the next time the file is edited
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const tabsObj = tabs.reduce((obj: any, tab: any) => {
                const newTab = { ...tab };

                newTab.widgetId = tabIds[newTab.id];
                obj[newTab.id] = newTab;

                return obj;
              }, {});
              const updatePropertyMap = [
                {
                  widgetId: widget.widgetId,
                  propertyName: "tabsObj",
                  propertyValue: tabsObj,
                },
              ];

              return updatePropertyMap;
            },
          },
        ],
      },
      version: 3,
    };
  }

  static getMethods() {
    return {
      getCanvasHeightOffset: (props: WidgetProps): number => {
        let offset =
          props.borderWidth && props.borderWidth > 1
            ? Math.ceil(
                (2 * parseInt(props.borderWidth, 10) || 0) /
                  GridDefaults.DEFAULT_GRID_ROW_HEIGHT,
              )
            : 0;

        if (props.shouldShowTabs === true) {
          offset += 4;
        }

        return offset;
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
              minHeight: "300px",
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
        minHeight: { base: "300px" },
        minWidth: { base: "280px" },
      },
    };
  }

  static getDependencyMap(): Record<string, string[]> {
    return {
      defaultTab: ["tabsObj", "tabs"],
    };
  }

  static getPropertyPaneContentConfig() {
    return getTabsPropertyPaneContentConfig();
  }

  static getTabsPropertyPaneContentConfig() {
    return [
      {
        sectionName: tabsText("content.data"),
        children: [
          {
            propertyName: "tabsObj",
            isJSConvertible: false,
            label: tabsText("content.tabs"),
            helpText: tabsText("help.tabs"),
            controlType: "TABS_INPUT",
            isBindProperty: false,
            isTriggerProperty: false,
            updateRelatedWidgetProperties: (
              propertyPath: string,
              propertyValue: string,
              props: WidgetProperties,
            ) => {
              const propertyPathSplit = propertyPath.split(".");
              const property = propertyPathSplit.pop();

              if (property === "label") {
                const itemId = propertyPathSplit.pop() || "";
                const item = props.tabsObj[itemId];

                if (item) {
                  return [
                    {
                      widgetId: item.widgetId,
                      updates: {
                        modify: {
                          tabName: propertyValue,
                        },
                      },
                    },
                  ];
                }
              }

              return [];
            },
            panelConfig: {
              editableTitle: true,
              titlePropertyName: "label",
              panelIdPropertyName: "id",
              updateHook: (
                // TODO: Fix this the next time the file is edited
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                props: any,
                propertyPath: string,
                propertyValue: string,
              ) => {
                return [
                  {
                    propertyPath,
                    propertyValue,
                  },
                ];
              },
              children: [
                {
                  sectionName: tabsText("content.general"),
                  children: [
                    {
                      propertyName: "isVisible",
                      label: tabsText("content.visible"),
                      helpText: tabsText("help.tabVisible"),
                      controlType: "SWITCH",
                      useValidationMessage: true,
                      isJSConvertible: true,
                      isBindProperty: true,
                      isTriggerProperty: false,
                      validation: { type: ValidationTypes.BOOLEAN },
                    },
                  ],
                },
              ],
            },
          },
          {
            propertyName: "defaultTab",
            helpText: tabsText("help.defaultTab"),
            placeholderText: tabsText("placeholder.defaultTab"),
            label: tabsText("content.defaultTab"),
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                fn: selectedTabValidation,
                expected: {
                  type: "Tab Name (string)",
                  example: "Tab 1",
                  autocompleteDataType: AutocompleteDataType.STRING,
                },
              },
            },
            dependencies: ["tabsObj", "tabs"],
          },
        ],
      },
      {
        sectionName: tabsText("content.general"),
        children: [
          {
            propertyName: "isVisible",
            label: tabsText("content.visible"),
            helpText: tabsText("help.visible"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            helpText: tabsText("help.shouldScrollContents"),
            propertyName: "shouldScrollContents",
            label: tabsText("content.shouldScrollContents"),
            controlType: "SWITCH",
            isBindProperty: false,
            isTriggerProperty: false,
          },
          {
            propertyName: "animateLoading",
            label: tabsText("content.animateLoading"),
            controlType: "SWITCH",
            helpText: tabsText("help.animateLoading"),
            defaultValue: true,
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "shouldShowTabs",
            helpText: tabsText("help.shouldShowTabs"),
            label: tabsText("content.showTabs"),
            controlType: "SWITCH",
            isBindProperty: false,
            isTriggerProperty: false,
            postUpdateAction: ReduxActionTypes.CHECK_CONTAINERS_FOR_AUTO_HEIGHT,
          },
        ],
      },
      {
        sectionName: tabsText("content.events"),
        children: [
          {
            helpText: tabsText("help.onTabSelected"),
            propertyName: "onTabSelected",
            label: "onTabSelected",
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
    return getTabsPropertyPaneStyleConfig();
  }

  static getTabsPropertyPaneStyleConfig() {
    return [
      {
        sectionName: tabsText("style.colorsBordersAndShadows"),
        children: [
          {
            propertyName: "accentColor",
            helpText: tabsText("help.accentColor"),
            label: tabsText("style.accentColor"),
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: tabsText("help.color"),
            placeholderText: tabsText("placeholder.color"),
            propertyName: "backgroundColor",
            label: tabsText("style.backgroundColor"),
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: tabsText("help.color"),
            placeholderText: tabsText("placeholder.color"),
            propertyName: "borderColor",
            label: tabsText("style.borderColor"),
            controlType: "COLOR_PICKER",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: tabsText("help.borderWidth"),
            propertyName: "borderWidth",
            label: tabsText("style.borderWidth"),
            placeholderText: tabsText("placeholder.borderWidth"),
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.NUMBER },
            postUpdateAction: ReduxActionTypes.CHECK_CONTAINERS_FOR_AUTO_HEIGHT,
          },
          {
            propertyName: "borderRadius",
            label: tabsText("style.borderRadius"),
            helpText: tabsText("help.borderRadius"),
            controlType: "BORDER_RADIUS_OPTIONS",

            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "boxShadow",
            label: tabsText("style.boxShadow"),
            helpText: tabsText("help.boxShadow"),
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

  callDynamicHeightUpdates = () => {
    const { checkContainersForAutoHeight } = this.context;

    checkContainersForAutoHeight && checkContainersForAutoHeight();
  };

  callPositionUpdates = (tabWidgetId: string) => {
    const { updatePositionsOnTabChange } = this.context;

    updatePositionsOnTabChange &&
      updatePositionsOnTabChange(this.props.widgetId, tabWidgetId);
  };

  onTabChange = (tabWidgetId: string) => {
    this.props.updateWidgetMetaProperty("selectedTabWidgetId", tabWidgetId, {
      triggerPropertyName: "onTabSelected",
      dynamicString: this.props.onTabSelected,
      event: {
        type: EventType.ON_TAB_CHANGE,
      },
    });
    setTimeout(this.callDynamicHeightUpdates, 0);
    setTimeout(() => this.callPositionUpdates(tabWidgetId), 0);
  };

  static getStylesheetConfig(): Stylesheet {
    return {
      accentColor: "{{appsmith.theme.colors.primaryColor}}",
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
      boxShadow: "{{appsmith.theme.boxShadow.appBoxShadow}}",
    };
  }

  static getDerivedPropertiesMap() {
    return {
      selectedTab: `{{(()=>{${derivedProperties.getSelectedTab}})()}}`,
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      selectedTab: "string",
    };
  }

  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMetaPropertiesMap(): Record<string, any> {
    return {
      selectedTabWidgetId: undefined,
    };
  }

  static getDefaultPropertiesMap(): Record<string, string> {
    return {};
  }

  getWidgetView() {
    const { componentWidth } = this.props;
    const tabsComponentProps = {
      ...this.props,
      tabs: this.getVisibleTabs(),
      width: componentWidth - WIDGET_PADDING * 2,
    };
    const isAutoHeightEnabled: boolean =
      isAutoHeightEnabledForWidget(this.props) &&
      !isAutoHeightEnabledForWidgetWithLimits(this.props);

    return (
      <TabsComponent
        {...tabsComponentProps}
        $noScroll={isAutoHeightEnabled}
        backgroundColor={this.props.backgroundColor}
        borderColor={this.props.borderColor}
        borderRadius={this.props.borderRadius}
        borderWidth={this.props.borderWidth}
        boxShadow={this.props.boxShadow}
        onTabChange={this.onTabChange}
        primaryColor={this.props.primaryColor}
        selectedTabWidgetId={this.getSelectedTabWidgetId()}
        shouldScrollContents={
          this.props.shouldScrollContents &&
          this.props.layoutSystemType === LayoutSystemTypes.FIXED
        }
      >
        {this.renderComponent()}
      </TabsComponent>
    );
  }

  renderComponent = () => {
    const selectedTabWidgetId = this.getSelectedTabWidgetId();
    const childWidgetData = {
      ...this.props.children?.filter(Boolean).filter((item) => {
        return selectedTabWidgetId === item.widgetId;
      })[0],
    };

    if (!childWidgetData) {
      return null;
    }

    childWidgetData.canExtend = this.props.shouldScrollContents;
    const { componentHeight, componentWidth } = this.props;

    childWidgetData.rightColumn = componentWidth;
    childWidgetData.isVisible = this.props.isVisible;
    childWidgetData.bottomRow = this.props.shouldScrollContents
      ? childWidgetData.bottomRow
      : componentHeight - 1;
    childWidgetData.parentId = this.props.widgetId;
    childWidgetData.minHeight = componentHeight;
    const selectedTabProps = Object.values(this.props.tabsObj)?.filter(
      (item) => item.widgetId === selectedTabWidgetId,
    )[0];
    const positioning: Positioning =
      this.props.layoutSystemType == LayoutSystemTypes.AUTO
        ? Positioning.Vertical
        : Positioning.Fixed;

    childWidgetData.positioning = positioning;
    childWidgetData.useAutoLayout = positioning !== Positioning.Fixed;
    childWidgetData.direction =
      positioning === Positioning.Vertical
        ? LayoutDirection.Vertical
        : LayoutDirection.Horizontal;
    childWidgetData.alignment = selectedTabProps?.alignment;
    childWidgetData.spacing = selectedTabProps?.spacing;

    return renderAppsmithCanvas(childWidgetData as WidgetProps);
  };

  private getSelectedTabWidgetId() {
    let selectedTabWidgetId = this.props.selectedTabWidgetId;

    if (this.props.children) {
      selectedTabWidgetId =
        this.props.children.find((tab) =>
          this.props.selectedWidgetAncestry?.includes(tab.widgetId),
        )?.widgetId ?? this.props.selectedTabWidgetId;
    }

    return selectedTabWidgetId;
  }

  componentDidUpdate(prevProps: TabsWidgetProps<TabContainerWidgetProps>) {
    const visibleTabs = this.getVisibleTabs();
    const selectedTab = find(visibleTabs, {
      widgetId: this.props.selectedTabWidgetId,
    });

    if (this.props.defaultTab !== prevProps.defaultTab || !selectedTab) {
      this.setDefaultSelectedTabWidgetId();
    }
  }

  getVisibleTabs = () => {
    const tabs = Object.values(this.props.tabsObj || {});

    if (tabs.length) {
      return tabs
        .filter(
          (tab) => tab.isVisible === undefined || !!tab.isVisible === true,
        )
        .sort((tab1, tab2) => tab1.index - tab2.index);
    }

    return [];
  };

  setDefaultSelectedTabWidgetId = () => {
    const visibleTabs = this.getVisibleTabs();
    // Find the default Tab object
    const defaultTab = find(visibleTabs, {
      label: this.props.defaultTab,
    });
    // Find the default Tab id
    const defaultTabWidgetId =
      defaultTab?.widgetId ?? visibleTabs?.[0]?.widgetId; // in case the default tab is deleted

    // If we have a legitimate default tab Id and it is not already the selected Tab
    if (
      defaultTabWidgetId &&
      defaultTabWidgetId !== this.props.selectedTabWidgetId
    ) {
      // Select the default tab
      this.props.updateWidgetMetaProperty(
        "selectedTabWidgetId",
        defaultTabWidgetId,
      );
      setTimeout(this.callDynamicHeightUpdates, 0);
    }
  };

  componentDidMount() {
    Object.keys(this.props.tabsObj || {}).length &&
      this.setDefaultSelectedTabWidgetId();
  }
}

export function getTabsPropertyPaneContentConfig() {
  return TabsWidget.getTabsPropertyPaneContentConfig();
}

export function getTabsPropertyPaneStyleConfig() {
  return TabsWidget.getTabsPropertyPaneStyleConfig();
}

export default TabsWidget;
