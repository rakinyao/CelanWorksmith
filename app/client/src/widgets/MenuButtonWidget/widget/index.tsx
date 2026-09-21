import type { ExecuteTriggerPayload } from "constants/AppsmithActionConstants/ActionConstants";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import type { SetterConfig, Stylesheet } from "entities/AppTheming";
import { isArray, orderBy } from "lodash";
import { default as React } from "react";
import type { WidgetState } from "widgets/BaseWidget";
import BaseWidget from "widgets/BaseWidget";
import { MinimumPopupWidthInPercentage } from "WidgetProvider/constants";
import MenuButtonComponent from "../component";
import type { MenuButtonWidgetProps, MenuItem } from "../constants";
import { MenuItemsSource } from "../constants";
import contentConfig from "./propertyConfig/contentConfig";
import styleConfig from "./propertyConfig/styleConfig";
import { DefaultAutocompleteDefinitions } from "widgets/WidgetUtils";
import type {
  AnvilConfig,
  AutocompletionDefinitions,
} from "WidgetProvider/types";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import { ButtonPlacementTypes, ButtonVariantTypes } from "components/constants";
import { WIDGET_TAGS, layoutConfigurations } from "constants/WidgetConstants";
/* eslint-disable @typescript-eslint/no-explicit-any */
import i18n from "i18n";

const menuButtonText = (path: string) =>
  i18n.t(`widgetProperty.menuButton.${path}`);
const menuButtonCopy: Record<string, string> = {
  Basic: "basic",
  Label: "label",
  "Menu items source": "menuItemsSource",
  "Menu items": "menuItems",
  "Source data": "sourceData",
  Configure: "configure",
  "Configure menu items": "configureMenuItems",
  General: "general",
  Visible: "visible",
  Disabled: "disabled",
  "Animate loading": "animateLoading",
  Compact: "compact",
  "Button variant": "buttonVariant",
  Icon: "icon",
  Position: "position",
  Placement: "placement",
  Color: "color",
  "Button color": "buttonColor",
  "Border and shadow": "borderAndShadow",
  "Border radius": "borderRadius",
  "Box shadow": "boxShadow",
  Static: "static",
  Dynamic: "dynamic",
  Primary: "primary",
  Secondary: "secondary",
  Tertiary: "tertiary",
  Start: "start",
  Between: "between",
  Center: "center",
  "Sets the label of a menu": "help.label",
  "Sets the source for the menu items": "help.menuItemsSource",
  "Takes in an array of items to display the menu items.": "help.sourceData",
  "Configure how each menu item will appear.": "help.configure",
  "Controls the visibility of the widget": "help.visible",
  "Disables input to the widget": "help.disabled",
  "Controls the loading of the widget": "help.animateLoading",
  "Decides if menu items will consume lesser space": "help.compact",
  "Sets the variant of the menu button": "help.buttonVariant",
  "Sets the icon to be used for the menu button": "help.icon",
  "Sets the icon alignment of the menu button": "help.position",
  "Sets the space between items": "help.placement",
  "Sets the style of the Menu button": "help.buttonColor",
  "Rounds the corners of the icon button's outer border edge":
    "help.borderRadius",
  "Enables you to cast a drop shadow from the frame of the widget":
    "help.boxShadow",
  Open: "placeholder.open",
  "{{Query1.data}}": "placeholder.sourceData",
};
const localizeMenuButton = (sections: any[]): any[] =>
  sections.map((section) => ({
    ...section,
    sectionName: menuButtonCopy[section.sectionName]
      ? menuButtonText(menuButtonCopy[section.sectionName])
      : section.sectionName,
    children: section.children?.map((property: any) => ({
      ...property,
      label: menuButtonCopy[property.label]
        ? menuButtonText(menuButtonCopy[property.label])
        : property.label,
      helpText: menuButtonCopy[property.helpText]
        ? menuButtonText(menuButtonCopy[property.helpText])
        : property.helpText,
      placeholderText: menuButtonCopy[property.placeholderText]
        ? menuButtonText(menuButtonCopy[property.placeholderText])
        : property.placeholderText,
      buttonConfig: property.buttonConfig
        ? {
            ...property.buttonConfig,
            label: menuButtonCopy[property.buttonConfig.label]
              ? menuButtonText(menuButtonCopy[property.buttonConfig.label])
              : property.buttonConfig.label,
          }
        : property.buttonConfig,
      options: Array.isArray(property.options)
        ? property.options.map((option: any) => ({
            ...option,
            label: menuButtonCopy[option.label]
              ? menuButtonText(menuButtonCopy[option.label])
              : option.label,
          }))
        : property.options,
      panelConfig: Array.isArray(property.panelConfig)
        ? localizeMenuButton(property.panelConfig)
        : property.panelConfig,
    })),
  }));

class MenuButtonWidget extends BaseWidget<MenuButtonWidgetProps, WidgetState> {
  static type = "MENU_BUTTON_WIDGET";

  static getConfig() {
    return {
      name: "Menu button",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      needsMeta: true,
      tags: [WIDGET_TAGS.BUTTONS],
    };
  }

  static getDefaults() {
    return {
      label: "Open Menu",
      menuVariant: ButtonVariantTypes.PRIMARY,
      placement: ButtonPlacementTypes.CENTER,
      isCompact: false,
      isDisabled: false,
      isVisible: true,
      animateLoading: true,
      menuItemsSource: MenuItemsSource.STATIC,
      menuItems: {
        menuItem1: {
          label: "First Menu Item",
          id: "menuItem1",
          widgetId: "",
          isVisible: true,
          isDisabled: false,
          index: 0,
        },
        menuItem2: {
          label: "Second Menu Item",
          id: "menuItem2",
          widgetId: "",
          isVisible: true,
          isDisabled: false,
          index: 1,
        },
        menuItem3: {
          label: "Third Menu Item",
          id: "menuItem3",
          widgetId: "",
          isVisible: true,
          isDisabled: false,
          index: 2,
        },
      },
      rows: 4,
      columns: 16,
      widgetName: "MenuButton",
      version: 1,
    };
  }

  static getAutoLayoutConfig() {
    return {
      defaults: {
        rows: 4,
        columns: 6.632,
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
        vertical: true,
        horizontal: true,
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

  static getPropertyPaneContentConfig() {
    return localizeMenuButton(contentConfig);
  }

  static getPropertyPaneStyleConfig() {
    return localizeMenuButton(styleConfig);
  }

  static getStylesheetConfig(): Stylesheet {
    return {
      menuColor: "{{appsmith.theme.colors.primaryColor}}",
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
      boxShadow: "none",
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {
      "!doc":
        "Menu button widget is used to represent a set of actions in a group.",
      "!url": "https://docs.appsmith.com/widget-reference/menu-button",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      label: "string",
    };
  }

  menuItemClickHandler = (onClick: string | undefined, index: number) => {
    if (onClick) {
      const config: ExecuteTriggerPayload = {
        triggerPropertyName: "onClick",
        dynamicString: onClick,
        event: {
          type: EventType.ON_CLICK,
        },
      };

      if (this.props.menuItemsSource === MenuItemsSource.DYNAMIC) {
        config.globalContext = {
          currentItem: this.props.sourceData
            ? this.props.sourceData[index]
            : {},
          currentIndex: index,
        };
      }

      super.executeAction(config);
    }
  };

  getVisibleItems = () => {
    const { configureMenuItems, menuItems, menuItemsSource, sourceData } =
      this.props;

    if (menuItemsSource === MenuItemsSource.STATIC) {
      const visibleItems = Object.keys(menuItems)
        .map((itemKey) => menuItems[itemKey])
        .filter((item) => item.isVisible === true);

      return orderBy(visibleItems, ["index"], ["asc"]);
    } else if (
      menuItemsSource === MenuItemsSource.DYNAMIC &&
      isArray(sourceData) &&
      sourceData?.length &&
      configureMenuItems?.config
    ) {
      const { config } = configureMenuItems;
      const getValue = (propertyName: keyof MenuItem, index: number) => {
        const value = config[propertyName];

        if (isArray(value)) {
          return value[index];
        }

        return value ?? null;
      };

      const visibleItems = sourceData
        .map((item, index) => ({
          ...item,
          id: index.toString(),
          isVisible: getValue("isVisible", index),
          isDisabled: getValue("isDisabled", index),
          index: index,
          widgetId: "",
          label: getValue("label", index),
          onClick: config?.onClick,
          textColor: getValue("textColor", index),
          backgroundColor: getValue("backgroundColor", index),
          iconAlign: getValue("iconAlign", index),
          iconColor: getValue("iconColor", index),
          iconName: getValue("iconName", index),
        }))
        .filter((item) => item.isVisible === true);

      return visibleItems;
    }

    return [];
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
      },
    };
  }

  getWidgetView() {
    const { componentWidth } = this.props;
    const menuDropDownWidth =
      (MinimumPopupWidthInPercentage / 100) *
      (this.props.mainCanvasWidth ?? layoutConfigurations.MOBILE.maxWidth);

    return (
      <MenuButtonComponent
        {...this.props}
        getVisibleItems={this.getVisibleItems}
        maxWidth={this.props.maxWidth}
        menuDropDownWidth={menuDropDownWidth}
        minHeight={this.props.minHeight}
        minWidth={this.props.minWidth}
        onItemClicked={this.menuItemClickHandler}
        renderMode={this.props.renderMode}
        shouldFitContent={this.isAutoLayoutMode}
        width={componentWidth}
      />
    );
  }

  static getWidgetType() {
    return;
  }
}

export default MenuButtonWidget;
