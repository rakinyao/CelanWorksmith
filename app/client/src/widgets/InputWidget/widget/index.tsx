import {
  FIELD_REQUIRED_ERROR,
  INPUT_DEFAULT_TEXT_MAX_CHAR_ERROR,
  createMessage,
} from "ee/constants/messages";
import { Alignment } from "@blueprintjs/core";
import type { IconName } from "@blueprintjs/icons";
import type {
  AutocompletionDefinitions,
  PropertyUpdates,
  SnipingModeProperty,
  WidgetCallout,
} from "WidgetProvider/types";
import { COMPACT_MODE_MIN_ROWS } from "WidgetProvider/constants";
import type { DerivedPropertiesMap } from "WidgetProvider/factory/types";
import { LabelPosition } from "components/constants";
import type { ExecutionResult } from "constants/AppsmithActionConstants/ActionConstants";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import type { TextSize } from "constants/WidgetConstants";
import {
  GridDefaults,
  RenderModes,
  WIDGET_TAGS,
} from "constants/WidgetConstants";
import type { ValidationResponse } from "constants/WidgetValidation";
import { ValidationTypes } from "constants/WidgetValidation";
import type { SetterConfig, Stylesheet } from "entities/AppTheming";
import { buildDeprecationWidgetMessage } from "pages/Editor/utils";
import React from "react";
import { useSelector } from "react-redux";
import { AutocompleteDataType } from "utils/autocomplete/AutocompleteDataType";
import { checkInputTypeTextByProps } from "widgets/BaseInputWidget/utils";
import type { WidgetProps, WidgetState } from "widgets/BaseWidget";
import BaseWidget from "widgets/BaseWidget";
import {
  DefaultAutocompleteDefinitions,
  isCompactMode,
} from "widgets/WidgetUtils";
import type { InputComponentProps } from "../component";
import InputComponent from "../component";
import { CurrencyDropdownOptions } from "../component/CurrencyCodeDropdown";
import { ISDCodeDropdownOptions } from "../component/ISDCodeDropdown";
import {
  formatCurrencyNumber,
  getDecimalSeparator,
  getLocale,
} from "../component/utilities";
import type { InputType } from "../constants";
import { InputTypes } from "../constants";
import IconSVG from "../icon.svg";
import { getObjectPropertyValue } from "widgets/ObjectDetailWidget/widget/objectDetailUtils";
import { normalizeObjectData } from "widgets/ObjectDetailWidget/widget/objectDetailUtils";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import type { CelanworksmithProperty } from "api/CelanworksmithAPI";

type ObjectInputState =
  | "ready"
  | "missing"
  | "loading"
  | "error"
  | "permission"
  | "typeMismatch"
  | "deleted"
  | "unsupported";

const OBJECT_INPUT_TYPES: Partial<Record<string, InputType>> = {
  STRING: InputTypes.TEXT,
  INTEGER: InputTypes.INTEGER,
  DECIMAL: InputTypes.NUMBER,
  REFERENCE: InputTypes.TEXT,
};

const isPermissionError = (code: string | undefined) =>
  ["FORBIDDEN", "PERMISSION_DENIED", "UNAUTHORIZED"].includes(code || "");

export const getEffectiveInputType = (props: InputWidgetProps): InputType => {
  if (props.dataMode !== "OBJECT" || !props.objectPropertyMetadata) {
    return props.inputType;
  }

  return (
    OBJECT_INPUT_TYPES[props.objectPropertyMetadata.dataType] || props.inputType
  );
};

export const getEffectiveIsRequired = (props: InputWidgetProps): boolean => {
  if (props.dataMode !== "OBJECT" || !props.objectPropertyMetadata) {
    return !!props.isRequired;
  }

  return props.objectPropertyMetadata.required;
};

export const isInputValueValid = (
  value: unknown,
  props: InputWidgetProps,
): boolean => {
  const inputType = getEffectiveInputType(props);
  const isRequired = getEffectiveIsRequired(props);
  const text = value === undefined || value === null ? "" : String(value);

  if (
    props.dataMode === "OBJECT" &&
    props.objectPropertyMetadata &&
    !OBJECT_INPUT_TYPES[props.objectPropertyMetadata.dataType]
  ) {
    return false;
  }

  if (!isRequired && !text) return true;

  if (isRequired && !text) return false;

  if (typeof props.validation === "boolean" && !props.validation) {
    return false;
  }

  let parsedRegex: RegExp | null = null;

  if (props.regex) {
    const regexParts = props.regex.match(/(\/?)(.+)\1([a-z]*)/i);

    if (!regexParts) {
      parsedRegex = new RegExp(props.regex);
    } else if (
      regexParts[3] &&
      !/^(?!.*?(.).*?\1)[gmisuy]+$/.test(regexParts[3])
    ) {
      parsedRegex = RegExp(props.regex);
    } else {
      parsedRegex = new RegExp(regexParts[2], regexParts[3]);
    }
  }

  if (inputType === "EMAIL") {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(text);
  }

  if (
    inputType === "NUMBER" ||
    inputType === "INTEGER" ||
    inputType === "CURRENCY" ||
    inputType === "PHONE_NUMBER"
  ) {
    const numericText = text.split(",").join("");

    return parsedRegex
      ? parsedRegex.test(numericText)
      : !isNaN(Number(numericText));
  }

  return parsedRegex ? parsedRegex.test(text) : true;
};

const getObjectInputState = (props: InputWidgetProps): ObjectInputState => {
  const objectData = props.objectBinding?.instance || props.objectData;
  const object = normalizeObjectData(objectData);

  if (!object) return "missing";

  if (!props.objectTypeId || object.typeId !== props.objectTypeId) {
    return "typeMismatch";
  }

  if (
    props.objectMetadataStatus === "loading" ||
    props.objectMetadataStatus === "idle"
  ) {
    return "loading";
  }

  if (props.objectMetadataError) {
    return isPermissionError(props.objectMetadataError.code)
      ? "permission"
      : "error";
  }

  if (!props.displayPropertyId || !props.objectPropertyMetadata) {
    return "deleted";
  }

  return OBJECT_INPUT_TYPES[props.objectPropertyMetadata.dataType]
    ? "ready"
    : "unsupported";
};

const getObjectInputStateMessage = (
  state: Exclude<ObjectInputState, "ready">,
  props: InputWidgetProps,
) => {
  switch (state) {
    case "missing":
      return "Select an Object instance.";
    case "loading":
      return "Loading Object Type metadata...";
    case "permission":
      return "Permission denied to access this Object Type.";
    case "error":
      return (
        props.objectMetadataError?.message ||
        "Unable to load Object Type metadata."
      );
    case "typeMismatch":
      return "Object data does not match the configured Object Type.";
    case "deleted":
      return "The selected Object property is unavailable.";
    case "unsupported":
      return `Unsupported Object property data type: ${props.objectPropertyMetadata?.dataType}`;
  }
};

export function defaultValueValidation(
  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  props: InputWidgetProps,
  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _?: any,
): ValidationResponse {
  const inputType =
    props.dataMode === "OBJECT" && props.objectPropertyMetadata
      ? ({
          STRING: "TEXT",
          INTEGER: "INTEGER",
          DECIMAL: "NUMBER",
          REFERENCE: "TEXT",
        }[props.objectPropertyMetadata.dataType] || props.inputType)
      : props.inputType;

  if (
    inputType === "INTEGER" ||
    inputType === "NUMBER" ||
    inputType === "CURRENCY" ||
    inputType === "PHONE_NUMBER"
  ) {
    let parsed: number | undefined = Number(value);

    if (typeof value === "string") {
      if (value.trim() === "") {
        return {
          isValid: true,
          parsed: undefined,
          messages: [{ name: "", message: "" }],
        };
      }

      if (!Number.isFinite(parsed)) {
        return {
          isValid: false,
          parsed: undefined,
          messages: [
            {
              name: "TypeError",
              message: "This value must be a number",
            },
          ],
        };
      }
    }

    if (isNaN(parsed)) {
      parsed = undefined;
    }

    return {
      isValid: true,
      parsed,
      messages: [{ name: "", message: "" }],
    };
  }

  if (typeof value === "object" && value !== null) {
    return {
      isValid: false,
      parsed: JSON.stringify(value, null, 2),
      messages: [
        {
          name: "TypeError",
          message: "This value must be string",
        },
      ],
    };
  }

  let parsed = value;
  const isValid = typeof parsed === "string";

  if (!isValid) {
    try {
      parsed = String(parsed);
    } catch (e) {
      return {
        isValid: false,
        parsed: "",
        messages: [
          {
            name: "TypeError",
            message: "This value must be string",
          },
        ],
      };
    }
  }

  return {
    isValid,
    parsed: parsed,
    messages: [{ name: "", message: "" }],
  };
}

class InputWidget extends BaseWidget<InputWidgetProps, WidgetState> {
  constructor(props: InputWidgetProps) {
    super(props);
    this.state = {
      text: props.text,
    };
  }

  static type = "INPUT_WIDGET";

  static getConfig() {
    return {
      name: "Input",
      iconSVG: IconSVG,
      needsMeta: true,
      hideCard: true,
      isDeprecated: true,
      replacement: "INPUT_WIDGET_V2",
      tags: [WIDGET_TAGS.SUGGESTED_WIDGETS, WIDGET_TAGS.INPUTS],
    };
  }

  static getDefaults() {
    return {
      inputType: "TEXT",
      dataMode: "OBJECT",
      objectTypeId: undefined,
      objectData: undefined,
      displayPropertyId: undefined,
      rows: 4,
      label: "",
      labelPosition: LabelPosition.Left,
      labelAlignment: Alignment.LEFT,
      labelWidth: 5,
      columns: 20,
      widgetName: "Input",
      version: 1,
      defaultText: "",
      iconAlign: "left",
      autoFocus: false,
      labelStyle: "",
      resetOnSubmit: true,
      isRequired: false,
      isDisabled: false,
      allowCurrencyChange: false,
      animateLoading: true,
    };
  }

  static getMethods() {
    return {
      getSnipingModeUpdates: (
        propValueMap: SnipingModeProperty,
      ): PropertyUpdates[] => {
        return [
          {
            propertyPath: "defaultText",
            propertyValue: propValueMap.data,
            isDynamicPropertyPath: true,
          },
        ];
      },
      getEditorCallouts(): WidgetCallout[] {
        return [
          {
            message: buildDeprecationWidgetMessage(
              InputWidget.getConfig().name,
            ),
          },
        ];
      },
    };
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    const definitions = {
      "!doc":
        "An input text field is used to capture a users textual input such as their names, numbers, emails etc. Inputs are used in forms and can have custom validations.",
      "!url": "https://docs.appsmith.com/widget-reference/input",
      text: {
        "!type": "string",
        "!doc": "The text value of the input",
        "!url": "https://docs.appsmith.com/widget-reference/input",
      },
      isValid: "bool",
      isVisible: DefaultAutocompleteDefinitions.isVisible,
      isDisabled: "bool",
      countryCode: {
        "!type": "string",
        "!doc": "Selected country code for Phone Number type input",
      },
      currencyCountryCode: {
        "!type": "string",
        "!doc": "Selected country code for Currency type input",
      },
    };

    return definitions;
  }

  static getPropertyPaneConfig() {
    return [
      {
        sectionName: "CelanWorksmith Object data",
        children: [
          {
            propertyName: "dataMode",
            label: "Data mode",
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
            dependencies: ["dataMode"],
            hidden: (props: InputWidgetProps) => props.dataMode !== "OBJECT",
          },
          {
            propertyName: "objectData",
            label: "Object data",
            controlType: "INPUT_TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.OBJECT },
            dependencies: ["dataMode"],
            hidden: (props: InputWidgetProps) => props.dataMode !== "OBJECT",
          },
          {
            propertyName: "displayPropertyId",
            label: "Object property",
            controlType: "CELANWORKSMITH_OBJECT_PROPERTY",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            dependencies: ["dataMode", "objectTypeId"],
            hidden: (props: InputWidgetProps) => props.dataMode !== "OBJECT",
          },
        ],
      },
      {
        sectionName: "General",
        children: [
          {
            helpText: "Changes the type of data captured in the input",
            propertyName: "inputType",
            label: "Data type",
            controlType: "DROP_DOWN",
            options: [
              {
                label: "Text",
                value: "TEXT",
              },
              {
                label: "Number",
                value: "NUMBER",
              },
              {
                label: "Password",
                value: "PASSWORD",
              },
              {
                label: "Email",
                value: "EMAIL",
              },
              {
                label: "Currency",
                value: "CURRENCY",
              },
              {
                label: "Phone Number",
                value: "PHONE_NUMBER",
              },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
          },
          {
            propertyName: "allowCurrencyChange",
            label: "Allow currency change",
            helpText: "Search by currency or country",
            controlType: "SWITCH",
            isJSConvertible: false,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
            hidden: (props: InputWidgetProps) => {
              return props.inputType !== InputTypes.CURRENCY;
            },
            dependencies: ["inputType"],
          },
          {
            helpText: "Changes the country code",
            propertyName: "phoneNumberCountryCode",
            label: "Default country code",
            enableSearch: true,
            dropdownHeight: "195px",
            controlType: "DROP_DOWN",
            searchPlaceholderText: "Search by code or country name",
            options: ISDCodeDropdownOptions,
            hidden: (props: InputWidgetProps) => {
              return props.inputType !== InputTypes.PHONE_NUMBER;
            },
            dependencies: ["inputType"],
            isBindProperty: false,
            isTriggerProperty: false,
          },
          {
            helpText: "Changes the type of currency",
            propertyName: "currencyCountryCode",
            label: "Currency",
            enableSearch: true,
            dropdownHeight: "195px",
            controlType: "DROP_DOWN",
            searchPlaceholderText: "Search by code or name",
            options: CurrencyDropdownOptions,
            hidden: (props: InputWidgetProps) => {
              return props.inputType !== InputTypes.CURRENCY;
            },
            dependencies: ["inputType"],
            isBindProperty: false,
            isTriggerProperty: false,
          },
          {
            helpText: "No. of decimals in currency input",
            propertyName: "decimalsInCurrency",
            label: "Decimals",
            controlType: "DROP_DOWN",
            options: [
              {
                label: "1",
                value: 1,
              },
              {
                label: "2",
                value: 2,
              },
            ],
            hidden: (props: InputWidgetProps) => {
              return props.inputType !== InputTypes.CURRENCY;
            },
            dependencies: ["inputType"],
            isBindProperty: false,
            isTriggerProperty: false,
          },
          {
            helpText: "Sets maximum allowed text length",
            propertyName: "maxChars",
            label: "Max Chars",
            controlType: "INPUT_TEXT",
            placeholderText: "255",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.NUMBER },
            hidden: (props: InputWidgetProps) => {
              return !checkInputTypeTextByProps(props);
            },
            dependencies: ["inputType"],
          },
          {
            helpText:
              "Sets the default text of the widget. The text is updated if the default text changes",
            propertyName: "defaultText",
            label: "Default Text",
            controlType: "INPUT_TEXT",
            placeholderText: "John Doe",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                fn: defaultValueValidation,
                expected: {
                  type: "string or number",
                  example: `John | 123`,
                  autocompleteDataType: AutocompleteDataType.STRING,
                },
              },
            },
            dependencies: ["inputType"],
          },
          {
            helpText:
              "Adds a validation to the input which displays an error on failure",
            propertyName: "regex",
            label: "Regex",
            controlType: "INPUT_TEXT",
            placeholderText: "^\\w+@[a-zA-Z_]+?\\.[a-zA-Z]{2,3}$",
            inputType: "TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.REGEX },
          },
          {
            helpText: "Sets the input validity based on a JS expression",
            propertyName: "validation",
            label: "Valid",
            controlType: "INPUT_TEXT",
            placeholderText: "{{ Input1.text.length > 0 }}",
            inputType: "TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            helpText:
              "The error message to display if the regex or valid property check fails",
            propertyName: "errorMessage",
            label: "Error message",
            controlType: "INPUT_TEXT",
            placeholderText: "Not a valid email!",
            inputType: "TEXT",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: "Sets a placeholder text for the input",
            propertyName: "placeholderText",
            label: "Placeholder",
            controlType: "INPUT_TEXT",
            placeholderText: "Placeholder",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: "Show help text or details about current input",
            propertyName: "tooltip",
            label: "Tooltip",
            controlType: "INPUT_TEXT",
            placeholderText: "Passwords must be atleast 6 chars",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "isRequired",
            label: "Required",
            helpText: "Makes input to the widget mandatory",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
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
            helpText: "Disables input to this widget",
            propertyName: "isDisabled",
            label: "Disabled",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
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
          {
            helpText: "Clears the input value after submit",
            propertyName: "resetOnSubmit",
            label: "Reset on submit",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            helpText: "Focus input automatically on load",
            propertyName: "autoFocus",
            label: "Auto focus",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "isSpellCheck",
            label: "Spellcheck",
            helpText:
              "Defines whether the text input may be checked for spelling errors",
            controlType: "SWITCH",
            isJSConvertible: false,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
            hidden: (props: InputWidgetProps) => {
              return !checkInputTypeTextByProps(props);
            },
            dependencies: ["inputType"],
          },
        ],
      },
      {
        sectionName: "Label",
        children: [
          {
            helpText: "Sets the label text of the widget",
            propertyName: "label",
            label: "Text",
            controlType: "INPUT_TEXT",
            placeholderText: "Name:",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: "Sets the label position of the widget",
            propertyName: "labelPosition",
            label: "Position",
            controlType: "DROP_DOWN",
            options: [
              { label: "Left", value: LabelPosition.Left },
              { label: "Top", value: LabelPosition.Top },
              { label: "Auto", value: LabelPosition.Auto },
            ],
            defaultValue: LabelPosition.Top,
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: "Sets the label alignment of the widget",
            propertyName: "labelAlignment",
            label: "Alignment",
            controlType: "LABEL_ALIGNMENT_OPTIONS",
            fullWidth: false,
            options: [
              {
                startIcon: "align-left",
                value: Alignment.LEFT,
              },
              {
                startIcon: "align-right",
                value: Alignment.RIGHT,
              },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            hidden: (props: InputWidgetProps) =>
              props.labelPosition !== LabelPosition.Left,
            dependencies: ["labelPosition"],
          },
          {
            helpText:
              "Sets the label width of the widget as the number of columns",
            propertyName: "labelWidth",
            label: "Width (in columns)",
            controlType: "NUMERIC_INPUT",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            min: 0,
            validation: {
              type: ValidationTypes.NUMBER,
              params: {
                natural: true,
              },
            },
            hidden: (props: InputWidgetProps) =>
              props.labelPosition !== LabelPosition.Left,
            dependencies: ["labelPosition"],
          },
        ],
      },
      {
        sectionName: "Events",
        children: [
          {
            helpText: "when the text is changed",
            propertyName: "onTextChanged",
            label: "onTextChanged",
            controlType: "ACTION_SELECTOR",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: true,
          },
          {
            helpText: "on submit (when the enter key is pressed)",
            propertyName: "onSubmit",
            label: "onSubmit",
            controlType: "ACTION_SELECTOR",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: true,
          },
        ],
      },
      {
        sectionName: "Label styles",
        children: [
          {
            propertyName: "labelTextColor",
            label: "Text color",
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.TEXT,
              params: {
                regex: /^(?![<|{{]).+/,
              },
            },
          },
          {
            propertyName: "labelTextSize",
            label: "Text size",
            controlType: "DROP_DOWN",
            defaultValue: "0.875rem",
            options: [
              {
                label: "S",
                value: "0.875rem",
                subText: "0.875rem",
              },
              {
                label: "M",
                value: "1rem",
                subText: "1rem",
              },
              {
                label: "L",
                value: "1.25rem",
                subText: "1.25rem",
              },
              {
                label: "XL",
                value: "1.875rem",
                subText: "1.875rem",
              },
              {
                label: "XXL",
                value: "3rem",
                subText: "3rem",
              },
              {
                label: "3XL",
                value: "3.75rem",
                subText: "3.75rem",
              },
            ],
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "labelStyle",
            label: "Label Font Style",
            controlType: "BUTTON_GROUP",
            options: [
              {
                startIcon: "text-bold",
                value: "BOLD",
              },
              {
                startIcon: "text-italic",
                value: "ITALIC",
              },
            ],
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: "Icon Options",
        hidden: (props: InputWidgetProps) => {
          const { inputType } = props;

          return inputType === "CURRENCY" || inputType === "PHONE_NUMBER";
        },
        dependencies: ["inputType"],
        children: [
          {
            propertyName: "iconName",
            label: "Icon",
            helpText: "Sets the icon to be used in input field",
            controlType: "ICON_SELECT",
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "iconAlign",
            label: "Icon alignment",
            helpText: "Sets the icon alignment of input field",
            controlType: "ICON_TABS",
            defaultValue: "left",
            options: [
              {
                startIcon: "align-left",
                value: "left",
              },
              {
                startIcon: "align-right",
                value: "right",
              },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            hidden: (props: InputWidgetProps) => !props.iconName,
            dependencies: ["iconName"],
          },
        ],
      },
      {
        sectionName: "Styles",
        children: [
          {
            propertyName: "backgroundColor",
            helpText: "Sets the background color of the widget",
            label: "Background color",
            controlType: "COLOR_PICKER",
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
    return {
      isValid: `{{
        (function(){
          const objectPropertyMetadata = this.dataMode === "OBJECT" ? this.objectPropertyMetadata : undefined;
          const inputType = objectPropertyMetadata ? ({
            STRING: "TEXT",
            INTEGER: "INTEGER",
            DECIMAL: "NUMBER",
            REFERENCE: "TEXT",
          }[objectPropertyMetadata.dataType]) : this.inputType;
          const isRequired = objectPropertyMetadata ? objectPropertyMetadata.required : this.isRequired;

          if (objectPropertyMetadata && !inputType) {
            return false;
          }
          if (!isRequired && !this.text) {
            return true
          }
          if(isRequired && !this.text){
            return false
          }
          if (typeof this.validation === "boolean" && !this.validation) {
            return false;
          }
          let parsedRegex = null;
          if (this.regex) {
            /*
            * break up the regexp pattern into 4 parts: given regex, regex prefix , regex pattern, regex flags
            * Example /test/i will be split into ["/test/gi", "/", "test", "gi"]
            */
            const regexParts = this.regex.match(/(\\/?)(.+)\\1([a-z]*)/i);

            if (!regexParts) {
              parsedRegex = new RegExp(this.regex);
            } else {
              /*
              * if we don't have a regex flags (gmisuy), convert provided string into regexp directly
              /*
              if (regexParts[3] && !/^(?!.*?(.).*?\\1)[gmisuy]+$/.test(regexParts[3])) {
                parsedRegex = RegExp(this.regex);
              }
              /*
              * if we have a regex flags, use it to form regexp
              */
              parsedRegex = new RegExp(regexParts[2], regexParts[3]);
            }
          }
          if (inputType === "EMAIL") {
            const emailRegex = new RegExp(/^\\w+([\\.-]?\\w+)*@\\w+([\\.-]?\\w+)*(\\.\\w{2,3})+$/);
            return emailRegex.test(this.text);
          }
          else if (
            inputType === "NUMBER" ||
            inputType === "INTEGER" ||
            inputType === "CURRENCY" ||
            inputType === "PHONE_NUMBER"
          ) {
            let value = this.text.split(",").join("");
            if (parsedRegex) {
              return parsedRegex.test(value);
            }
            if (isRequired) {
              return !(value === '' || isNaN(value));
            }

            return (value === '' || !isNaN(value || ''));
          }
          else if (isRequired) {
            if(this.text && this.text.length) {
              if (parsedRegex) {
                return parsedRegex.test(this.text)
              } else {
                return true;
              }
            } else {
              return false;
            }
          }
          if (parsedRegex) {
            return parsedRegex.test(this.text)
          } else {
            return true;
          }
        })()
      }}`,
      value: `{{this.text}}`,
    };
  }

  static getDefaultPropertiesMap(): Record<string, string> {
    return {
      text: "defaultText",
    };
  }

  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMetaPropertiesMap(): Record<string, any> {
    return {
      text: undefined,
      isFocused: false,
      isDirty: false,
      selectedCurrencyType: undefined,
      selectedCountryCode: undefined,
      objectPropertyMetadata: undefined,
    };
  }

  static getStylesheetConfig(): Stylesheet {
    return {
      accentColor: "{{appsmith.theme.colors.primaryColor}}",
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
      boxShadow: "none",
    };
  }

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
        setRequired: {
          path: "isRequired",
          type: "boolean",
        },
        setValue: {
          path: "defaultText",
          type: "string",
          accessor: "text",
        },
      },
    };
  }

  onValueChange = (value: string) => {
    this.props.updateWidgetMetaProperty("text", value, {
      triggerPropertyName: "onTextChanged",
      dynamicString: this.props.onTextChanged,
      event: {
        type: EventType.ON_TEXT_CHANGE,
      },
    });

    if (!this.props.isDirty) {
      this.props.updateWidgetMetaProperty("isDirty", true);
    }
  };

  onCurrencyTypeChange = (code?: string) => {
    const currencyCountryCode = code;

    if (this.props.renderMode === RenderModes.CANVAS) {
      super.updateWidgetProperty("currencyCountryCode", currencyCountryCode);
    } else {
      this.props.updateWidgetMetaProperty(
        "selectedCurrencyCountryCode",
        currencyCountryCode,
      );
    }
  };

  onISDCodeChange = (code?: string) => {
    const countryCode = code;

    if (this.props.renderMode === RenderModes.CANVAS) {
      super.updateWidgetProperty("phoneNumberCountryCode", countryCode);
    } else {
      this.props.updateWidgetMetaProperty(
        "selectedPhoneNumberCountryCode",
        countryCode,
      );
    }
  };

  handleFocusChange = (focusState: boolean) => {
    /**
     * Reason for disabling drag on focusState: true:
     * 1. In Firefox, draggable="true" property on the parent element
     *    or <input /> itself, interferes with some <input /> element's events
     *    Bug Ref - https://bugzilla.mozilla.org/show_bug.cgi?id=800050
     *              https://bugzilla.mozilla.org/show_bug.cgi?id=1189486
     *
     *  Eg - input with draggable="true", double clicking the text; won't highlight the text
     *
     * 2. Dragging across the text (for text selection) in input won't cause the widget to drag.
     */
    this.props.updateWidgetMetaProperty("dragDisabled", focusState);
    this.props.updateWidgetMetaProperty("isFocused", focusState);
  };

  onSubmitSuccess = (result: ExecutionResult) => {
    if (result.success && this.props.resetOnSubmit) {
      this.props.updateWidgetMetaProperty("text", "", {
        triggerPropertyName: "onSubmit",
        dynamicString: this.props.onTextChanged,
        event: {
          type: EventType.ON_TEXT_CHANGE,
        },
      });
    }
  };

  handleKeyDown = (
    e:
      | React.KeyboardEvent<HTMLTextAreaElement>
      | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    const { isValid, onSubmit } = this.props;
    const isEnterKey = e.key === "Enter" || e.keyCode === 13;

    if (isEnterKey && onSubmit && isValid) {
      super.executeAction({
        triggerPropertyName: "onSubmit",
        dynamicString: onSubmit,
        event: {
          type: EventType.ON_SUBMIT,
          callback: this.onSubmitSuccess,
        },
      });
    }
  };

  getFormattedText = () => {
    if (this.props.isFocused || this.props.inputType !== InputTypes.CURRENCY) {
      return this.props.text !== undefined ? this.props.text : "";
    }

    if (this.props.text === "" || this.props.text === undefined) return "";

    const valueToFormat = String(this.props.text);

    const locale = getLocale();
    const decimalSeparator = getDecimalSeparator(locale);

    return formatCurrencyNumber(
      this.props.decimalsInCurrency,
      valueToFormat,
      decimalSeparator,
    );
  };

  getWidgetView() {
    if (
      this.props.dataMode === "OBJECT" &&
      !this.props.objectBindingResolved &&
      !this.props.objectPropertyMetadata
    ) {
      return <ObjectInputMode {...this.props} />;
    }

    const objectInputState =
      this.props.dataMode === "OBJECT"
        ? getObjectInputState(this.props)
        : "ready";

    if (objectInputState !== "ready") {
      return (
        <div role="alert">
          {getObjectInputStateMessage(objectInputState, this.props)}
        </div>
      );
    }

    const objectProperty =
      this.props.dataMode === "OBJECT"
        ? getObjectPropertyValue(
            this.props.objectBinding?.instance || this.props.objectData,
            this.props.displayPropertyId,
          )
        : undefined;
    const objectValue =
      objectProperty?.state === "ready"
        ? typeof objectProperty.value === "object"
          ? JSON.stringify(objectProperty.value)
          : String(objectProperty.value ?? "")
        : undefined;
    const value =
      objectValue !== undefined && !this.props.isDirty
        ? objectValue
        : this.getFormattedText();
    const effectiveInputType = getEffectiveInputType(this.props);
    const isRequired = getEffectiveIsRequired(this.props);
    let isInvalid =
      "isValid" in this.props && !this.props.isValid && !!this.props.isDirty;
    const currencyCountryCode = this.props.selectedCurrencyCountryCode
      ? this.props.selectedCurrencyCountryCode
      : this.props.currencyCountryCode;
    const phoneNumberCountryCode = this.props.selectedPhoneNumberCountryCode
      ? this.props.selectedPhoneNumberCountryCode
      : this.props.phoneNumberCountryCode;
    const conditionalProps: Partial<InputComponentProps> = {};

    conditionalProps.errorMessage = this.props.errorMessage;

    if (isRequired && value.length === 0) {
      conditionalProps.errorMessage = createMessage(FIELD_REQUIRED_ERROR);
    }

    if (effectiveInputType === "TEXT" && this.props.maxChars) {
      // pass maxChars only for Text type inputs, undefined for other types
      conditionalProps.maxChars = this.props.maxChars;

      if (
        this.props.defaultText &&
        this.props.defaultText.toString().length > this.props.maxChars
      ) {
        isInvalid = true;
        conditionalProps.errorMessage = createMessage(
          INPUT_DEFAULT_TEXT_MAX_CHAR_ERROR,
          this.props.maxChars,
        );
      }
    }

    if (this.props.maxNum) conditionalProps.maxNum = this.props.maxNum;

    if (this.props.minNum) conditionalProps.minNum = this.props.minNum;

    const { componentHeight } = this.props;
    const minInputSingleLineHeight =
      this.props.label || this.props.tooltip
        ? // adjust height for label | tooltip extra div
          COMPACT_MODE_MIN_ROWS + 4
        : // GRID_DENSITY_MIGRATION_V1 used to adjust code as per new scaled canvas.
          COMPACT_MODE_MIN_ROWS;

    return (
      <InputComponent
        accentColor={this.props.accentColor}
        allowCurrencyChange={this.props.allowCurrencyChange}
        autoFocus={this.props.autoFocus}
        backgroundColor={this.props.backgroundColor}
        borderRadius={this.props.borderRadius}
        boxShadow={this.props.boxShadow}
        // show label and Input side by side if true
        compactMode={isCompactMode(componentHeight)}
        currencyCountryCode={currencyCountryCode}
        decimalsInCurrency={this.props.decimalsInCurrency}
        defaultValue={objectValue ?? this.props.defaultText}
        disableNewLineOnPressEnterKey={!!this.props.onSubmit}
        disabled={
          this.props.isDisabled ||
          this.props.objectPropertyMetadata?.readOnly ||
          this.props.objectPropertyMetadata?.derived
        }
        iconAlign={this.props.iconAlign}
        iconName={this.props.iconName}
        inputType={
          effectiveInputType
        }
        isInvalid={isInvalid}
        isLoading={this.props.isLoading}
        isRequired={isRequired}
        label={this.props.label}
        labelAlignment={this.props.labelAlignment}
        labelPosition={this.props.labelPosition}
        labelStyle={this.props.labelStyle}
        labelTextColor={this.props.labelTextColor}
        labelTextSize={this.props.labelTextSize}
        labelWidth={this.props.labelComponentWidth}
        multiline={
          componentHeight >
            minInputSingleLineHeight * GridDefaults.DEFAULT_GRID_ROW_HEIGHT &&
          effectiveInputType === "TEXT"
        }
        onCurrencyTypeChange={this.onCurrencyTypeChange}
        onFocusChange={this.handleFocusChange}
        onISDCodeChange={this.onISDCodeChange}
        onKeyDown={this.handleKeyDown}
        onValueChange={this.onValueChange}
        phoneNumberCountryCode={phoneNumberCountryCode}
        placeholder={this.props.placeholderText}
        showError={!!this.props.isFocused}
        spellCheck={!!this.props.isSpellCheck}
        stepSize={1}
        tooltip={this.props.tooltip}
        value={value}
        widgetId={this.props.widgetId}
        {...conditionalProps}
      />
    );
  }
}

function ObjectInputMode(props: InputWidgetProps) {
  const objectsState = useSelector(getCelanworksmithObjectsState);
  const typeState = props.objectTypeId
    ? objectsState.types[props.objectTypeId]
    : undefined;
  const objectPropertyMetadata = typeState?.metadata?.properties.find(
    (property) => property.id === props.displayPropertyId,
  );

  React.useEffect(() => {
    if (
      props.updateWidgetMetaProperty &&
      props.objectPropertyMetadata !== objectPropertyMetadata
    ) {
      props.updateWidgetMetaProperty(
        "objectPropertyMetadata",
        objectPropertyMetadata,
      );
    }
  }, [
    objectPropertyMetadata,
    props.objectPropertyMetadata,
    props.updateWidgetMetaProperty,
  ]);

  return (
    <InputWidget
      {...props}
      objectBindingResolved
      objectMetadataError={typeState?.error || objectsState.error}
      objectMetadataStatus={typeState?.status || objectsState.status}
      objectPropertyMetadata={objectPropertyMetadata}
    />
  );
}

export interface InputValidator {
  validationRegex: string;
  errorMessage: string;
}
export interface InputWidgetProps extends WidgetProps {
  dataMode?: "QUERY" | "OBJECT";
  objectTypeId?: string;
  objectData?: unknown;
  displayPropertyId?: string;
  objectBinding?: {
    instance: {
      id: string;
      typeId: string;
      properties: Record<string, unknown>;
    };
    objectTypeId: string;
  };
  objectBindingResolved?: boolean;
  objectMetadataError?: { code?: string; message?: string };
  objectMetadataStatus?: "idle" | "loading" | "ready" | "empty" | "error";
  objectPropertyMetadata?: CelanworksmithProperty;
  inputType: InputType;
  currencyCountryCode?: string;
  noOfDecimals?: number;
  allowCurrencyChange?: boolean;
  phoneNumberCountryCode?: string;
  decimalsInCurrency?: number;
  defaultText?: string | number;
  tooltip?: string;
  isDisabled?: boolean;
  validation: boolean;
  text: string;
  regex?: string;
  errorMessage?: string;
  placeholderText?: string;
  maxChars?: number;
  minNum?: number;
  maxNum?: number;
  onTextChanged?: string;
  label: string;
  labelPosition?: LabelPosition;
  labelAlignment?: Alignment;
  labelTextColor?: string;
  labelTextSize?: TextSize;
  labelStyle?: string;
  labelWidth?: number;
  inputValidators: InputValidator[];
  isValid: boolean;
  focusIndex?: number;
  isAutoFocusEnabled?: boolean;
  isRequired?: boolean;
  isFocused?: boolean;
  isDirty?: boolean;
  autoFocus?: boolean;
  iconName?: IconName;
  iconAlign?: Omit<Alignment, "center">;
  onSubmit?: string;
  backgroundColor: string;
  borderRadius: string;
  boxShadow?: string;
  primaryColor: string;
  labelComponentWidth?: number;
}

export default InputWidget;
