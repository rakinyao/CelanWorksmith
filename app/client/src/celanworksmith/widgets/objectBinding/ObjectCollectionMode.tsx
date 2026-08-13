import React, { useEffect, useRef } from "react";
import ObjectBindingState from "./ObjectBindingState";
import ObjectSetBinding from "./ObjectSetBinding";
import { getObjectSetListRows } from "./objectSetUtils";

interface ObjectCollectionModeProps {
  children: (
    rows: Array<Record<string, unknown>>,
    isLoading: boolean,
  ) => React.ReactElement;
  objectTypeId?: string;
  actionId?: string;
  aggregationVariableName?: string;
  linkTypeId?: string;
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
  actionId,
  aggregationVariableName,
  children,
  linkTypeId,
  objectTypeId,
  onRowsChange,
  widgetId,
  widgetType,
}: ObjectCollectionModeProps) {
  return (
    <ObjectSetBinding
      actionId={actionId}
      aggregationVariableName={aggregationVariableName}
      linkTypeId={linkTypeId}
      objectTypeId={objectTypeId}
      widgetId={widgetId}
      widgetType={widgetType}
    >
      {(binding) => {
        if (binding.status === "typeMismatch") {
          return (
            <ObjectBindingState
              diagnostic={binding.diagnostic?.message}
              status="typeMismatch"
            />
          );
        }

        if (binding.status === "permissionDenied") {
          return <ObjectBindingState status="permissionDenied" />;
        }

        if (binding.status === "error") {
          return (
            <ObjectBindingState
              errorMessage={binding.error?.message}
              status="error"
            />
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
