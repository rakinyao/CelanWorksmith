import TableWidgetV2 from "widgets/TableWidgetV2/widget";
import type { TableWidgetProps as TableWidgetV2Props } from "widgets/TableWidgetV2/constants";
import ObjectTableMode from "../component/ObjectTableMode";
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

test("new Table and TableV2 widgets default to Object data mode", () => {
  expect(TableWidget.getDefaults().dataMode).toBe("OBJECT");
  expect(TableWidgetV2.getDefaults().dataMode).toBe("OBJECT");
});

test("legacy and explicit Query Table DSLs retain native rendering and values", () => {
  const legacyTable = new TableWidget(queryTableProps);
  const explicitQueryTable = new TableWidget({
    ...queryTableProps,
    dataMode: "QUERY",
  });

  expect(legacyTable.getWidgetView().type).not.toBe(ObjectTableMode);
  expect(explicitQueryTable.getWidgetView().type).not.toBe(ObjectTableMode);
  expect(legacyTable.props.tableData).toEqual([{ id: "native-row" }]);
  expect(explicitQueryTable.props.tableData).toEqual([{ id: "native-row" }]);
});

test("mode changes keep the inactive Query and Object user values", () => {
  const objectFilter = {
    conditions: [],
    typeId: "PurchaseOrder",
    version: 1,
  };
  const objectTable = new TableWidget({
    ...queryTableProps,
    dataMode: "OBJECT",
    objectFilter,
    objectTypeId: "PurchaseOrder",
  });
  const queryTable = new TableWidget({
    ...objectTable.props,
    dataMode: "QUERY",
  });

  expect(queryTable.props.tableData).toEqual([{ id: "native-row" }]);
  expect(queryTable.props.objectTypeId).toBe("PurchaseOrder");
  expect(queryTable.props.objectFilter).toEqual(objectFilter);
});

test("Table config uses the shared stable ontology object selector", () => {
  const objectTypeControl = TableWidget.getPropertyPaneConfig()
    .find((section) => section.sectionName === "CelanWorksmith Object data")
    ?.children?.find((control) => control.propertyName === "objectTypeId");

  expect(objectTypeControl).toMatchObject({
    controlType: "CELANWORKSMITH_OBJECT_TYPE",
    helpText: "Select the ontology object collection that supplies table rows.",
    isBindProperty: false,
    label: "Ontology Object / 本体对象",
  });
});

test("TableV2 keeps a legacy DSL in Query mode", () => {
  const legacyTable = new TableWidgetV2({
    ...queryTableProps,
  } as unknown as TableWidgetV2Props);

  expect(legacyTable.getWidgetView().type).not.toBe(ObjectTableMode);
  expect(legacyTable.props.tableData).toEqual([{ id: "native-row" }]);
});
