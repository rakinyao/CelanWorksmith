import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { celanworksmithActionRun } from "actions/celanworksmithExecutionActions";
import {
  getCelanworksmithExecutionState,
  getCelanworksmithOntologyState,
} from "selectors/celanworksmithSelectors";
import { getCelanworksmithCurrentApplicationId } from "selectors/celanworksmithApplicationBindingSelectors";
import { getActionExecutionErrorLabel } from "celanworksmith/actionExecutionFeedback";
import { validateActionBinding } from "../widget/actionButtonUtils";

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
  const applicationId = useSelector(getCelanworksmithCurrentApplicationId);
  const action = ontology.actions.find(
    (candidate) => candidate.id === actionId,
  );
  const validation = useMemo(
    () => validateActionBinding(action, { objectData, parameters }),
    [action, objectData, parameters],
  );
  const request = validation.request;
  const [localRequestId, setLocalRequestId] = useState<string>();
  const [pendingConfirmation, setPendingConfirmation] = useState<
    | {
        actionId: string;
        applicationId?: string;
        label: string;
        request: NonNullable<typeof request>;
      }
    | undefined
  >();
  const actionState = actionId ? execution.actions[actionId] : undefined;
  const requestState = localRequestId
    ? execution.requests[localRequestId]
    : undefined;
  const isCurrentActionState =
    !!localRequestId && actionState?.meta.requestId === localRequestId;
  const status =
    requestState?.status ||
    (isCurrentActionState ? actionState?.meta.status : undefined) ||
    "idle";
  const result = isCurrentActionState ? actionState?.data : undefined;
  const error =
    requestState?.error ||
    (isCurrentActionState ? actionState?.meta.error : undefined);
  const progress =
    requestState?.progress ||
    (isCurrentActionState ? actionState?.meta.progress : undefined) ||
    0;
  const executionId =
    (isCurrentActionState ? actionState?.meta.executionId : undefined) ||
    (result && typeof result.executionId === "string"
      ? result.executionId
      : undefined);
  const isRunning =
    status === "queued" ||
    status === "running" ||
    actionState?.meta.status === "queued" ||
    actionState?.meta.status === "running";
  const isValid = !!actionId && validation.valid && !!request;

  useEffect(() => {
    updateWidgetMetaProperty("executionStatus", status);
    updateWidgetMetaProperty("lastResult", result);
    updateWidgetMetaProperty("lastError", error);
    updateWidgetMetaProperty("requestId", localRequestId);
    updateWidgetMetaProperty("executionId", executionId);
    updateWidgetMetaProperty("executionProgress", progress);
  }, [
    error,
    executionId,
    localRequestId,
    progress,
    result,
    status,
    updateWidgetMetaProperty,
  ]);

  const dispatchAction = (
    actionIdToRun: string,
    requestToRun: NonNullable<typeof request>,
    applicationIdToRun = applicationId || undefined,
  ) => {
    if (isRunning) return;

    const actionRequest = celanworksmithActionRun(
      actionIdToRun,
      requestToRun,
      undefined,
      applicationIdToRun,
    );

    setLocalRequestId(actionRequest.payload.requestId);
    dispatch(actionRequest);
  };

  const run = () => {
    if (!actionId || !request || isRunning) return;

    if (action?.requiresConfirmation) {
      setPendingConfirmation({
        actionId,
        applicationId: applicationId || undefined,
        label: action.displayName,
        request,
      });

      return;
    }

    dispatchAction(actionId, request);
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
      {!isValid && (
        <div role="alert">
          {validation.error || "Select an Action and a valid object."}
        </div>
      )}
      {pendingConfirmation && (
        <div aria-modal="true" role="alertdialog">
          <p>Run {pendingConfirmation.label}?</p>
          <button
            onClick={() => setPendingConfirmation(undefined)}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const confirmation = pendingConfirmation;

              setPendingConfirmation(undefined);
              dispatchAction(
                confirmation.actionId,
                confirmation.request,
                confirmation.applicationId,
              );
            }}
            type="button"
          >
            Confirm
          </button>
        </div>
      )}
      {status === "failed" && (
        <div role="alert">
          {getActionExecutionErrorLabel(error)}:{" "}
          {error?.message || "Action failed."}
        </div>
      )}
      {status === "succeeded" && <div role="status">Action completed.</div>}
      {localRequestId && (
        <div aria-live="polite">
          <div>Request ID: {localRequestId}</div>
          <div>Progress: {progress}%</div>
          {executionId && <div>Execution ID: {executionId}</div>}
        </div>
      )}
    </div>
  );
}
