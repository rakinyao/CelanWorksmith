import type { PropertyPaneConfig } from "constants/PropertyControlConstants";
import { ValidationTypes } from "constants/WidgetValidation";
import { EvaluationSubstitutionType } from "constants/EvaluationConstants";
import { AutocompleteDataType } from "utils/autocomplete/AutocompleteDataType";
import i18n from "i18n";
import type { TableWidgetProps } from "widgets/TableWidgetV2/constants";
import {
  INFINITE_SCROLL_ENABLED,
  InlineEditingSaveOptions,
} from "widgets/TableWidgetV2/constants";
import { composePropertyUpdateHook } from "widgets/WidgetUtils";
import {
  ALLOW_TABLE_WIDGET_SERVER_SIDE_FILTERING,
  CUSTOM_SORT_FUNCTION_ENABLED,
} from "../../constants";
import Widget from "../index";
import {
  tableDataValidation,
  totalRecordsCountValidation,
  uniqueColumnNameValidation,
  updateAllowAddNewRowOnInfiniteScrollChange,
  updateColumnOrderHook,
  updateCustomColumnAliasOnLabelChange,
  updateInlineEditingOptionDropdownVisibilityHook,
  updateInlineEditingSaveOptionHook,
  updateSearchSortFilterOnInfiniteScrollChange,
} from "../propertyUtils";
import { getTableV2ColumnPanelConfig } from "./PanelConfig";

const tableV2Text = (key: string) => i18n.t(`widgetProperty.tableV2.${key}`);

const getInfiniteScrollDisabledHelpText = () =>
  tableV2Text("help.infiniteScrollDisabled");

export function getTableV2ContentConfig(): PropertyPaneConfig[] {
  return [
    {
      sectionName: tableV2Text("content.data"),
      children: [
        {
          helpText: tableV2Text("help.tableData"),
          propertyName: "tableData",
          label: tableV2Text("content.tableData"),
          controlType: "ONE_CLICK_BINDING_CONTROL",
          controlConfig: {
            searchableColumn: true,
            maxHeight: "400px",
          },
          placeholderText: '[{ "name": "John" }]',
          inputType: "ARRAY",
          isBindProperty: true,
          isTriggerProperty: false,
          isJSConvertible: true,
          validation: {
            type: ValidationTypes.FUNCTION,
            params: {
              fn: tableDataValidation,
              expected: {
                type: "Array",
                example: `[{ "name": "John" }]`,
                autocompleteDataType: AutocompleteDataType.ARRAY,
              },
            },
          },
          evaluationSubstitutionType:
            EvaluationSubstitutionType.SMART_SUBSTITUTE,
          shouldSwitchToNormalMode: (
            isDynamic: boolean,
            isToggleDisabled: boolean,
            triggerFlag?: boolean,
          ) => triggerFlag && isDynamic && !isToggleDisabled,
        },
        {
          propertyName: "primaryColumns",
          controlType: "PRIMARY_COLUMNS_V2",
          label: tableV2Text("content.columns"),
          updateHook: composePropertyUpdateHook([
            updateColumnOrderHook,
            updateInlineEditingOptionDropdownVisibilityHook,
            updateCustomColumnAliasOnLabelChange,
          ]),
          dependencies: [
            "primaryColumns",
            "columnOrder",
            "childStylesheet",
            "inlineEditingSaveOption",
            "textColor",
            "textSize",
            "fontStyle",
            "cellBackground",
            "verticalAlignment",
            "horizontalAlignment",
          ],
          isBindProperty: false,
          isTriggerProperty: false,
          validation: {
            type: ValidationTypes.FUNCTION,
            params: {
              fn: uniqueColumnNameValidation,
              expected: {
                type: "Unique column names",
                example: "abc",
                autocompleteDataType: AutocompleteDataType.STRING,
              },
            },
          },
          panelConfig: getTableV2ColumnPanelConfig(),
        },
        {
          propertyName: "inlineEditingSaveOption",
          helpText: tableV2Text("help.updateMode"),
          label: tableV2Text("content.updateMode"),
          controlType: "ICON_TABS",
          defaultValue: InlineEditingSaveOptions.ROW_LEVEL,
          fullWidth: true,
          isBindProperty: true,
          isTriggerProperty: false,
          hidden: (props: TableWidgetProps) => {
            return (
              !props.showInlineEditingOptionDropdown &&
              !Object.values(props.primaryColumns).find(
                (column) => column.isEditable,
              )
            );
          },
          dependencies: [
            "primaryColumns",
            "columnOrder",
            "childStylesheet",
            "showInlineEditingOptionDropdown",
          ],
          options: [
            {
              label: tableV2Text("option.singleRow"),
              value: InlineEditingSaveOptions.ROW_LEVEL,
            },
            {
              label: tableV2Text("option.multiRow"),
              value: InlineEditingSaveOptions.CUSTOM,
            },
          ],
          updateHook: updateInlineEditingSaveOptionHook,
        },
        {
          helpText: tableV2Text("help.primaryKeyColumn"),
          propertyName: "primaryColumnId",
          dependencies: ["primaryColumns"],
          label: tableV2Text("help.primaryKeyColumn"),
          controlType: "PRIMARY_COLUMNS_DROPDOWN",
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
        },
      ],
      // Added this prop to indicate that data section needs to be expanded by default
      // Rest all sections needs to be collapsed
      // We already have a isDefaultOpen prop configured to keep a section expanded or not
      // but introducing new prop so that we can control is based on flag
      // Once we decide to keep this feature, we can go back to using isDefaultOpen and removeexpandedByDefault
      expandedByDefault: true,
    },
    {
      sectionName: tableV2Text("content.pagination"),
      children: [
        {
          propertyName: "isVisiblePagination",
          helpText: tableV2Text("help.showPagination"),
          label: tableV2Text("content.showPagination"),
          controlType: "SWITCH",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.BOOLEAN },
        },
        {
          helpText: tableV2Text("help.serverSidePagination"),
          propertyName: "serverSidePaginationEnabled",
          label: tableV2Text("content.serverSidePagination"),
          controlType: "SWITCH",
          isBindProperty: false,
          isTriggerProperty: false,
          shouldDisableSection: (props: TableWidgetProps) =>
            props.infiniteScrollEnabled,
          disabledHelpText: getInfiniteScrollDisabledHelpText(),
          dependencies: ["infiniteScrollEnabled"],
        },
        {
          helpText: tableV2Text("help.serverSidePagination"),
          propertyName: "infiniteScrollEnabled",
          label: tableV2Text("content.infiniteScroll"),
          controlType: "SWITCH",
          isBindProperty: false,
          isTriggerProperty: false,
          updateHook: composePropertyUpdateHook([
            updateAllowAddNewRowOnInfiniteScrollChange,
            updateSearchSortFilterOnInfiniteScrollChange,
          ]),
          dependencies: ["primaryColumns", "serverSidePaginationEnabled"],
          hidden: (props: TableWidgetProps) =>
            !Widget.getFeatureFlag(INFINITE_SCROLL_ENABLED) ||
            !props.serverSidePaginationEnabled,
        },
        {
          helpText: tableV2Text("help.totalRecords"),
          propertyName: "totalRecordsCount",
          label: tableV2Text("content.totalRecords"),
          controlType: "INPUT_TEXT",
          placeholderText: tableV2Text("placeholder.totalRecords"),
          isBindProperty: true,
          isTriggerProperty: false,
          validation: {
            type: ValidationTypes.FUNCTION,
            params: {
              fn: totalRecordsCountValidation,
              expected: {
                type: "Number",
                example: "10",
                autocompleteDataType: AutocompleteDataType.STRING,
              },
            },
          },
          hidden: (props: TableWidgetProps) =>
            !props.serverSidePaginationEnabled,
          dependencies: ["serverSidePaginationEnabled"],
        },
        {
          helpText: tableV2Text("help.onPageChange"),
          propertyName: "onPageChange",
          label: "onPageChange",
          controlType: "ACTION_SELECTOR",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: true,
          hidden: (props: TableWidgetProps) =>
            !props.serverSidePaginationEnabled,
          dependencies: ["serverSidePaginationEnabled"],
        },
        {
          helpText: tableV2Text("help.onPageSizeChange"),
          propertyName: "onPageSizeChange",
          label: "onPageSizeChange",
          controlType: "ACTION_SELECTOR",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: true,
          hidden: (props: TableWidgetProps) =>
            !props.serverSidePaginationEnabled,
          dependencies: ["serverSidePaginationEnabled"],
        },
      ],
      expandedByDefault: false,
    },
    {
      sectionName: tableV2Text("content.searchAndFilters"),
      shouldDisableSection: (props: TableWidgetProps) =>
        props.infiniteScrollEnabled,
      disabledHelpText: getInfiniteScrollDisabledHelpText(),
      dependencies: ["infiniteScrollEnabled"],
      children: [
        {
          propertyName: "isVisibleSearch",
          helpText: tableV2Text("help.allowSearching"),
          label: tableV2Text("content.allowSearching"),
          controlType: "SWITCH",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.BOOLEAN },
        },
        {
          propertyName: "enableClientSideSearch",
          label: tableV2Text("content.clientSideSearch"),
          helpText: tableV2Text("help.clientSideSearch"),
          controlType: "SWITCH",
          isBindProperty: false,
          isTriggerProperty: false,
          hidden: (props: TableWidgetProps) => !props.isVisibleSearch,
          dependencies: ["isVisibleSearch"],
        },
        {
          propertyName: "enableServerSideFiltering",
          label: tableV2Text("content.serverSideFiltering"),
          helpText: tableV2Text("help.serverSideFiltering"),
          controlType: "SWITCH",
          isBindProperty: false,
          isTriggerProperty: false,
          defaultValue: false,
          hidden: () =>
            !Widget.getFeatureFlag(ALLOW_TABLE_WIDGET_SERVER_SIDE_FILTERING),
        },
        {
          propertyName: "onTableFilterUpdate",
          label: "onTableFilterUpdate",
          helpText: tableV2Text("help.onTableFilterUpdate"),
          controlType: "ACTION_SELECTOR",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: true,
          hidden: (props: TableWidgetProps) => !props.enableServerSideFiltering,
          dependencies: ["enableServerSideFiltering"],
        },
        {
          propertyName: "defaultSearchText",
          label: tableV2Text("content.defaultSearchText"),
          helpText: tableV2Text("help.defaultSearchText"),
          controlType: "INPUT_TEXT",
          placeholderText: "{{appsmith.user.name}}",
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.TEXT },
          hidden: (props: TableWidgetProps) => !props.isVisibleSearch,
          dependencies: ["isVisibleSearch"],
        },
        {
          propertyName: "onSearchTextChanged",
          label: "onSearchTextChanged",
          helpText: tableV2Text("help.onSearchTextChanged"),
          controlType: "ACTION_SELECTOR",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: true,
          hidden: (props: TableWidgetProps) => !props.isVisibleSearch,
          dependencies: ["isVisibleSearch"],
        },
        {
          propertyName: "isVisibleFilters",
          helpText: tableV2Text("help.allowFiltering"),
          label: tableV2Text("content.allowFiltering"),
          controlType: "SWITCH",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.BOOLEAN },
        },
      ],
      expandedByDefault: false,
    },
    {
      sectionName: tableV2Text("content.rowSelection"),
      children: [
        {
          helpText: tableV2Text("help.defaultSelectedRows"),
          propertyName: "defaultSelectedRowIndices",
          label: tableV2Text("content.defaultSelectedRows"),
          controlType: "INPUT_TEXT",
          placeholderText: "[0]",
          isBindProperty: true,
          isTriggerProperty: false,
          validation: {
            type: ValidationTypes.ARRAY,
            params: {
              children: {
                type: ValidationTypes.NUMBER,
                params: {
                  min: -1,
                  default: -1,
                },
              },
            },
          },
          hidden: (props: TableWidgetProps) => {
            return !props.multiRowSelection;
          },
          dependencies: ["multiRowSelection"],
        },
        {
          helpText: tableV2Text("help.defaultSelectedRow"),
          propertyName: "defaultSelectedRowIndex",
          label: tableV2Text("content.defaultSelectedRow"),
          controlType: "INPUT_TEXT",
          defaultValue: 0,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: {
            type: ValidationTypes.NUMBER,
            params: {
              min: -1,
              default: -1,
            },
          },
          hidden: (props: TableWidgetProps) => {
            return props.multiRowSelection;
          },
          dependencies: ["multiRowSelection"],
        },
        {
          propertyName: "multiRowSelection",
          label: tableV2Text("content.enableMultiRowSelection"),
          helpText: tableV2Text("help.enableMultiRowSelection"),
          controlType: "SWITCH",
          isBindProperty: false,
          isTriggerProperty: false,
        },
        {
          helpText: tableV2Text("help.onRowSelected"),
          propertyName: "onRowSelected",
          label: "onRowSelected",
          controlType: "ACTION_SELECTOR",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: true,
        },
      ],
      expandedByDefault: false,
    },
    {
      sectionName: tableV2Text("content.sorting"),
      shouldDisableSection: (props: TableWidgetProps) =>
        props.infiniteScrollEnabled,
      disabledHelpText: getInfiniteScrollDisabledHelpText(),
      dependencies: ["infiniteScrollEnabled"],
      children: [
        {
          helpText: tableV2Text("help.columnSorting"),
          propertyName: "isSortable",
          isJSConvertible: true,
          label: tableV2Text("content.columnSorting"),
          controlType: "SWITCH",
          isBindProperty: true,
          isTriggerProperty: false,
          validation: {
            type: ValidationTypes.BOOLEAN,
            params: {
              default: true,
            },
          },
        },
        {
          helpText: tableV2Text("help.onSort"),
          propertyName: "onSort",
          label: "onSort",
          controlType: "ACTION_SELECTOR",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: true,
          hidden: (props: TableWidgetProps) => !props.isSortable,
          dependencies: ["isSortable"],
        },
        {
          helperText: tableV2Text("help.customSortFunctionHelper"),
          helpText: tableV2Text("help.customSortFunction"),
          propertyName: "customSortFunction",
          label: tableV2Text("content.customSortFunctionData"),
          controlType: "TABLE_CUSTOM_SORT",
          placeholderText:
            "{{(tableData, columnId, order) => { /* Return sorted table data */ }}}",
          controlConfig: {
            maxHeight: "400px",
            height: "100px",
          },
          isTriggerProperty: false,
          hidden: (props: TableWidgetProps) =>
            !props.isSortable ||
            !Widget.getFeatureFlag(CUSTOM_SORT_FUNCTION_ENABLED),
          dependencies: ["isSortable"],
        },
      ],
      expandedByDefault: false,
    },

    {
      sectionName: tableV2Text("content.addingRow"),
      shouldDisableSection: (props: TableWidgetProps) =>
        props.infiniteScrollEnabled,
      disabledHelpText: getInfiniteScrollDisabledHelpText(),
      dependencies: ["infiniteScrollEnabled"],
      children: [
        {
          propertyName: "allowAddNewRow",
          helpText: tableV2Text("help.allowAddingRow"),
          isJSConvertible: true,
          label: tableV2Text("content.allowAddingRow"),
          controlType: "SWITCH",
          isBindProperty: true,
          isTriggerProperty: false,
          validation: {
            type: ValidationTypes.BOOLEAN,
          },
        },
        {
          propertyName: "onAddNewRowSave",
          helpText: tableV2Text("help.onSave"),
          label: "onSave",
          controlType: "ACTION_SELECTOR",
          hidden: (props: TableWidgetProps) => {
            return !props.allowAddNewRow;
          },
          dependencies: ["allowAddNewRow", "primaryColumns"],
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: true,
          additionalAutoComplete: (props: TableWidgetProps) => {
            const newRow: Record<string, unknown> = {};

            if (props.primaryColumns) {
              Object.values(props.primaryColumns)
                .filter((column) => !column.isDerived)
                .forEach((column) => {
                  newRow[column.alias] = "";
                });
            }

            return {
              newRow,
            };
          },
        },
        {
          propertyName: "onAddNewRowDiscard",
          helpText: tableV2Text("help.onDiscard"),
          label: "onDiscard",
          controlType: "ACTION_SELECTOR",
          hidden: (props: TableWidgetProps) => {
            return !props.allowAddNewRow;
          },
          dependencies: ["allowAddNewRow"],
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: true,
        },
        {
          propertyName: "defaultNewRow",
          helpText: tableV2Text("help.defaultNewRow"),
          label: tableV2Text("content.defaultValues"),
          controlType: "INPUT_TEXT",
          dependencies: ["allowAddNewRow"],
          hidden: (props: TableWidgetProps) => {
            return !props.allowAddNewRow;
          },
          isBindProperty: true,
          isTriggerProperty: false,
          validation: {
            type: ValidationTypes.OBJECT,
            params: {
              default: {},
            },
          },
        },
      ],
      expandedByDefault: false,
    },
    {
      sectionName: tableV2Text("content.general"),
      children: [
        {
          helpText: tableV2Text("help.visible"),
          propertyName: "isVisible",
          isJSConvertible: true,
          label: tableV2Text("content.visible"),
          controlType: "SWITCH",
          isBindProperty: true,
          isTriggerProperty: false,
          validation: {
            type: ValidationTypes.BOOLEAN,
          },
        },
        {
          propertyName: "animateLoading",
          label: tableV2Text("content.animateLoading"),
          controlType: "SWITCH",
          helpText: tableV2Text("help.animateLoading"),
          defaultValue: true,
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.BOOLEAN },
        },
        {
          propertyName: "customIsLoading",
          label: tableV2Text("content.customLoadingState"),
          controlType: "SWITCH",
          helpText: tableV2Text("help.customLoadingState"),
          defaultValue: false,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.BOOLEAN },
        },
        {
          propertyName: "customIsLoadingValue",
          label: tableV2Text("content.isLoadingValue"),
          controlType: "INPUT_TEXT",
          defaultValue: "",
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.BOOLEAN },
          hidden: (props: TableWidgetProps) => !props.customIsLoading,
          dependencies: ["customIsLoading"],
        },
        {
          propertyName: "isVisibleDownload",
          helpText: tableV2Text("help.allowDownload"),
          label: tableV2Text("content.allowDownload"),
          controlType: "SWITCH",
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.BOOLEAN },
        },
        {
          propertyName: "canFreezeColumn",
          helpText: tableV2Text("help.allowColumnFreeze"),
          label: tableV2Text("content.allowColumnFreeze"),
          controlType: "SWITCH",
          defaultValue: true,
          isJSConvertible: true,
          isBindProperty: true,
          isTriggerProperty: false,
          validation: { type: ValidationTypes.BOOLEAN },
        },
        {
          propertyName: "delimiter",
          label: tableV2Text("content.csvSeparator"),
          controlType: "INPUT_TEXT",
          placeholderText: tableV2Text("placeholder.csvSeparator"),
          helpText: tableV2Text("help.csvSeparator"),
          isBindProperty: true,
          isTriggerProperty: false,
          defaultValue: ",",
          validation: {
            type: ValidationTypes.TEXT,
          },
          hidden: (props: TableWidgetProps) => !props.isVisibleDownload,
          dependencies: ["isVisibleDownload"],
        },
      ],
      expandedByDefault: false,
    },
  ] as PropertyPaneConfig[];
}
