import type {
  CelanworksmithObjectQuery,
  CelanworksmithObjectSet,
  CelanworksmithObjectType,
} from "api/CelanworksmithAPI";
import type { CelanworksmithObjectQueryRequest } from "actions/celanworksmithObjectQueryActions";
import type { ReactTableColumnProps } from "../component/Constants";
import { ColumnTypes } from "../component/Constants";
import React from "react";

export interface ObjectTableColumn {
  id: string;
  label: string;
  dataType: string;
}

export const getObjectTableColumns = (
  metadata: CelanworksmithObjectType | undefined,
): ObjectTableColumn[] => [
  { id: "id", label: "ID", dataType: "STRING" },
  ...(metadata?.properties || []).map((property) => ({
    id: property.id,
    label: property.displayName,
    dataType: property.dataType,
  })),
];

export const getObjectTableRows = (
  result?: CelanworksmithObjectSet,
): Array<Record<string, unknown>> =>
  (result?.items || []).map((item) => ({
    id: item.id,
    typeId: item.typeId,
    __object: item,
    ...item.properties,
  }));

const mapDataTypeToColumnType = (dataType: string): string => {
  switch (dataType) {
    case "INTEGER":
    case "DECIMAL":
      return ColumnTypes.NUMBER;
    case "DATETIME":
      return ColumnTypes.DATE;
    case "BOOLEAN":
      return ColumnTypes.TEXT;
    case "STRING":
    default:
      return ColumnTypes.TEXT;
  }
};

const getNativeTableComputedValue = (widgetName: string, columnId: string) =>
  `{{(() => { const tableData = ${widgetName}.processedTableData || []; return tableData.length > 0 ? tableData.map((currentRow) => (currentRow[${JSON.stringify(
    columnId,
  )}])) : ${JSON.stringify(columnId)} })()}}`;

const isLegacyObjectTableComputedValue = (value: unknown, columnId: string) =>
  value === `{{currentRow["${columnId}"]}}`;

export const getObjectTableReactColumns = (
  metadata: CelanworksmithObjectType | undefined,
  primaryColumns?: Record<string, Record<string, unknown>>,
  columnOrder?: string[],
): ReactTableColumnProps[] => {
  const sourceColumns = getObjectTableColumns(metadata);
  const order = new Map((columnOrder || []).map((id, index) => [id, index]));

  return sourceColumns
    .sort(
      (left, right) =>
        (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
        left.id.localeCompare(right.id),
    )
    .map(
      (column, index): ReactTableColumnProps => ({
        Header:
          (primaryColumns?.[column.id]?.label as string | undefined) ||
          column.label ||
          column.id,
        accessor: column.id,
        width:
          typeof primaryColumns?.[column.id]?.width === "number"
            ? (primaryColumns[column.id].width as number)
            : 150,
        minWidth: 60,
        draggable: true,
        isHidden: primaryColumns?.[column.id]?.isVisible === false,
        metaProperties: {
          isHidden: primaryColumns?.[column.id]?.isVisible === false,
          type: mapDataTypeToColumnType(column.dataType),
          format: "",
          inputFormat: "",
        },
        isDerived: false,
        columnProperties: {
          id: column.id,
          alias: column.id,
          label:
            (primaryColumns?.[column.id]?.label as string | undefined) ||
            column.label ||
            column.id,
          originalId: column.id,
          columnType: mapDataTypeToColumnType(column.dataType),
          isVisible: primaryColumns?.[column.id]?.isVisible !== false,
          isDisabled: false,
          index,
          width:
            typeof primaryColumns?.[column.id]?.width === "number"
              ? (primaryColumns[column.id].width as number)
              : 150,
          enableFilter: true,
          enableSort: true,
          isDerived: false,
          computedValue: `{{currentRow["${column.id}"]}}`,
          buttonVariant: "PRIMARY",
          borderRadius: "0.375rem",
          boxShadow: "none",
          menuItems: [],
          isCellVisible: true,
          ...primaryColumns?.[column.id],
        } as ReactTableColumnProps["columnProperties"],
        Cell: (props) => (
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {String(props.cell.value ?? "-")}
          </div>
        ),
      }),
    );
};

export const getObjectTablePrimaryColumns = (
  metadata: CelanworksmithObjectType | undefined,
  existingColumns?: Record<string, Record<string, unknown>>,
  widgetName = "Table",
): Record<string, unknown> => {
  const sourceColumns = [
    { id: "id", label: "ID", dataType: "STRING" },
    ...(metadata?.properties || []).map((property) => ({
      id: property.id,
      label: property.displayName,
      dataType: property.dataType,
    })),
  ];

  const entries = sourceColumns.map((column, index) => {
    const columnType = mapDataTypeToColumnType(column.dataType);
    const existingColumn = existingColumns?.[column.id];
    const computedValue = isLegacyObjectTableComputedValue(
      existingColumn?.computedValue,
      column.id,
    )
      ? getNativeTableComputedValue(widgetName, column.id)
      : existingColumn?.computedValue ??
        getNativeTableComputedValue(widgetName, column.id);

    return [
      column.id,
      {
        index,
        width: 150,
        id: column.id,
        horizontalAlignment: "LEFT",
        verticalAlignment: "CENTER",
        columnType,
        label: column.label || column.id,
        isVisible: true,
        isDisabled: false,
        enableFilter: true,
        enableSort: true,
        isDerived: false,
        buttonVariant: "PRIMARY",
        borderRadius: "0.375rem",
        boxShadow: "none",
        menuItems: [],
        isCellVisible: true,
        ...existingColumn,
        alias: column.id,
        computedValue,
        originalId: column.id,
      },
    ];
  });

  return Object.fromEntries(entries);
};

export const createObjectTableQueryRequest = (
  widgetId: string,
  typeId: string,
  pageNo: number,
  pageSize: number,
  sortOrder: { column: string; order: "asc" | "desc" | null },
  filter?: unknown,
  applicationId?: string,
  searchText?: string,
): CelanworksmithObjectQueryRequest => {
  const normalizedPageNo = Number.isInteger(pageNo) && pageNo > 0 ? pageNo : 1;
  const normalizedPageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const query: CelanworksmithObjectQuery = {
    offset: (normalizedPageNo - 1) * normalizedPageSize,
    limit: normalizedPageSize,
  };

  if (sortOrder.column && sortOrder.order) {
    query.sortBy = sortOrder.column;
    query.sortDirection = sortOrder.order;
  }

  if (filter && typeof filter === "object") {
    query.filter = filter as Record<string, unknown>;
  }

  if (searchText?.trim()) query.searchText = searchText.trim();

  return {
    widgetId,
    typeId,
    query,
    ...(applicationId ? { applicationId } : {}),
  };
};
