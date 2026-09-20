import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import { get } from "lodash";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import {
  getBasePropertyPath,
  hideByColumnType,
  selectColumnOptionsValidation,
} from "../../propertyUtils";
import { TableSelectColumnOptionKeys } from "widgets/TableWidgetV2/component/Constants";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnSelectConfig() {
  return {
    sectionName: tableV2Text("menu.selectProperties"),
    hidden: (props: TableWidgetProps, propertyPath: string) => {
      return hideByColumnType(props, propertyPath, [ColumnTypes.SELECT], true);
    },
    children: [
      {
        propertyName: "selectOptions",
        helpText: tableV2Text("help.selectOptions"),
        label: tableV2Text("help.selectOptionsLabel"),
        controlType: "TABLE_COMPUTE_VALUE",
        isJSConvertible: false,
        isBindProperty: true,
        validation: {
          type: ValidationTypes.FUNCTION,
          params: {
            expected: {
              type: 'Array<{ "label": string | number, "value": string | number}>',
              example: '[{"label": "abc", "value": "abc"}]',
            },
            fnString: selectColumnOptionsValidation.toString(),
          },
        },
        isTriggerProperty: false,
        dependencies: ["primaryColumns"],
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [ColumnTypes.SELECT]);
        },
      },
      {
        propertyName: "sortBy",
        defaultValue: "value",
        helpText: tableV2Text("help.selectSortBy"),
        label: tableV2Text("help.selectSortByLabel"),
        controlType: "DROP_DOWN",
        isBindProperty: true,
        isJSConvertible: false,
        isTriggerProperty: false,
        options: [
          {
            label: tableV2Text("option.label"),
            value: TableSelectColumnOptionKeys.LABEL,
          },
          {
            label: tableV2Text("option.value"),
            value: TableSelectColumnOptionKeys.VALUE,
          },
        ],
        validation: {
          type: ValidationTypes.TEXT,
          params: {
            allowedValues: [
              TableSelectColumnOptionKeys.LABEL,
              TableSelectColumnOptionKeys.VALUE,
            ],
          },
        },
      },
      {
        propertyName: "allowSameOptionsInNewRow",
        defaultValue: true,
        helpText: tableV2Text("help.selectUseTopRow"),
        label: tableV2Text("help.selectUseTopRowLabel"),
        controlType: "SWITCH",
        isBindProperty: true,
        isJSConvertible: true,
        isTriggerProperty: false,
        hidden: (props: TableWidgetProps) => {
          return !props.allowAddNewRow;
        },
        dependencies: ["primaryColumns", "allowAddNewRow"],
        validation: { type: ValidationTypes.BOOLEAN },
      },
      {
        propertyName: "newRowSelectOptions",
        helpText: tableV2Text("help.selectNewRowOptions"),
        label: tableV2Text("help.selectNewRowOptionsLabel"),
        controlType: "INPUT_TEXT",
        isJSConvertible: false,
        isBindProperty: true,
        validation: {
          type: ValidationTypes.FUNCTION,
          params: {
            expected: {
              type: 'Array<{ "label": string | number, "value": string | number}>',
              example: '[{"label": "abc", "value": "abc"}]',
            },
            fnString: selectColumnOptionsValidation.toString(),
          },
        },
        isTriggerProperty: false,
        dependencies: ["primaryColumns", "allowAddNewRow"],
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);

          if (baseProperty) {
            const columnType = get(props, `${baseProperty}.columnType`, "");
            const allowSameOptionsInNewRow = get(
              props,
              `${baseProperty}.allowSameOptionsInNewRow`,
            );

            if (
              columnType === ColumnTypes.SELECT &&
              props.allowAddNewRow &&
              !allowSameOptionsInNewRow
            ) {
              return false;
            } else {
              return true;
            }
          }
        },
      },
      {
        propertyName: "placeholderText",
        helpText: tableV2Text("help.selectPlaceholder"),
        label: tableV2Text("help.selectPlaceholderLabel"),
        controlType: "INPUT_TEXT",
        placeholderText: tableV2Text("placeholder.placeholder"),
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.TEXT },
      },
      {
        propertyName: "isFilterable",
        label: tableV2Text("help.selectFilterableLabel"),
        helpText: tableV2Text("help.selectFilterable"),
        controlType: "SWITCH",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.BOOLEAN },
      },
      {
        propertyName: "resetFilterTextOnClose",
        label: tableV2Text("help.selectResetFilterLabel"),
        helpText: tableV2Text("help.selectResetFilter"),
        controlType: "SWITCH",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.BOOLEAN },
      },
      {
        propertyName: "serverSideFiltering",
        helpText: tableV2Text("help.selectServerFiltering"),
        label: tableV2Text("help.selectServerFilteringLabel"),
        controlType: "SWITCH",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: { type: ValidationTypes.BOOLEAN },
      },
    ],
  };
}
