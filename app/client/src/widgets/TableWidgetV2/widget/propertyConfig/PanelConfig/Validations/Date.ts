import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import i18n from "i18n";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import {
  getColumnPath,
  hideByColumnType,
} from "widgets/TableWidgetV2/widget/propertyUtils";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2DateValidations() {
  return [
    {
      propertyName: "validation.minDate",
      helpText: tableV2Text("help.minDate"),
      label: tableV2Text("validation.minDate"),
      controlType: "DATE_PICKER",
      placeholderText: "1",
      isBindProperty: true,
      isTriggerProperty: false,
      hidden: (props: TableWidgetProps, propertyPath: string) => {
        const path = getColumnPath(propertyPath);

        return hideByColumnType(props, path, [ColumnTypes.DATE], true);
      },
      dependencies: ["primaryColumns"],
    },
    {
      propertyName: "validation.maxDate",
      helpText: tableV2Text("help.maxDate"),
      label: tableV2Text("validation.maxDate"),
      controlType: "DATE_PICKER",
      placeholderText: "100",
      isBindProperty: true,
      isTriggerProperty: false,
      hidden: (props: TableWidgetProps, propertyPath: string) => {
        const path = getColumnPath(propertyPath);

        return hideByColumnType(props, path, [ColumnTypes.DATE], true);
      },
      dependencies: ["primaryColumns"],
    },
  ];
}
