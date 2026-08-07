import React, { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { DefaultRootState } from "react-redux";
import {
  celanworksmithObjectQueryRequested,
  type CelanworksmithObjectQueryRequest,
} from "actions/celanworksmithObjectQueryActions";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import { getCelanworksmithObjectQuery } from "selectors/celanworksmithObjectQuerySelectors";
import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithCurrentApplicationId,
} from "selectors/celanworksmithApplicationBindingSelectors";
import {
  createObjectTableQueryRequest,
  getObjectTableColumns,
  getObjectTableRows,
} from "../widget/objectTableUtils";
import { getObjectQueryKey } from "reducers/celanworksmithObjectQueryReducer";
import { normalizeObjectBinding } from "celanworksmith/widgets/objectBinding/normalizeObjectBinding";

interface ObjectTableModeProps {
  widgetId: string;
  objectTypeId?: string;
  objectFilter?: unknown;
  pageNo?: number;
  pageSize?: number;
  sortOrder?: { column: string; order: "asc" | "desc" | null };
  selectedRowIndex?: number;
  selectedRowIndices?: number[];
  multiRowSelection?: boolean;
  widgetType?: "TABLE_WIDGET" | "TABLE_WIDGET_V2";
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
  selectedRowIndices = [],
  sortOrder = DEFAULT_SORT_ORDER,
  updateWidgetMetaProperty,
  widgetId,
  widgetType = "TABLE_WIDGET",
}: ObjectTableModeProps) {
  const dispatch = useDispatch();
  const objectState = useSelector(getCelanworksmithObjectsState);
  const applicationId = useSelector(getCelanworksmithCurrentApplicationId);
  const bindingState = useSelector(getCelanworksmithApplicationBindingState);
  const bindingResolved =
    !applicationId ||
    (bindingState.applicationId === applicationId &&
      ["ready", "unbound"].includes(bindingState.status));
  const normalizedBinding = useMemo(
    () =>
      normalizeObjectBinding(
        widgetType,
        { dataMode: "OBJECT", objectFilter, objectTypeId },
        { types: objectState.types },
      ),
    [objectFilter, objectState.types, objectTypeId, widgetType],
  );
  const normalizedObjectTypeId = normalizedBinding.binding.objectTypeId;
  const metadata = normalizedObjectTypeId
    ? objectState.types[normalizedObjectTypeId]?.metadata
    : undefined;
  const metadataStatus = normalizedObjectTypeId
    ? objectState.types[normalizedObjectTypeId]?.status
    : undefined;
  const hasMetadataIssue = normalizedBinding.issues.some(
    (issue) => issue.code === "DELETED_OBJECT_TYPE",
  );
  const request = useMemo<CelanworksmithObjectQueryRequest | undefined>(
    () =>
      normalizedObjectTypeId && !normalizedBinding.issues.length
        ? createObjectTableQueryRequest(
            widgetId,
            normalizedObjectTypeId,
            pageNo,
            pageSize,
            sortOrder,
            normalizedBinding.binding.filter,
          )
        : undefined,
    [
      normalizedBinding.binding.filter,
      normalizedBinding.issues.length,
      normalizedObjectTypeId,
      pageNo,
      pageSize,
      sortOrder,
      widgetId,
    ],
  );
  const queryState = useSelector((state: DefaultRootState) =>
    request ? getCelanworksmithObjectQuery(state, request) : undefined,
  );
  const columns = getObjectTableColumns(metadata);
  const rows = getObjectTableRows(queryState?.result);
  const previousQueryKeyRef = useRef<string>();

  useEffect(() => {
    if (!request) {
      if (!normalizedObjectTypeId && previousQueryKeyRef.current) {
        previousQueryKeyRef.current = undefined;
        updateWidgetMetaProperty("selectedObject", undefined);
        updateWidgetMetaProperty("selectedObjects", []);
        updateWidgetMetaProperty("selectedRowIndex", -1);
        updateWidgetMetaProperty("selectedRowIndices", []);
      }

      return;
    }

    if (!bindingResolved) return;

    const queryKey = getObjectQueryKey(request);

    if (
      previousQueryKeyRef.current &&
      previousQueryKeyRef.current !== queryKey
    ) {
      updateWidgetMetaProperty("selectedObject", undefined);
      updateWidgetMetaProperty("selectedObjects", []);
      updateWidgetMetaProperty("selectedRowIndex", -1);
      updateWidgetMetaProperty("selectedRowIndices", []);
    }

    previousQueryKeyRef.current = queryKey;
    dispatch(celanworksmithObjectQueryRequested(request));
  }, [
    bindingResolved,
    dispatch,
    normalizedObjectTypeId,
    request,
    updateWidgetMetaProperty,
  ]);

  if (!normalizedObjectTypeId)
    return <div>Select an ontology object collection.</div>;

  if (hasMetadataIssue || !metadata) {
    if (objectState.status === "loading" || metadataStatus === "loading") {
      return <div>Loading object metadata...</div>;
    }

    return (
      <div role="alert">The selected ontology object type is unavailable.</div>
    );
  }

  if (!bindingResolved) return <div>Loading object data...</div>;

  if (queryState?.status === "error") {
    return (
      <div role="alert">
        {queryState.error?.message || "Unable to load objects."}
      </div>
    );
  }

  if (!queryState || queryState.status === "idle") {
    return <div>Loading objects...</div>;
  }

  if (queryState?.status === "loading" && !queryState.result) {
    return <div>Loading objects...</div>;
  }

  if (
    queryState?.status === "empty" ||
    (queryState?.status === "ready" && queryState.result?.items.length === 0)
  ) {
    return <div>No objects found.</div>;
  }

  const selectRow = (index: number) => {
    const selected = rows[index];
    const selectedObject = queryState.result?.items[index];

    if (!selected || !selectedObject) return;

    if (multiRowSelection) {
      const nextSelectedRowIndices = selectedRowIndices.includes(index)
        ? selectedRowIndices.filter(
            (selectedRowIndex) => selectedRowIndex !== index,
          )
        : [...selectedRowIndices, index];
      const nextSelectedObjects = nextSelectedRowIndices
        .map((selectedRowIndex) => queryState.result?.items[selectedRowIndex])
        .filter(
          (object): object is NonNullable<typeof object> =>
            object !== undefined,
        );

      updateWidgetMetaProperty(
        "selectedObject",
        nextSelectedObjects[nextSelectedObjects.length - 1],
      );
      updateWidgetMetaProperty("selectedObjects", nextSelectedObjects);
      updateWidgetMetaProperty("selectedRowIndices", nextSelectedRowIndices);

      return;
    }

    updateWidgetMetaProperty("selectedObject", selectedObject);
    updateWidgetMetaProperty("selectedObjects", [selectedObject]);
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
            <tr
              aria-selected={
                multiRowSelection
                  ? selectedRowIndices.includes(index)
                  : selectedRowIndex === index
              }
              key={String(row.id)}
            >
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
