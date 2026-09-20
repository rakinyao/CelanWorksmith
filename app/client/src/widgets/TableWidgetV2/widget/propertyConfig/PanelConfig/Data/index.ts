import { ValidationTypes } from "constants/WidgetValidation";
import i18n from "i18n";
import { get } from "lodash";
import { AutocompleteDataType } from "utils/autocomplete/AutocompleteDataType";
import { CurrencyDropdownOptions } from "widgets/CurrencyInputWidget/component/CurrencyCodeDropdown";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import { ColumnTypes, DateInputFormat } from "widgets/TableWidgetV2/constants";
import {
  getBasePropertyPath,
  hideByColumnType,
  uniqueColumnAliasValidation,
} from "../../../propertyUtils";
import { getTableV2ColumnTypeConfig } from "./ColumnType";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

const getDateFormatOptions = () => [
  {
    label: tableV2Text("option.unixTimestampSeconds"),
    value: DateInputFormat.EPOCH,
  },
  {
    label: tableV2Text("option.unixTimestampMilliseconds"),
    value: DateInputFormat.MILLISECONDS,
  },
  { label: tableV2Text("option.yyyyMmDd"), value: "YYYY-MM-DD" },
  { label: tableV2Text("option.yyyyMmDdHm"), value: "YYYY-MM-DD HH:mm" },
  { label: tableV2Text("option.iso8601"), value: "YYYY-MM-DDTHH:mm:ss.SSSZ" },
  {
    label: tableV2Text("option.yyyyMmDdThhMmSs"),
    value: "YYYY-MM-DDTHH:mm:ss",
  },
  { label: tableV2Text("option.yyyyMmDdHhMmSs"), value: "YYYY-MM-DD hh:mm:ss" },
  { label: tableV2Text("option.doMmmYyyy"), value: "Do MMM YYYY" },
  { label: tableV2Text("option.ddMmYyyy"), value: "DD/MM/YYYY" },
  { label: tableV2Text("option.ddMmYyyyHm"), value: "DD/MM/YYYY HH:mm" },
  { label: tableV2Text("option.lll"), value: "LLL" },
  { label: tableV2Text("option.ll"), value: "LL" },
  { label: tableV2Text("option.dMmmmYyyy"), value: "D MMMM, YYYY" },
  { label: tableV2Text("option.hMmADdMmmmYyyy"), value: "H:mm A D MMMM, YYYY" },
  { label: tableV2Text("option.mmDdYyyy"), value: "MM-DD-YYYY" },
  { label: tableV2Text("option.ddMmYyyyHyphen"), value: "DD-MM-YYYY" },
  { label: tableV2Text("option.mmDdYyyySlash"), value: "MM/DD/YYYY" },
  { label: tableV2Text("option.ddMmYyyy"), value: "DD/MM/YYYY" },
  { label: tableV2Text("option.ddMmYy"), value: "DD/MM/YY" },
  { label: tableV2Text("option.mmDdYy"), value: "MM/DD/YY" },
];

export function getTableV2ColumnDataConfig() {
  return {
    sectionName: tableV2Text("column.data"),
    children: [
      getTableV2ColumnTypeConfig(),
      {
        helpText: tableV2Text("help.propertyName"),
        propertyName: "alias",
        label: tableV2Text("column.propertyName"),
        controlType: "INPUT_TEXT",
        helperText: () => tableV2Text("help.columnAliasChange"),
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const columnId = propertyPath.match(/primaryColumns\.(.*)\.alias/);
          let isDerivedProperty = false;

          if (columnId && columnId[1] && props.primaryColumns[columnId[1]]) {
            isDerivedProperty = props.primaryColumns[columnId[1]].isDerived;
          }

          return (
            !isDerivedProperty ||
            hideByColumnType(props, propertyPath, [
              ColumnTypes.DATE,
              ColumnTypes.IMAGE,
              ColumnTypes.NUMBER,
              ColumnTypes.CURRENCY,
              ColumnTypes.TEXT,
              ColumnTypes.VIDEO,
              ColumnTypes.URL,
            ])
          );
        },
        dependencies: ["primaryColumns"],
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.FUNCTION,
          params: {
            expected: {
              type: "string",
              example: "abc",
              autocompleteDataType: AutocompleteDataType.STRING,
            },
            fnString: uniqueColumnAliasValidation.toString(),
          },
        },
      },
      {
        propertyName: "displayText",
        label: tableV2Text("column.displayText"),
        helpText: tableV2Text("help.displayText"),
        controlType: "TABLE_COMPUTE_VALUE",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");

          return columnType !== "url";
        },
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: false,
        isTriggerProperty: false,
      },
      {
        helpText: tableV2Text("help.computedValue"),
        propertyName: "computedValue",
        label: tableV2Text("column.computedValue"),
        controlType: "TABLE_COMPUTE_VALUE",
        additionalControlData: {
          isArrayValue: true,
        },
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [
            ColumnTypes.DATE,
            ColumnTypes.IMAGE,
            ColumnTypes.NUMBER,
            ColumnTypes.TEXT,
            ColumnTypes.VIDEO,
            ColumnTypes.URL,
            ColumnTypes.CHECKBOX,
            ColumnTypes.SWITCH,
            ColumnTypes.SELECT,
            ColumnTypes.CURRENCY,
            ColumnTypes.HTML,
          ]);
        },
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        isTriggerProperty: false,
      },
      {
        propertyName: "inputFormat",
        label: tableV2Text("column.dateFormat"),
        helpText: tableV2Text("help.dateFormat"),
        controlType: "DROP_DOWN",
        options: getDateFormatOptions(),
        defaultValue: "YYYY-MM-DD HH:mm",
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");

          return columnType !== ColumnTypes.DATE;
        },
        dependencies: ["primaryColumns", "columnOrder"],
        isBindProperty: true,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
          },
        },
        isTriggerProperty: false,
      },
      {
        propertyName: "outputFormat",
        label: tableV2Text("column.displayFormat"),
        helpText: tableV2Text("help.displayFormat"),
        controlType: "DROP_DOWN",
        customJSControl: "TABLE_COMPUTE_VALUE",
        isJSConvertible: true,
        options: getDateFormatOptions(),
        defaultValue: "YYYY-MM-DD HH:mm",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");

          return columnType !== ColumnTypes.DATE;
        },
        dependencies: ["primaryColumns", "columnType"],
        isBindProperty: true,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
          },
        },
        isTriggerProperty: false,
      },
      {
        helpText: tableV2Text("help.currency"),
        propertyName: "currencyCode",
        label: tableV2Text("column.currency"),
        enableSearch: true,
        dropdownHeight: "156px",
        controlType: "DROP_DOWN",
        customJSControl: "TABLE_COMPUTE_VALUE",
        searchPlaceholderText: tableV2Text("placeholder.currencySearch"),
        options: CurrencyDropdownOptions,
        virtual: true,
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
            params: {
              default: "USD",
              required: true,
              allowedValues: CurrencyDropdownOptions.map(
                (option) => option.value,
              ),
            },
          },
        },
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");

          return columnType !== ColumnTypes.CURRENCY;
        },
        dependencies: ["primaryColumns", "columnType"],
      },
      {
        helpText: tableV2Text("help.decimalsAllowed"),
        propertyName: "decimals",
        label: tableV2Text("column.decimalsAllowed"),
        controlType: "DROP_DOWN",
        options: [
          {
            label: tableV2Text("option.zero"),
            value: 0,
          },
          {
            label: tableV2Text("option.one"),
            value: 1,
          },
          {
            label: tableV2Text("option.two"),
            value: 2,
          },
        ],
        isJSConvertible: false,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.NUMBER,
          params: {
            min: 0,
            max: 2,
            default: 0,
            required: true,
          },
        },
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");

          return columnType !== ColumnTypes.CURRENCY;
        },
        dependencies: ["primaryColumns", "columnType"],
      },
      {
        propertyName: "thousandSeparator",
        helpText: tableV2Text("help.currencyThousandSeparator"),
        label: tableV2Text("column.thousandSeparator"),
        controlType: "SWITCH",
        customJSControl: "TABLE_COMPUTE_VALUE",
        dependencies: ["primaryColumns", "columnType"],
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.BOOLEAN,
          },
        },
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");

          return columnType !== ColumnTypes.CURRENCY;
        },
      },
      {
        propertyName: "notation",
        helpText: tableV2Text("help.notation"),
        label: tableV2Text("column.notation"),
        controlType: "DROP_DOWN",
        customJSControl: "TABLE_COMPUTE_VALUE",
        options: [
          {
            label: tableV2Text("option.standard"),
            value: "standard",
          },
          {
            label: tableV2Text("option.compact"),
            value: "compact",
          },
        ],
        dependencies: ["primaryColumns", "columnType"],
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: false,
        validation: {
          type: ValidationTypes.ARRAY_OF_TYPE_OR_TYPE,
          params: {
            type: ValidationTypes.TEXT,
            params: {
              default: "standard",
              allowedValues: ["standard", "compact"],
            },
          },
        },
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");

          return columnType !== ColumnTypes.CURRENCY;
        },
      },
    ],
  };
}
