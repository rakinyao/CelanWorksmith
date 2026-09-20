import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import i18n from "i18n";
import { ColumnTypes } from "widgets/TableWidgetV2/constants";
import { get } from "lodash";
import {
  getBasePropertyPath,
  showByColumnType,
  hideByColumnType,
  getColumnPath,
} from "../../propertyUtils";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnEventsConfig() {
  return {
    sectionName: tableV2Text("menu.events"),
    hidden: (props: TableWidgetProps, propertyPath: string) => {
      if (showByColumnType(props, propertyPath, [ColumnTypes.IMAGE], true)) {
        return false;
      } else {
        const columnType = get(props, `${propertyPath}.columnType`, "");
        const isEditable = get(props, `${propertyPath}.isEditable`, "");

        return (
          !(
            columnType === ColumnTypes.TEXT ||
            columnType === ColumnTypes.NUMBER ||
            columnType === ColumnTypes.CURRENCY ||
            columnType === ColumnTypes.CHECKBOX ||
            columnType === ColumnTypes.SWITCH ||
            columnType === ColumnTypes.SELECT ||
            columnType === ColumnTypes.DATE
          ) || !isEditable
        );
      }
    },
    children: [
      // Image onClick
      {
        propertyName: "onClick",
        label: "onClick",
        helpText: tableV2Text("help.onClick"),
        controlType: "ACTION_SELECTOR",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");

          return columnType !== ColumnTypes.IMAGE;
        },
        dependencies: ["primaryColumns", "columnOrder"],
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
      },
      {
        propertyName: "onSubmit",
        label: "onSubmit",
        helpText: tableV2Text("help.onSubmit"),
        controlType: "ACTION_SELECTOR",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");
          const isEditable = get(props, `${baseProperty}.isEditable`, "");

          return (
            !(
              columnType === ColumnTypes.TEXT ||
              columnType === ColumnTypes.NUMBER ||
              columnType === ColumnTypes.CURRENCY
            ) || !isEditable
          );
        },
        dependencies: ["primaryColumns", "inlineEditingSaveOption"],
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
      },
      {
        propertyName: "onOptionChange",
        label: "onOptionChange",
        helpText: tableV2Text("help.onOptionChange"),
        controlType: "ACTION_SELECTOR",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");
          const isEditable = get(props, `${baseProperty}.isEditable`, "");

          return columnType !== ColumnTypes.SELECT || !isEditable;
        },
        dependencies: ["primaryColumns"],
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
      },
      {
        propertyName: "onCheckChange",
        label: "onChange",
        helpText: tableV2Text("help.onChange"),
        controlType: "ACTION_SELECTOR",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [ColumnTypes.SWITCH]);
        },
        dependencies: ["primaryColumns"],
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
      },
      {
        propertyName: "onCheckChange",
        label: "onCheckChange",
        helpText: tableV2Text("help.onCheckChange"),
        controlType: "ACTION_SELECTOR",
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          return hideByColumnType(props, propertyPath, [ColumnTypes.CHECKBOX]);
        },
        dependencies: ["primaryColumns"],
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
      },
      {
        propertyName: "onFilterUpdate",
        helpText: tableV2Text("help.onFilterUpdate"),
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const baseProperty = getBasePropertyPath(propertyPath);
          const columnType = get(props, `${baseProperty}.columnType`, "");
          const isEditable = get(props, `${baseProperty}.isEditable`, "");
          const serverSideFiltering = get(
            props,
            `${baseProperty}.serverSideFiltering`,
            false,
          );

          return (
            columnType !== ColumnTypes.SELECT ||
            !isEditable ||
            !serverSideFiltering
          );
        },
        dependencies: ["primaryColumns"],
        label: "onFilterUpdate",
        controlType: "ACTION_SELECTOR",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
        additionalAutoComplete: () => ({
          filterText: "",
        }),
      },
      {
        propertyName: "onDateSelected",
        label: "onDateSelected",
        helpText: tableV2Text("help.onDateSelected"),
        controlType: "ACTION_SELECTOR",
        isJSConvertible: true,
        isBindProperty: true,
        isTriggerProperty: true,
        dependencies: ["primaryColumns"],
        hidden: (props: TableWidgetProps, propertyPath: string) => {
          const path = getColumnPath(propertyPath);

          return hideByColumnType(props, path, [ColumnTypes.DATE], true);
        },
      },
    ],
  };
}
