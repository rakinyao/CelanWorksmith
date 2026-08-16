import type { TableWidgetProps } from "../constants";
import TableWidget from ".";

const queryTableProps = {
  filteredTableData: [],
  isVisibleDownload: true,
  isVisibleFilters: true,
  isVisiblePagination: true,
  isVisibleSearch: true,
  pageSize: 10,
  primaryColumns: {},
  totalRecordsCount: 0,
  tableData: [{ id: "native-row" }],
  widgetId: "Table1",
  widgetName: "Table1",
  updateWidgetMetaProperty: jest.fn(),
} as unknown as TableWidgetProps;

test("Table defaults to the native Query/Table configuration", () => {
  const defaults = TableWidget.getDefaults() as Record<string, unknown>;

  expect(defaults.dataMode).toBeUndefined();
  expect(defaults.objectTypeId).toBeUndefined();
  expect(defaults.objectFilter).toBeUndefined();
  expect(TableWidget.getPropertyPaneConfig()).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sectionName: "CelanWorksmith Object data" }),
    ]),
  );
});

test("Table keeps native rendering for persisted widget data", () => {
  const table = new TableWidget({
    ...queryTableProps,
    tableData: [{ id: "persisted-native-row" }],
  });

  expect(table.props.tableData).toEqual([{ id: "persisted-native-row" }]);
  expect(table.getWidgetView()).toBeDefined();
});

test("Table renders native array rows from the evaluated filtered data", () => {
  const table = new TableWidget({
    ...queryTableProps,
    filteredTableData: [{ id: "native-row" }],
    tableColumns: [
      {
        id: "id",
        label: "ID",
        columnType: "text",
        isVisible: true,
      },
    ],
  });

  const widgetView = table.getWidgetView();

  expect(widgetView.props.children.props.tableData).toEqual([
    { id: "native-row" },
  ]);
});

test("Table forwards native empty, loading, columns, and pagination state", () => {
  const table = new TableWidget({
    ...queryTableProps,
    filteredTableData: [],
    isLoading: true,
    pageNo: 2,
    pageSize: 10,
    totalRecordsCount: 11,
    selectedRowIndex: 1,
    selectedRowIndices: [1],
    multiRowSelection: true,
    tableColumns: [
      {
        id: "id",
        label: "ID",
        columnType: "text",
        isVisible: true,
        isCellVisible: true,
      },
    ],
  });

  const tableComponentProps = table.getWidgetView().props.children.props;

  expect(tableComponentProps.tableData).toEqual([]);
  expect(tableComponentProps.columns).toEqual([
    expect.objectContaining({ accessor: "id", Header: "ID" }),
  ]);
  expect(tableComponentProps.isLoading).toBe(true);
  expect(tableComponentProps.pageNo).toBe(2);
  expect(tableComponentProps.pageSize).toBe(10);
  expect(tableComponentProps.totalRecordsCount).toBe(11);
  expect(tableComponentProps.selectedRowIndex).toBe(1);
  expect(tableComponentProps.selectedRowIndices).toEqual([1]);
});
