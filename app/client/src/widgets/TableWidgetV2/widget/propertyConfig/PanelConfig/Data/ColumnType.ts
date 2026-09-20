import {
  ColumnTypes,
  type TableWidgetProps,
} from "widgets/TableWidgetV2/constants";
import { composePropertyUpdateHook } from "widgets/WidgetUtils";

import {
  showByColumnType,
  updateCurrencyDefaultValues,
  updateMenuItemsSource,
  updateNumberColumnTypeTextAlignment,
  updateThemeStylesheetsInColumns,
} from "../../../propertyUtils";
import i18n from "i18n";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

export function getTableV2ColumnTypeOptions() {
  return [
    {
      label: tableV2Text("option.button"),
      value: ColumnTypes.BUTTON,
    },
    {
      label: tableV2Text("option.checkbox"),
      value: ColumnTypes.CHECKBOX,
    },
    {
      label: tableV2Text("option.currency"),
      value: ColumnTypes.CURRENCY,
    },
    {
      label: tableV2Text("column.date"),
      value: ColumnTypes.DATE,
    },
    {
      label: tableV2Text("option.html"),
      value: ColumnTypes.HTML,
    },
    {
      label: tableV2Text("option.iconButton"),
      value: ColumnTypes.ICON_BUTTON,
    },
    {
      label: tableV2Text("option.image"),
      value: ColumnTypes.IMAGE,
    },
    {
      label: tableV2Text("option.menuButton"),
      value: ColumnTypes.MENU_BUTTON,
    },
    {
      label: tableV2Text("option.number"),
      value: ColumnTypes.NUMBER,
    },
    {
      label: tableV2Text("option.plainText"),
      value: ColumnTypes.TEXT,
    },
    {
      label: tableV2Text("option.select"),
      value: ColumnTypes.SELECT,
    },
    {
      label: tableV2Text("option.switch"),
      value: ColumnTypes.SWITCH,
    },
    {
      label: tableV2Text("column.url"),
      value: ColumnTypes.URL,
    },
    {
      label: tableV2Text("option.video"),
      value: ColumnTypes.VIDEO,
    },
  ];
}

export function getTableV2ColumnTypeConfig() {
  return {
    propertyName: "columnType",
    label: tableV2Text("column.columnType"),
    helpText: tableV2Text("help.columnType"),
    controlType: "DROP_DOWN",
    options: getTableV2ColumnTypeOptions(),
    updateHook: composePropertyUpdateHook([
      updateNumberColumnTypeTextAlignment,
      updateThemeStylesheetsInColumns,
      updateMenuItemsSource,
      updateCurrencyDefaultValues,
    ]),
    dependencies: ["primaryColumns", "columnOrder", "childStylesheet"],
    isBindProperty: false,
    isTriggerProperty: false,
    hidden: (props: TableWidgetProps, propertyPath: string) =>
      showByColumnType(props, propertyPath, [ColumnTypes.EDIT_ACTIONS]),
  };
}
