import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import {
  showByColumnType,
  getColumnPath,
} from "widgets/TableWidgetV2/widget/propertyUtils";

const hideColumnByType = (props: TableWidgetProps, propertyPath: string) => {
  const path = getColumnPath(propertyPath);

  return showByColumnType(
    props,
    path,
    [ColumnTypes.DATE, ColumnTypes.SELECT],
    true,
  );
};

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2CommonValidations() {
  return [
    {
      propertyName: "validation.regex",
      helpText: tableV2Text("help.validationRegex"),
      label: tableV2Text("validation.regex"),
      controlType: "TABLE_INLINE_EDIT_VALIDATION_CONTROL",
      dependencies: ["primaryColumns"],
      placeholderText: "^\\w+@[a-zA-Z_]+?\\.[a-zA-Z]{2,3}$",
      isBindProperty: true,
      isTriggerProperty: false,
      validation: { type: ValidationTypes.REGEX },
      hidden: hideColumnByType,
    },
    {
      propertyName: "validation.isColumnEditableCellValid",
      helpText: tableV2Text("help.valid"),
      label: tableV2Text("validation.valid"),
      controlType: "TABLE_INLINE_EDIT_VALID_PROPERTY_CONTROL",
      isJSConvertible: false,
      dependencies: ["primaryColumns", "columnOrder"],
      isBindProperty: true,
      isTriggerProperty: false,
      validation: {
        type: ValidationTypes.BOOLEAN,
        params: {
          default: true,
        },
      },
      hidden: hideColumnByType,
    },
    {
      propertyName: "validation.errorMessage",
      helpText: tableV2Text("help.validationErrorMessage"),
      label: tableV2Text("validation.errorMessage"),
      controlType: "TABLE_INLINE_EDIT_VALIDATION_CONTROL",
      dependencies: ["primaryColumns"],
      placeholderText: tableV2Text("placeholder.validationErrorMessage"),
      isBindProperty: true,
      isTriggerProperty: false,
      validation: { type: ValidationTypes.TEXT },
      hidden: hideColumnByType,
    },
    {
      propertyName: "validation.isColumnEditableCellRequired",
      helpText: tableV2Text("help.required"),
      label: tableV2Text("validation.required"),
      controlType: "SWITCH",
      dependencies: ["primaryColumns"],
      customJSControl: "TABLE_INLINE_EDIT_VALIDATION_CONTROL",
      isJSConvertible: true,
      isBindProperty: true,
      isTriggerProperty: false,
      validation: { type: ValidationTypes.BOOLEAN },
    },
  ];
}
