import { RenderModes } from "constants/WidgetConstants";
import * as React from "react";
import type { WidgetProps, WidgetState } from "widgets/BaseWidget";
import BaseWidget from "widgets/BaseWidget";
import ImageComponent from "../component";

import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import { ValidationTypes } from "constants/WidgetValidation";
import type { SetterConfig, Stylesheet } from "entities/AppTheming";
import type { DerivedPropertiesMap } from "WidgetProvider/factory/types";
import { DefaultAutocompleteDefinitions } from "widgets/WidgetUtils";
import type {
  AnvilConfig,
  AutocompletionDefinitions,
} from "WidgetProvider/types";
import { ASSETS_CDN_URL } from "constants/ThirdPartyConstants";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import { getAssetUrl } from "ee/utils/airgapHelpers";
import { WIDGET_TAGS } from "constants/WidgetConstants";
import { FlexVerticalAlignment } from "layoutSystems/common/utils/constants";
import i18n from "i18n";

const imageText = (path: string) => i18n.t(`widgetProperty.image.${path}`);

class ImageWidget extends BaseWidget<ImageWidgetProps, WidgetState> {
  constructor(props: ImageWidgetProps) {
    super(props);
    this.onImageClick = this.onImageClick.bind(this);
  }

  static type = "IMAGE_WIDGET";

  static getConfig() {
    return {
      name: "Image",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.MEDIA],
    };
  }

  static getDefaults() {
    return {
      defaultImage: getAssetUrl(`${ASSETS_CDN_URL}/widgets/default.png`),
      imageShape: "RECTANGLE",
      maxZoomLevel: 1,
      enableRotation: false,
      enableDownload: false,
      objectFit: "cover",
      image: "",
      rows: 12,
      columns: 12,
      widgetName: "Image",
      version: 1,
      animateLoading: true,
      flexVerticalAlignment: FlexVerticalAlignment.Top,
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
      "!doc":
        "Image widget is used to display images in your app. Images must be either a URL or a valid base64.",
      "!url": "https://docs.appsmith.com/widget-reference/image",
      image: "string",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
    };
  }

  static getSetterConfig(): SetterConfig {
    return {
      __setters: {
        setVisibility: {
          path: "isVisible",
          type: "boolean",
        },
        setImage: {
          path: "image",
          type: "string",
        },
      },
    };
  }

  static getPropertyPaneContentConfig() {
    return getImagePropertyPaneContentConfig();
  }

  static getImagePropertyPaneContentConfig() {
    return [
      {
        sectionName: imageText("content.data"),
        children: [
          {
            helpText: imageText("help.image"),
            propertyName: "image",
            label: imageText("content.image"),
            controlType: "INPUT_TEXT",
            placeholderText: imageText("placeholder.image"),
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.IMAGE_URL },
          },
          {
            helpText: imageText("help.defaultImage"),
            propertyName: "defaultImage",
            label: imageText("content.defaultImage"),
            controlType: "INPUT_TEXT",
            placeholderText: imageText("placeholder.defaultImage"),
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.IMAGE_URL },
          },
        ],
      },
      {
        sectionName: imageText("content.general"),
        children: [
          {
            helpText: imageText("help.objectFit"),
            propertyName: "objectFit",
            label: imageText("content.objectFit"),
            controlType: "DROP_DOWN",
            defaultValue: "contain",
            options: [
              {
                label: imageText("option.contain"),
                value: "contain",
              },
              {
                label: imageText("option.cover"),
                value: "cover",
              },
              {
                label: imageText("option.auto"),
                value: "auto",
              },
            ],
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                allowedValues: ["contain", "cover", "auto"],
              },
            },
          },
          {
            helpText: imageText("help.maxZoomLevel"),
            propertyName: "maxZoomLevel",
            label: imageText("content.maxZoomLevel"),
            controlType: "DROP_DOWN",
            options: [
              {
                label: imageText("option.oneXNoZoom"),
                value: 1,
              },
              {
                label: imageText("option.twoX"),
                value: 2,
              },
              {
                label: imageText("option.fourX"),
                value: 4,
              },
              {
                label: imageText("option.eightX"),
                value: 8,
              },
              {
                label: imageText("option.sixteenX"),
                value: 16,
              },
            ],
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.NUMBER,
              params: { allowedValues: [1, 2, 4, 8, 16] },
            },
          },
          {
            helpText: imageText("help.visible"),
            propertyName: "isVisible",
            label: imageText("content.visible"),
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "animateLoading",
            label: imageText("content.animateLoading"),
            controlType: "SWITCH",
            helpText: imageText("help.animateLoading"),
            defaultValue: true,
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            helpText: imageText("help.enableRotation"),
            propertyName: "enableRotation",
            label: imageText("content.enableRotation"),
            controlType: "SWITCH",
            isJSConvertible: false,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            helpText: imageText("help.enableDownload"),
            propertyName: "enableDownload",
            label: imageText("content.enableDownload"),
            controlType: "SWITCH",
            isJSConvertible: false,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
        ],
      },
      {
        sectionName: imageText("content.events"),
        children: [
          {
            helpText: imageText("help.onClick"),
            propertyName: "onClick",
            label: "onClick",
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
    return getImagePropertyPaneStyleConfig();
  }

  static getImagePropertyPaneStyleConfig() {
    return [
      {
        sectionName: imageText("style.borderAndShadow"),
        children: [
          {
            propertyName: "borderRadius",
            label: imageText("style.borderRadius"),
            helpText: imageText("help.borderRadius"),
            controlType: "BORDER_RADIUS_OPTIONS",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "boxShadow",
            label: imageText("style.boxShadow"),
            helpText: imageText("help.boxShadow"),
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
  // TODO Find a way to enforce this, (dont let it be set)
  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMetaPropertiesMap(): Record<string, any> {
    return {};
  }

  static getStylesheetConfig(): Stylesheet {
    return {
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
      boxShadow: "none",
    };
  }

  getWidgetView() {
    const { maxZoomLevel, objectFit } = this.props;

    return (
      <ImageComponent
        borderRadius={this.props.borderRadius}
        boxShadow={this.props.boxShadow}
        defaultImageUrl={this.props.defaultImage}
        disableDrag={(disable: boolean) => {
          this.disableDrag(disable);
        }}
        enableDownload={this.props.enableDownload}
        enableRotation={this.props.enableRotation}
        imageUrl={this.props.image}
        isLoading={this.props.isLoading}
        maxZoomLevel={maxZoomLevel}
        objectFit={objectFit}
        onClick={this.props.onClick ? this.onImageClick : undefined}
        showHoverPointer={this.props.renderMode === RenderModes.PAGE}
        widgetId={this.props.widgetId}
      />
    );
  }

  onImageClick() {
    if (this.props.onClick) {
      super.executeAction({
        triggerPropertyName: "onClick",
        dynamicString: this.props.onClick,
        event: {
          type: EventType.ON_CLICK,
        },
      });
    }
  }
}

export type ImageShape = "RECTANGLE" | "CIRCLE" | "ROUNDED";

export interface ImageWidgetProps extends WidgetProps {
  image: string;
  imageShape: ImageShape;
  defaultImage: string;
  maxZoomLevel: number;
  imageRotation?: number;
  enableDownload?: boolean;
  enableRotation?: boolean;
  objectFit: string;
  onClick?: string;
  borderRadius: string;
  boxShadow?: string;
}

export function getImagePropertyPaneContentConfig() {
  return ImageWidget.getImagePropertyPaneContentConfig();
}

export function getImagePropertyPaneStyleConfig() {
  return ImageWidget.getImagePropertyPaneStyleConfig();
}

export default ImageWidget;
