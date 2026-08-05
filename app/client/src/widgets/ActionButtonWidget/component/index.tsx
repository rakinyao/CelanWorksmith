import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { celanworksmithActionRun } from "actions/celanworksmithExecutionActions";
import {
  getCelanworksmithExecutionState,
  getCelanworksmithOntologyState,
} from "selectors/celanworksmithSelectors";
import { createActionRequest } from "../widget/actionButtonUtils";

export interface ActionButtonComponentProps {
  actionId?: string;
  objectData?: unknown;
  parameters?: unknown;
  label?: string;
  isDisabled?: boolean;
  updateWidgetMetaProperty: (propertyName: string, value: unknown) => void;
  updateWidgetProperty?: (propertyName: string, value: unknown) => void;
}

export default function ActionButtonComponent({
  actionId,
  isDisabled = false,
  label = "Run action",
  objectData,
  parameters,
  updateWidgetMetaProperty,
  updateWidgetProperty,
}: ActionButtonComponentProps) {
  const dispatch = useDispatch();
  const ontology = useSelector((state: DefaultRootState) =>
    getCelanworksmithOntologyState(state),
  );
  const execution = useSelector((state: DefaultRootState) =>
    getCelanworksmithExecutionState(state),
  );
  const action = ontology.actions.find(
    (candidate) => candidate.id === actionId,
  );
  const request = useMemo(
    () => createActionRequest(action, { objectData, parameters }),
    [action, objectData, parameters],
  );
  const actionState = actionId ? execution.actions[actionId] : undefined;
  const status = actionState?.meta.status || "idle";
  const isRunning = status === "queued" || status === "running";
  const isValid = !!actionId && !!request;

  useEffect(() => {
    updateWidgetMetaProperty("executionStatus", status);
    updateWidgetMetaProperty("lastResult", actionState?.data);
    updateWidgetMetaProperty("lastError", actionState?.meta.error);
    updateWidgetMetaProperty("requestId", actionState?.meta.requestId);
  }, [actionState, status, updateWidgetMetaProperty]);

  const run = () => {
    if (!actionId || !request || isRunning) return;

    dispatch(celanworksmithActionRun(actionId, request));
  };

  return (
    <div className="t--action-button-widget">
      {ontology.actions.length > 0 && (
        <select
          aria-label="Action type"
          disabled={!updateWidgetProperty}
          onChange={(event) =>
            updateWidgetProperty?.("actionId", event.target.value || undefined)
          }
          value={actionId || ""}
        >
          <option value="">Select an Action</option>
          {ontology.actions.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.displayName}
            </option>
          ))}
        </select>
      )}
      <button
        disabled={isDisabled || !isValid || isRunning}
        onClick={run}
        type="button"
      >
        {isRunning ? "Running..." : label}
      </button>
      {!isValid && <div role="alert">Select an Action and a valid object.</div>}
      {status === "failed" && (
        <div role="alert">
          {actionState?.meta.error?.message || "Action failed."}
        </div>
      )}
      {status === "succeeded" && <div role="status">Action completed.</div>}
    </div>
  );
}
