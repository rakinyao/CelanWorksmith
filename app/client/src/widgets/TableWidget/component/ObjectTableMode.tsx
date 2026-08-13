import React, { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { isEqual, isNumber } from "lodash";
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
  getObjectTablePrimaryColumns,
  getObjectTableReactColumns,
  getObjectTableRows,
} from "../widget/objectTableUtils";
import { getObjectQueryKey } from "reducers/celanworksmithObjectQueryReducer";
import { normalizeObjectBinding } from "celanworksmith/widgets/objectBinding/normalizeObjectBinding";
import ReactTableComponent from "../component";
import type { ReactTableComponentProps } from "../component/Constants";
import { CompactModeTypes } from "../component/Constants";
import { updateWidgetPropertyRequest } from "actions/controlActions";

interface ObjectTableModeProps extends ReactTableComponentProps {
  widgetId: string;
  objectTypeId?: string;
  objectFilter?: unknown;
  pageNo?: number;
  pageSize?: number;
  sortOrder?: { column: string; order: "asc" | "desc" | null };
  primaryColumns?: Record<string, Record<string, unknown>>;
  columnOrder?: string[];
  widgetType?: "TABLE_WIDGET" | "TABLE_WIDGET_V2";
  updateWidgetMetaProperty: (propertyName: string, value: unknown) => void;
}

const DEFAULT_SORT_ORDER = {
  column: "",
  order: null as "asc" | "desc" | null,
};

export default function ObjectTableMode({
  objectFilter,
  objectTypeId,
  pageNo = 1,
  pageSize = 10,
  sortOrder = DEFAULT_SORT_ORDER,
  updateWidgetMetaProperty,
  widgetId,
  widgetType = "TABLE_WIDGET",
  ...tableProps
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
  const normalizedPageNo = Number.isInteger(pageNo) && pageNo > 0 ? pageNo : 1;
  const normalizedPageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  const request = useMemo<CelanworksmithObjectQueryRequest | undefined>(
    () =>
      normalizedObjectTypeId && !normalizedBinding.issues.length
        ? createObjectTableQueryRequest(
            widgetId,
            normalizedObjectTypeId,
            normalizedPageNo,
            normalizedPageSize,
            sortOrder,
            normalizedBinding.binding.filter,
            applicationId || undefined,
            tableProps.searchText,
          )
        : undefined,
    [
      normalizedBinding.binding.filter,
      normalizedBinding.issues.length,
      applicationId,
      normalizedObjectTypeId,
      normalizedPageNo,
      normalizedPageSize,
      sortOrder,
      tableProps.searchText,
      widgetId,
    ],
  );
  const queryState = useSelector((state: DefaultRootState) =>
    request ? getCelanworksmithObjectQuery(state, request) : undefined,
  );
  const rows = getObjectTableRows(queryState?.result);
  const reactColumns = useMemo(
    () =>
      getObjectTableReactColumns(
        metadata,
        tableProps.primaryColumns,
        tableProps.columnOrder,
      ),
    [metadata, tableProps.columnOrder, tableProps.primaryColumns],
  );
  const previousQueryKeyRef = useRef<string>();

  useEffect(() => {
    if (!metadata) return;

    const primaryColumns = getObjectTablePrimaryColumns(
      metadata,
      tableProps.primaryColumns,
      tableProps.widgetName,
    );
    const currentColumns = tableProps.primaryColumns || {};
    const hasColumnChanges = Object.entries(primaryColumns).some(
      ([columnId, column]) => !isEqual(currentColumns[columnId], column),
    );
    const columnOrder = tableProps.columnOrder || [];
    const nextColumnOrder = [
      ...columnOrder.filter((columnId) => currentColumns[columnId]),
      ...Object.keys(primaryColumns).filter(
        (columnId) => !columnOrder.includes(columnId),
      ),
    ];
    const hasColumnOrderChanges = !isEqual(columnOrder, nextColumnOrder);

    if (!hasColumnChanges && !hasColumnOrderChanges) return;

    if (hasColumnChanges) {
      dispatch(
        updateWidgetPropertyRequest(widgetId, "primaryColumns", {
          ...currentColumns,
          ...primaryColumns,
        }),
      );
    }

    if (hasColumnOrderChanges) {
      dispatch(
        updateWidgetPropertyRequest(widgetId, "columnOrder", nextColumnOrder),
      );
    }
  }, [
    dispatch,
    metadata,
    tableProps.columnOrder,
    tableProps.primaryColumns,
    tableProps.widgetName,
    widgetId,
  ]);

  useEffect(
    function dispatchObjectQuery() {
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
    },
    [
      bindingResolved,
      dispatch,
      normalizedObjectTypeId,
      request,
      updateWidgetMetaProperty,
    ],
  );

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

  const updatePageNo = (nextPageNo: number) => {
    updateWidgetMetaProperty("pageNo", Math.max(1, nextPageNo));
  };

  const updateSortOrder = (column: string, asc: boolean) => {
    updateWidgetMetaProperty(
      "sortOrder",
      column
        ? { column, order: asc ? "asc" : "desc" }
        : { column: "", order: null },
    );
  };

  const selectAllRows = (
    pageRows: Array<{ original: Record<string, unknown>; index: number }>,
  ) => {
    const selectedRowIndices = pageRows.map((row) => row.index);
    const selectedObjects = pageRows
      .map((row) => row.original.__object)
      .filter(
        (object): object is NonNullable<typeof object> => object !== undefined,
      );

    updateWidgetMetaProperty("selectedRowIndices", selectedRowIndices);
    updateWidgetMetaProperty("selectedObjects", selectedObjects);
    updateWidgetMetaProperty(
      "selectedObject",
      selectedObjects[selectedObjects.length - 1],
    );
  };

  const clearAllRows = () => {
    updateWidgetMetaProperty("selectedRowIndex", -1);
    updateWidgetMetaProperty("selectedRowIndices", []);
    updateWidgetMetaProperty("selectedObject", undefined);
    updateWidgetMetaProperty("selectedObjects", []);
  };

  // Render the native ReactTableComponent for both TABLE_WIDGET and TABLE_WIDGET_V2.
  const handleRowClick = (
    rowData: Record<string, unknown>,
    rowIndex: number,
  ) => {
    const selectedObject =
      rowData && typeof rowData === "object" ? rowData.__object : undefined;

    if (tableProps.multiRowSelection) {
      const currentIndices = Array.isArray(tableProps.selectedRowIndices)
        ? [...tableProps.selectedRowIndices]
        : [];

      if (currentIndices.includes(rowIndex)) {
        currentIndices.splice(currentIndices.indexOf(rowIndex), 1);
      } else {
        currentIndices.push(rowIndex);
      }

      const selectedObjects = currentIndices
        .map((index) => {
          const data = rows[index];

          return data && typeof data === "object" ? data.__object : undefined;
        })
        .filter(
          (object): object is NonNullable<typeof object> =>
            object !== undefined,
        );

      updateWidgetMetaProperty("selectedRowIndices", currentIndices);
      updateWidgetMetaProperty("selectedObjects", selectedObjects);
      updateWidgetMetaProperty(
        "selectedObject",
        selectedObjects[selectedObjects.length - 1],
      );
    } else {
      const currentIndex = isNumber(tableProps.selectedRowIndex)
        ? tableProps.selectedRowIndex
        : -1;

      if (currentIndex !== rowIndex) {
        updateWidgetMetaProperty("selectedRowIndex", rowIndex);

        if (selectedObject !== undefined) {
          updateWidgetMetaProperty("selectedObject", selectedObject);
          updateWidgetMetaProperty("selectedObjects", [selectedObject]);
        }
      } else {
        updateWidgetMetaProperty("selectedRowIndex", -1);
        updateWidgetMetaProperty("selectedObject", undefined);
        updateWidgetMetaProperty("selectedObjects", []);
      }
    }

    tableProps.onRowClick?.(rowData, rowIndex);
  };

  if (widgetType === "TABLE_WIDGET" || widgetType === "TABLE_WIDGET_V2") {
    return (
      <ReactTableComponent
        {...tableProps}
        applyFilter={(filters) => updateWidgetMetaProperty("filters", filters)}
        columns={reactColumns}
        compactMode={tableProps.compactMode || CompactModeTypes.DEFAULT}
        disableDrag={() => undefined}
        handleReorderColumn={(columnOrder) =>
          updateWidgetMetaProperty("columnOrder", columnOrder)
        }
        handleResizeColumn={(columnSizeMap) =>
          updateWidgetMetaProperty("columnSizeMap", columnSizeMap)
        }
        height={tableProps.componentHeight || tableProps.height || 1}
        isLoading={!!tableProps.isLoading}
        nextPageClick={() => updatePageNo(normalizedPageNo + 1)}
        onRowClick={handleRowClick}
        pageNo={normalizedPageNo}
        pageSize={normalizedPageSize}
        prevPageClick={() => updatePageNo(normalizedPageNo - 1)}
        searchKey={tableProps.searchText || ""}
        searchTableData={(searchKey) => {
          updateWidgetMetaProperty("pageNo", 1);
          updateWidgetMetaProperty("searchText", String(searchKey ?? ""));
        }}
        selectAllRow={selectAllRows}
        serverSidePaginationEnabled
        sortTableColumn={updateSortOrder}
        tableData={rows}
        totalRecordsCount={queryState?.result?.total ?? 0}
        unSelectAllRow={clearAllRows}
        updatePageNo={updatePageNo}
        width={tableProps.componentWidth || tableProps.width || 1}
      />
    );
  }
}
