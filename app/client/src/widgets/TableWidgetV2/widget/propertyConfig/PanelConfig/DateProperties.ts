import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import { get } from "lodash";
import { allowedFirstDayOfWeekRange } from "../../propertyUtils";
import { AutocompleteDataType } from "utils/autocomplete/AutocompleteDataType";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnDatePropertiesConfig() {
  return {
    sectionName: tableV2Text("column.dateSettings"),
    hidden: (props: TableWidgetProps, propertyPath: string) => {
      const columnType = get(props, `${propertyPath}.columnType`, "");
      const isEditable = get(props, `${propertyPath}.isEditable`, "");

      return columnType !== ColumnTypes.DATE || !isEditable;
    },
    children: [
      {
        propertyName: "firstDayOfWeek",
        label: tableV2Text("column.firstDayOfWeek"),
        helpText: tableV2Text("help.dateFirstDay"),
        controlType: "INPUT_TEXT",
        defaultValue: "0",
        inputType: "NUMBER",
        isBindProperty: true,
        isTriggerProperty: false,
        dependencies: ["primaryColumns", "columnType"],
        validation: {
          type: ValidationTypes.FUNCTION,
          params: {
            fnString: allowedFirstDayOfWeekRange.toString(),
            expected: {
              type: "0 : sunday\n1 : monday\n2 : tuesday\n3 : wednesday\n4 : thursday\n5 : friday\n6 : saturday",
              example: "0",
              autocompleteDataType: AutocompleteDataType.STRING,
            },
          },
        },
      },
      {
        propertyName: "shortcuts",
        label: tableV2Text("column.showShortcuts"),
        helpText: tableV2Text("help.dateShortcuts"),
        controlType: "SWITCH",
        isJSConvertible: false,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.BOOLEAN },
        dependencies: ["primaryColumns", "columnType"],
      },
    ],
  };
}
