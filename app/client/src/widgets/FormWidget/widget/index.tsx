import React from "react";
import _, { get, some } from "lodash";
import equal from "fast-deep-equal/es6";
import type { WidgetProps } from "../../BaseWidget";
import type { ContainerWidgetProps } from "widgets/ContainerWidget/widget";
import { ContainerWidget } from "widgets/ContainerWidget/widget";
import type { ContainerComponentProps } from "widgets/ContainerWidget/component";
import {
  FlexLayerAlignment,
  FlexVerticalAlignment,
  Positioning,
  ResponsiveBehavior,
} from "layoutSystems/common/utils/constants";
import { DefaultAutocompleteDefinitions } from "widgets/WidgetUtils";
import type { ExtraDef } from "utils/autocomplete/defCreatorUtils";
import { generateTypeDef } from "utils/autocomplete/defCreatorUtils";
import type {
  AnvilConfig,
  AutocompletionDefinitions,
} from "WidgetProvider/types";
import type { SetterConfig } from "entities/AppTheming";
import { ButtonVariantTypes, RecaptchaTypes } from "components/constants";
import { Colors } from "constants/Colors";
import { FILL_WIDGET_MIN_WIDTH } from "constants/minWidthConstants";
import { GridDefaults, WIDGET_TAGS } from "constants/WidgetConstants";
import type { CanvasWidgetsReduxState } from "ee/reducers/entityReducers/canvasWidgetsReducer";
import { getWidgetBluePrintUpdates } from "utils/WidgetBlueprintUtils";
import { DynamicHeight } from "utils/WidgetFeatures";
import { BlueprintOperationTypes } from "WidgetProvider/types";
import type { FlattenedWidgetProps } from "WidgetProvider/types";
import IconSVG from "../icon.svg";
import ThumbnailSVG from "../thumbnail.svg";
import type { DerivedPropertiesMap } from "WidgetProvider/factory/types";
import type { FlexLayer } from "layoutSystems/autolayout/utils/types";
import type { LayoutProps } from "layoutSystems/anvil/utils/anvilTypes";
import { formPreset } from "layoutSystems/anvil/layoutComponents/presets/FormPreset";
import { LayoutSystemTypes } from "layoutSystems/types";
import { ValidationTypes } from "constants/WidgetValidation";
import {
  getObjectPropertyValue,
  normalizeObjectData,
} from "widgets/ObjectDetailWidget/widget/objectDetailUtils";
import { useDispatch, useSelector } from "react-redux";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import {
  syncUpdateWidgetMetaProperty,
  triggerEvalOnMetaUpdate,
} from "actions/metaActions";
import type { CelanworksmithProperty } from "api/CelanworksmithAPI";
import type { CanvasWidgetsReduxState } from "ee/reducers/entityReducers/canvasWidgetsReducer";
import { getWidgets } from "sagas/selectors";
import {
  isInputValueValid,
  type InputWidgetProps,
} from "widgets/InputWidget/widget";

export interface FormObjectBinding {
  instance: {
    id: string;
    typeId: string;
    properties: Record<string, unknown>;
  };
  objectTypeId: string;
}

const isDescendantOf = (
  widget: WidgetProps,
  ancestorId: string,
  widgets: CanvasWidgetsReduxState,
) => {
  let currentWidget = widget;

  while (currentWidget.parentId) {
    if (currentWidget.parentId === ancestorId) return true;

    const parentWidget = widgets[currentWidget.parentId];

    if (!parentWidget) return false;

    currentWidget = parentWidget;
  }

  return false;
};

export function ObjectFormMetadataPublisher(
  props: Pick<FormWidgetProps, "objectData" | "objectTypeId" | "widgetId">,
) {
  const dispatch = useDispatch();
  const objectsState = useSelector(getCelanworksmithObjectsState);
  const canvasWidgets = useSelector(getWidgets);
  const instance = normalizeObjectData(props.objectData);
  const objectTypeId = props.objectTypeId || instance?.typeId;
  const typeState = objectTypeId ? objectsState.types[objectTypeId] : undefined;
  const objectPropertiesMetadata = typeState?.metadata?.properties;
  const publishedMetadata = React.useRef<
    Map<string, CelanworksmithProperty | undefined>
  >(new Map());
  const objectInputs = Object.values(canvasWidgets).filter(
    (widget) =>
      widget.type === "INPUT_WIDGET" &&
      widget.dataMode === "OBJECT" &&
      isDescendantOf(widget, props.widgetId, canvasWidgets),
  );

  React.useEffect(() => {
    objectInputs.forEach((input) => {
      if (input.objectTypeId && input.objectTypeId !== objectTypeId) return;

      const metadata = objectPropertiesMetadata?.find(
        (property) => property.id === input.displayPropertyId,
      );

      if (publishedMetadata.current.get(input.widgetId) === metadata) return;

      dispatch(
        syncUpdateWidgetMetaProperty(
          input.widgetId,
          "objectPropertyMetadata",
          metadata,
        ),
      );
      dispatch(triggerEvalOnMetaUpdate());
      publishedMetadata.current.set(input.widgetId, metadata);
    });
  }, [dispatch, objectInputs, objectPropertiesMetadata, objectTypeId]);

  return null;
}

function ObjectFormMode(props: FormWidgetProps) {
  const objectsState = useSelector(getCelanworksmithObjectsState);
  const instance = normalizeObjectData(props.objectData);
  const objectTypeId = props.objectTypeId || instance?.typeId;
  const typeState = objectTypeId ? objectsState.types[objectTypeId] : undefined;

  return (
    <>
      <ObjectFormMetadataPublisher {...props} />
      <FormWidget
        {...props}
        objectMetadataError={typeState?.error || objectsState.error}
        objectMetadataResolved
        objectMetadataStatus={typeState?.status || objectsState.status}
        objectPropertiesMetadata={typeState?.metadata?.properties}
      />
    </>
  );
}

class FormWidget extends ContainerWidget {
  static type = "FORM_WIDGET";

  static getConfig() {
    return {
      name: "Form",
      iconSVG: IconSVG,
      thumbnailSVG: ThumbnailSVG,
      tags: [WIDGET_TAGS.LAYOUT],
      needsMeta: true,
      isCanvas: true,
      searchTags: ["group"],
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
            ? Math.round(
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
      rows: 40,
      columns: 24,
      borderColor: Colors.GREY_5,
      borderWidth: "1",
      animateLoading: true,
      formMode: "OBJECT",
      objectTypeId: undefined,
      objectData: undefined,
      objectActionId: undefined,
      widgetName: "Form",
      backgroundColor: Colors.WHITE,
      children: [],
      positioning: Positioning.Fixed,
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
                      cols: 24,
                    },
                    position: { top: 1, left: 1.5 },
                    props: {
                      text: "Form",
                      fontSize: "1.25rem",
                      version: 1,
                    },
                  },
                  {
                    type: "BUTTON_WIDGET",
                    size: {
                      rows: 4,
                      cols: 16,
                    },
                    position: {
                      top: 33,
                      left: 46,
                    },
                    props: {
                      text: "Submit",
                      buttonVariant: ButtonVariantTypes.PRIMARY,
                      disabledWhenInvalid: true,
                      resetFormOnClick: true,
                      recaptchaType: RecaptchaTypes.V3,
                      version: 1,
                    },
                  },
                  {
                    type: "BUTTON_WIDGET",
                    size: {
                      rows: 4,
                      cols: 16,
                    },
                    position: {
                      top: 33,
                      left: 30,
                    },
                    props: {
                      text: "Reset",
                      buttonVariant: ButtonVariantTypes.SECONDARY,
                      disabledWhenInvalid: false,
                      resetFormOnClick: true,
                      recaptchaType: RecaptchaTypes.V3,
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
            type: BlueprintOperationTypes.UPDATE_CREATE_PARAMS_BEFORE_ADD,
            fn: (
              widgets: { [widgetId: string]: FlattenedWidgetProps },
              widgetId: string,
              parentId: string,
              layoutSystemType: LayoutSystemTypes,
            ) => {
              if (layoutSystemType === LayoutSystemTypes.FIXED) return {};

              return { rows: 10 };
            },
          },
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
              const textWidget = children.filter(
                (child) => child.type === "TEXT_WIDGET",
              )?.[0];

              const [buttonWidget1, buttonWidget2] = children.filter(
                (child) => child.type === "BUTTON_WIDGET",
              );

              //Create flex layer object based on the children
              const flexLayers: FlexLayer[] = [
                {
                  children: [
                    {
                      id: textWidget.widgetId,
                      align: FlexLayerAlignment.Start,
                    },
                  ],
                },
                {
                  children: [
                    {
                      id: buttonWidget2.widgetId,
                      align: FlexLayerAlignment.End,
                    },
                    {
                      id: buttonWidget1.widgetId,
                      align: FlexLayerAlignment.End,
                    },
                  ],
                },
              ];

              const layout: LayoutProps[] = formPreset(
                textWidget.widgetId,
                buttonWidget1.widgetId,
                buttonWidget2.widgetId,
              );

              //create properties to be updated
              return getWidgetBluePrintUpdates({
                [widget.widgetId]: {
                  dynamicHeight: DynamicHeight.AUTO_HEIGHT,
                  bottomRow: widget.topRow + 10,
                  mobileBottomRow: (widget.mobileTopRow || widget.topRow) + 10,
                },
                [canvasWidget.widgetId]: {
                  flexLayers,
                  useAutoLayout: true,
                  positioning: Positioning.Vertical,
                  bottomRow: 100,
                  mobileBottomRow: 100,
                  layout,
                },
                [textWidget.widgetId]: {
                  responsiveBehavior: ResponsiveBehavior.Fill,
                  alignment: FlexLayerAlignment.Start,
                  topRow: 0,
                  bottomRow: 4,
                  leftColumn: 0,
                  rightColumn: GridDefaults.DEFAULT_GRID_COLUMNS,
                },
                [buttonWidget2.widgetId]: {
                  responsiveBehavior: ResponsiveBehavior.Hug,
                  alignment: FlexLayerAlignment.End,
                  topRow: 4,
                  bottomRow: 8,
                  leftColumn: GridDefaults.DEFAULT_GRID_COLUMNS - 2 * 16,
                  rightColumn: GridDefaults.DEFAULT_GRID_COLUMNS - 16,
                },
                [buttonWidget1.widgetId]: {
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
      responsiveBehavior: ResponsiveBehavior.Fill,
      minWidth: FILL_WIDGET_MIN_WIDTH,
      flexVerticalAlignment: FlexVerticalAlignment.Stretch,
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
              minHeight: "100px",
            };
          },
        },
      ],
      disableResizeHandles: {
        vertical: true,
      },
    };
  }

  static getPropertyPaneConfig() {
    return [
      {
        sectionName: "CelanWorksmith Object form",
        children: [
          {
            propertyName: "formMode",
            label: "Form mode",
            controlType: "DROP_DOWN",
            options: [
              { label: "Query", value: "QUERY" },
              { label: "Object", value: "OBJECT" },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "objectTypeId",
            label: "Ontology Object / 本体对象",
            controlType: "CELANWORKSMITH_OBJECT_TYPE",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["formMode"],
            hidden: (props: FormWidgetProps) => props.formMode !== "OBJECT",
          },
          {
            propertyName: "objectData",
            label: "Object data",
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.OBJECT },
            dependencies: ["formMode"],
            hidden: (props: FormWidgetProps) => props.formMode !== "OBJECT",
          },
          {
            propertyName: "objectActionId",
            label: "Submit Action",
            controlType: "INPUT_TEXT",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["formMode"],
            hidden: (props: FormWidgetProps) => props.formMode !== "OBJECT",
          },
        ],
      },
    ];
  }

  static getAnvilConfig(): AnvilConfig | null {
    return {
      isLargeWidget: false,
      widgetSize: {
        maxHeight: {},
        maxWidth: {},
        minHeight: { base: "100px" },
        minWidth: { base: "280px" },
      },
    };
  }

  checkInvalidChildren = (children: WidgetProps[]): boolean => {
    return some(children, (child) => {
      if ("children" in child) {
        return this.checkInvalidChildren(child.children || []);
      }

      if (
        child.type === "INPUT_WIDGET" &&
        child.dataMode === "OBJECT" &&
        child.objectPropertyMetadata
      ) {
        const objectProperty = getObjectPropertyValue(
          child.objectBinding?.instance || child.objectData,
          child.displayPropertyId,
        );
        const value =
          !child.isDirty && objectProperty?.state === "ready"
            ? objectProperty.value
            : child.text;

        return !isInputValueValid(value, child as InputWidgetProps);
      }

      if ("isValid" in child) {
        return !child.isValid;
      }

      return false;
    });
  };

  handleResetInputs = () => {
    super.resetChildrenMetaProperty(this.props.widgetId);
  };

  componentDidMount() {
    super.componentDidMount();
    this.updateFormData();
    this.updateObjectBinding();

    // Check if the form is dirty
    const hasChanges = this.checkFormValueChanges(this.getChildContainer());

    if (hasChanges !== this.props.hasChanges) {
      this.props.updateWidgetMetaProperty("hasChanges", hasChanges);
    }
  }

  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentDidUpdate(prevProps: ContainerWidgetProps<any>) {
    super.componentDidUpdate(prevProps);
    this.updateFormData();
    this.updateObjectBinding();
    // Check if the form is dirty
    const hasChanges = this.checkFormValueChanges(this.getChildContainer());

    if (hasChanges !== this.props.hasChanges) {
      this.props.updateWidgetMetaProperty("hasChanges", hasChanges);
    }
  }

  checkFormValueChanges(
    containerWidget: ContainerWidgetProps<WidgetProps>,
  ): boolean {
    const childWidgets = containerWidget.children || [];

    const hasChanges = childWidgets.some((child) => child.isDirty);

    if (!hasChanges) {
      return childWidgets.some(
        (child) =>
          child.children?.length &&
          this.checkFormValueChanges(get(child, "children[0]")),
      );
    }

    return hasChanges;
  }

  getChildContainer = () => {
    const { childWidgets = [] } = this.props;

    return { ...childWidgets[0] };
  };

  updateFormData() {
    const firstChild = this.getChildContainer();

    if (firstChild) {
      const formData = this.getFormData(firstChild);

      if (!equal(formData, this.props.data)) {
        this.props.updateWidgetMetaProperty("data", formData);
      }
    }
  }

  getObjectBinding(): FormObjectBinding | undefined {
    if (this.props.formMode !== "OBJECT") return undefined;

    const instance = normalizeObjectData(this.props.objectData);

    if (!instance) return undefined;

    return {
      instance,
      objectTypeId: this.props.objectTypeId || instance.typeId,
    };
  }

  updateObjectBinding() {
    const objectBinding = this.getObjectBinding();

    if (!equal(objectBinding, this.props.objectBinding)) {
      this.props.updateWidgetMetaProperty("objectBinding", objectBinding);
    }
  }

  getFormData(formWidget: ContainerWidgetProps<WidgetProps>) {
    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formData: any = {};

    if (formWidget.children)
      formWidget.children.forEach((widgetData) => {
        if (!_.isNil(widgetData.value)) {
          // In case of meta widget the widgetName may not be the original widgetName but something
          // like _moduleInstanceName$_widgetName to maintain uniqueness in the page's context for eval.
          // In this case we use the originalWidgetName may be present in the widgetData (if added by the creator of meta widget)
          // to get the correct widgetName
          const widgetName =
            widgetData.originalWidgetName || widgetData.widgetName;

          formData[widgetName] = widgetData.value;
        }
      });

    return formData;
  }

  renderChildWidget(): React.ReactNode {
    const childContainer = this.getChildContainer();

    const { componentHeight, componentWidth } = this.props;

    const objectBinding = this.getObjectBinding();

    if (childContainer.children) {
      const children = childContainer.children.map(
        (child: WidgetProps) => {
          const grandChild = { ...child };

          if (
            objectBinding &&
            grandChild.type === "INPUT_WIDGET" &&
            grandChild.dataMode === "OBJECT"
          ) {
            grandChild.objectData =
              grandChild.objectData === undefined
                ? objectBinding.instance
                : grandChild.objectData;
            grandChild.objectTypeId =
              grandChild.objectTypeId || objectBinding.objectTypeId;
            grandChild.objectBinding = objectBinding;
            grandChild.objectMetadataError = this.props.objectMetadataError;
            grandChild.objectMetadataStatus = this.props.objectMetadataStatus;
            grandChild.objectBindingResolved =
              this.props.objectMetadataResolved;
            grandChild.objectPropertyMetadata =
              this.props.objectPropertiesMetadata?.find(
                (property) => property.id === grandChild.displayPropertyId,
              );
          }

          return grandChild;
        },
      );
      const isInvalid = this.checkInvalidChildren(children);

      childContainer.children = children.map((child) => {
        const grandChild = { ...child };

        if (isInvalid) grandChild.isFormValid = false;

          // Add submit and reset handlers
        grandChild.onReset = this.handleResetInputs;

        return grandChild;
      });
    }

    childContainer.rightColumn = componentWidth;
    childContainer.bottomRow = componentHeight;

    return super.renderChildWidget(childContainer);
  }

  static getStylsheetConfig() {
    return {
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
      boxShadow: "{{appsmith.theme.boxShadow.appBoxShadow}}",
    };
  }

  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMetaPropertiesMap(): Record<string, any> {
    return {
      hasChanges: false,
      objectBinding: undefined,
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return (widget: FormWidgetProps, extraDefsToDefine?: ExtraDef) => ({
      "!doc":
        "Form is used to capture a set of data inputs from a user. Forms are used specifically because they reset the data inputs when a form is submitted and disable submission for invalid data inputs",
      "!url": "https://docs.appsmith.com/widget-reference/form",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      data: generateTypeDef(widget.data, extraDefsToDefine),
      hasChanges: "bool",
      objectBinding: "?",
    });
  }

  static getSetterConfig(): SetterConfig {
    return {
      __setters: {
        setVisibility: {
          path: "isVisible",
          type: "string",
        },
      },
    };
  }

  static getDerivedPropertiesMap(): DerivedPropertiesMap {
    return { positioning: Positioning.Fixed };
  }

  getWidgetView() {
    if (this.props.formMode === "OBJECT" && !this.props.objectMetadataResolved) {
      return <ObjectFormMode {...this.props} />;
    }

    return this.renderAsContainerComponent(this.props);
  }
}

export interface FormWidgetProps extends ContainerComponentProps {
  formMode?: "QUERY" | "OBJECT";
  objectTypeId?: string;
  objectData?: unknown;
  objectActionId?: string;
  objectBinding?: FormObjectBinding;
  objectMetadataError?: { code?: string; message?: string };
  objectMetadataResolved?: boolean;
  objectMetadataStatus?: "idle" | "loading" | "ready" | "empty" | "error";
  objectPropertiesMetadata?: CelanworksmithProperty[];
  name: string;
  data: Record<string, unknown>;
  hasChanges: boolean;
}

export default FormWidget;
