import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import {
  hideByColumnType,
  getColumnPath,
} from "widgets/TableWidgetV2/widget/propertyUtils";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2NumberValidations() {
  return [
    {
      helpText: tableV2Text("help.min"),
      propertyName: "validation.min",
      label: tableV2Text("validation.min"),
      controlType: "TABLE_INLINE_EDIT_VALIDATION_CONTROL",
      placeholderText: "1",
      isBindProperty: true,
      isTriggerProperty: false,
      validation: {
        type: ValidationTypes.NUMBER,
        params: { default: -Infinity },
      },
      hidden: (props: TableWidgetProps, propertyPath: string) => {
        const path = getColumnPath(propertyPath);

        return hideByColumnType(
          props,
          path,
          [ColumnTypes.NUMBER, ColumnTypes.CURRENCY],
          true,
        );
      },
      dependencies: ["primaryColumns"],
    },
    {
      helpText: tableV2Text("help.max"),
      propertyName: "validation.max",
      label: tableV2Text("validation.max"),
      controlType: "TABLE_INLINE_EDIT_VALIDATION_CONTROL",
      placeholderText: "100",
      isBindProperty: true,
      isTriggerProperty: false,
      validation: {
        type: ValidationTypes.NUMBER,
        params: { default: Infinity },
      },
      hidden: (props: TableWidgetProps, propertyPath: string) => {
        const path = getColumnPath(propertyPath);

        return hideByColumnType(
          props,
          path,
          [ColumnTypes.NUMBER, ColumnTypes.CURRENCY],
          true,
        );
      },
      dependencies: ["primaryColumns"],
    },
  ];
}
