import React, { useEffect, useRef } from "react";
import ObjectSetBinding from "./ObjectSetBinding";
import { getObjectSetListRows } from "./objectSetUtils";

interface ObjectCollectionModeProps {
  children: (
    rows: Array<Record<string, unknown>>,
    isLoading: boolean,
  ) => React.ReactElement;
  objectTypeId?: string;
  onRowsChange?: (rows: Array<Record<string, unknown>>) => void;
  widgetId: string;
  widgetType: string;
}

interface ObjectCollectionRowsProps {
  children: ObjectCollectionModeProps["children"];
  isLoading: boolean;
  onRowsChange?: ObjectCollectionModeProps["onRowsChange"];
  publishRows: boolean;
  rows: Array<Record<string, unknown>>;
}

function ObjectCollectionRows({
  children,
  isLoading,
  onRowsChange,
  publishRows,
  rows,
}: ObjectCollectionRowsProps) {
  const lastPublishedRowsKey = useRef<string>();
  const rowsKey = JSON.stringify(rows);

  useEffect(
    function publishRows() {
      if (publishRows && lastPublishedRowsKey.current !== rowsKey) {
        onRowsChange?.(rows);
        lastPublishedRowsKey.current = rowsKey;
      }
    },
    [onRowsChange, publishRows, rows, rowsKey],
  );

  return children(rows, isLoading);
}

export default function ObjectCollectionMode({
  children,
  objectTypeId,
  onRowsChange,
  widgetId,
  widgetType,
}: ObjectCollectionModeProps) {
  return (
    <ObjectSetBinding
      objectTypeId={objectTypeId}
      widgetId={widgetId}
      widgetType={widgetType}
    >
      {(binding) => {
        if (binding.status === "typeMismatch") {
          return <div role="alert">The Object binding is incompatible.</div>;
        }

        if (binding.status === "permissionDenied") {
          return <div role="alert">Access to object data is denied.</div>;
        }

        if (binding.status === "error") {
          return (
            <div role="alert">
              {binding.error?.message || "Unable to load objects."}
            </div>
          );
        }

        return (
          <ObjectCollectionRows
            isLoading={binding.status === "loading"}
            onRowsChange={onRowsChange}
            publishRows={
              binding.status === "ready" || binding.status === "empty"
            }
            rows={getObjectSetListRows(binding.result)}
          >
            {children}
          </ObjectCollectionRows>
        );
      }}
    </ObjectSetBinding>
  );
}
