import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { DefaultRootState } from "react-redux";
import {
  celanworksmithObjectQueryRequested,
  type CelanworksmithObjectQueryRequest,
} from "actions/celanworksmithObjectQueryActions";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import { getCelanworksmithObjectQuery } from "selectors/celanworksmithObjectQuerySelectors";
import {
  createObjectTableQueryRequest,
  getObjectTableColumns,
  getObjectTableRows,
} from "../widget/objectTableUtils";

interface ObjectTableModeProps {
  widgetId: string;
  objectTypeId?: string;
  objectFilter?: unknown;
  pageNo?: number;
  pageSize?: number;
  sortOrder?: { column: string; order: "asc" | "desc" | null };
  selectedRowIndex?: number;
  multiRowSelection?: boolean;
  updateWidgetMetaProperty: (propertyName: string, value: unknown) => void;
}

const DEFAULT_SORT_ORDER = {
  column: "",
  order: null as "asc" | "desc" | null,
};

export default function ObjectTableMode({
  multiRowSelection = false,
  objectFilter,
  objectTypeId,
  pageNo = 1,
  pageSize = 10,
  selectedRowIndex = -1,
  sortOrder = DEFAULT_SORT_ORDER,
  updateWidgetMetaProperty,
  widgetId,
}: ObjectTableModeProps) {
  const dispatch = useDispatch();
  const objectState = useSelector(getCelanworksmithObjectsState);
  const metadata = objectTypeId
    ? objectState.types[objectTypeId]?.metadata
    : undefined;
  const request = useMemo<CelanworksmithObjectQueryRequest | undefined>(
    () =>
      objectTypeId
        ? createObjectTableQueryRequest(
            widgetId,
            objectTypeId,
            pageNo,
            pageSize,
            sortOrder,
            objectFilter,
          )
        : undefined,
    [objectFilter, objectTypeId, pageNo, pageSize, sortOrder, widgetId],
  );
  const queryState = useSelector((state: DefaultRootState) =>
    request ? getCelanworksmithObjectQuery(state, request) : undefined,
  );
  const columns = getObjectTableColumns(metadata);
  const rows = getObjectTableRows(queryState?.result);

  useEffect(() => {
    if (request) dispatch(celanworksmithObjectQueryRequested(request));
  }, [dispatch, request]);

  if (!objectTypeId) return <div>Select an Object Type.</div>;

  if (queryState?.status === "error") {
    return (
      <div role="alert">
        {queryState.error?.message || "Unable to load objects."}
      </div>
    );
  }

  if (queryState?.status === "loading" && !queryState.result) {
    return <div>Loading objects...</div>;
  }

  const selectRow = (index: number) => {
    const selected = rows[index];
    const selectedObject = queryState?.result?.items[index];

    if (!selected || !selectedObject) return;

    updateWidgetMetaProperty("selectedObject", selectedObject);
    updateWidgetMetaProperty(
      "selectedObjects",
      multiRowSelection ? [selectedObject] : [selectedObject],
    );
    updateWidgetMetaProperty("selectedRowIndex", index);
  };

  const sortColumn = (column: string) => {
    const order =
      sortOrder.column === column && sortOrder.order === "asc" ? "desc" : "asc";

    updateWidgetMetaProperty("sortOrder", { column, order });
    updateWidgetMetaProperty("pageNo", 1);
  };

  const hasNextPage =
    !!queryState?.result && pageNo * pageSize < queryState.result.total;

  return (
    <div className="t--object-table-mode">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id}>
                <button onClick={() => sortColumn(column.id)} type="button">
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr aria-selected={selectedRowIndex === index} key={String(row.id)}>
              {columns.map((column) => (
                <td key={column.id}>
                  <button onClick={() => selectRow(index)} type="button">
                    {String(row[column.id] ?? "-")}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        disabled={pageNo <= 1}
        onClick={() => updateWidgetMetaProperty("pageNo", pageNo - 1)}
        type="button"
      >
        Previous
      </button>
      <button
        disabled={!hasNextPage}
        onClick={() => updateWidgetMetaProperty("pageNo", pageNo + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}
