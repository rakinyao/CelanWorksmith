import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { celanworksmithActionRun } from "actions/celanworksmithExecutionActions";
import {
  getCelanworksmithExecutionState,
  getCelanworksmithOntologyState,
} from "selectors/celanworksmithSelectors";
import { getCelanworksmithCurrentApplicationId } from "selectors/celanworksmithApplicationBindingSelectors";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import { normalizeObjectData } from "widgets/ObjectDetailWidget/widget/objectDetailUtils";
import type { CelanworksmithProperty } from "api/CelanworksmithAPI";
import {
  getDefaultFieldControl,
  getFieldLayout,
  isFieldEditable,
} from "celanworksmith/fieldMetadataLayout";
import { getActionExecutionErrorLabel } from "celanworksmith/actionExecutionFeedback";

interface ObjectFormModeProps {
  objectTypeId?: string;
  objectData?: unknown;
  actionId?: string;
  updateWidgetMetaProperty: (propertyName: string, value: unknown) => void;
}

const getEnumValues = (property: CelanworksmithProperty, value: unknown) => {
  const configuredValues = property.enumValues;

  const currentValue =
    typeof value === "string" && value.length > 0 ? value : undefined;

  if (
    Array.isArray(configuredValues) &&
    configuredValues.every((candidate) => typeof candidate === "string")
  ) {
    return currentValue && !configuredValues.includes(currentValue)
      ? [...configuredValues, currentValue]
      : configuredValues;
  }

  return currentValue ? [currentValue] : [];
};

const isPermissionError = (code: string | undefined) =>
  ["FORBIDDEN", "PERMISSION_DENIED", "UNAUTHORIZED"].includes(code || "");

const parseValue = (dataType: string, value: string | boolean) => {
  if (dataType === "INTEGER") return value === "" ? "" : Number(value);

  if (dataType === "DECIMAL") return value === "" ? "" : Number(value);

  return value;
};

export default function ObjectFormMode({
  actionId,
  objectData,
  objectTypeId,
  updateWidgetMetaProperty,
}: ObjectFormModeProps) {
  const dispatch = useDispatch();
  const objectsState = useSelector(getCelanworksmithObjectsState);
  const ontology = useSelector((state: DefaultRootState) =>
    getCelanworksmithOntologyState(state),
  );
  const execution = useSelector((state: DefaultRootState) =>
    getCelanworksmithExecutionState(state),
  );
  const applicationId = useSelector(getCelanworksmithCurrentApplicationId);
  const object = useMemo(() => normalizeObjectData(objectData), [objectData]);
  const objectTypeState = objectTypeId
    ? objectsState.types[objectTypeId]
    : undefined;
  const metadata = objectTypeState?.metadata;
  const metadataStatus = objectTypeState?.status || objectsState.status;
  const metadataError = objectTypeState?.error || objectsState.error;
  const [localRequestId, setLocalRequestId] = useState<string>();
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
  const executionError =
    requestState?.error ||
    (isCurrentActionState ? actionState?.meta.error : undefined);
  const actionResult = isCurrentActionState ? actionState?.data : undefined;
  const executionProgress =
    requestState?.progress ||
    (isCurrentActionState ? actionState?.meta.progress : undefined) ||
    0;
  const executionId =
    (isCurrentActionState ? actionState?.meta.executionId : undefined) ||
    (actionResult && typeof actionResult.executionId === "string"
      ? actionResult.executionId
      : undefined);
  const isActionRunning =
    status === "queued" ||
    status === "running" ||
    actionState?.meta.status === "queued" ||
    actionState?.meta.status === "running";
  const action = ontology.actions.find(
    (candidate) => candidate.id === actionId,
  );
  const [values, setValues] = useState<Record<string, unknown>>(
    object?.properties || {},
  );
  const dirtyRef = useRef(false);
  const objectIdentity = object ? `${object.typeId}/${object.id}` : undefined;
  const formIdentity = `${objectIdentity || ""}/${actionId || ""}`;
  const isObjectBindingValid =
    !!objectTypeId && !!object && object.typeId === objectTypeId && !!metadata;
  const previousFormIdentityRef = useRef(formIdentity);
  const previousStatusRef = useRef(status);

  useEffect(() => {
    if (previousFormIdentityRef.current !== formIdentity) {
      previousFormIdentityRef.current = formIdentity;
      dirtyRef.current = false;
      setLocalRequestId(undefined);
      setValues(object?.properties || {});
    } else if (!dirtyRef.current) {
      setValues(object?.properties || {});
    }
  }, [formIdentity, object, objectIdentity]);

  useEffect(() => {
    if (previousStatusRef.current !== "succeeded" && status === "succeeded") {
      dirtyRef.current = false;
      setValues(object?.properties || {});
    }

    previousStatusRef.current = status;
  }, [object, status]);

  useEffect(() => {
    updateWidgetMetaProperty("formData", values);
    updateWidgetMetaProperty("isValid", isObjectBindingValid);
    updateWidgetMetaProperty("executionStatus", status);
    updateWidgetMetaProperty("lastResult", actionResult);
    updateWidgetMetaProperty("lastError", executionError);
    updateWidgetMetaProperty("requestId", localRequestId);
    updateWidgetMetaProperty("executionId", executionId);
    updateWidgetMetaProperty("executionProgress", executionProgress);
  }, [
    actionResult,
    executionError,
    executionId,
    executionProgress,
    isObjectBindingValid,
    localRequestId,
    status,
    updateWidgetMetaProperty,
    values,
  ]);

  if (!objectTypeId) {
    return <div role="alert">Select an Object Type.</div>;
  }

  if (!object) {
    return <div role="alert">Select an Object instance.</div>;
  }

  if (object.typeId !== objectTypeId) {
    return (
      <div role="alert">
        Object data does not match the configured Object Type.
      </div>
    );
  }

  if (!metadata) {
    if (metadataStatus === "loading" || metadataStatus === "idle") {
      return <div>Loading Object Type metadata...</div>;
    }

    if (isPermissionError(metadataError?.code)) {
      return (
        <div role="alert">Permission denied to access this Object Type.</div>
      );
    }

    return (
      <div role="alert">
        {metadataError?.message || "The selected Object Type is unavailable."}
      </div>
    );
  }

  const fieldLayout = getFieldLayout(metadata.properties, {
    includeDerived: true,
  });
  const visibleProperties = fieldLayout.flatMap((group) => group.properties);

  const updateValue = (
    property: CelanworksmithProperty,
    value: string | boolean,
  ) => {
    if (!isFieldEditable(property)) return;

    dirtyRef.current = true;
    setValues((current) => ({
      ...current,
      [property.id]: parseValue(property.dataType, value),
    }));
  };

  const submit = () => {
    if (isActionRunning) return;

    const missing = visibleProperties.find(
      (property) =>
        property.required &&
        (values[property.id] === undefined || values[property.id] === ""),
    );

    if (
      missing ||
      !object ||
      objectTypeId !== object.typeId ||
      !action ||
      action.objectTypeId !== object.typeId
    ) {
      updateWidgetMetaProperty("isValid", false);

      return;
    }

    updateWidgetMetaProperty("isValid", true);
    const actionRequest = celanworksmithActionRun(
      action.id,
      {
        objectTypeId: object.typeId,
        objectId: object.id,
        parameters: values,
      },
      undefined,
      applicationId || undefined,
    );

    setLocalRequestId(actionRequest.payload.requestId);
    dispatch(actionRequest);
  };

  return (
    <form
      className="t--object-form-mode"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {fieldLayout.map((group) => (
        <fieldset key={group.id}>
          <legend>{group.label}</legend>
          {group.properties.map((property) => {
            const control = getDefaultFieldControl(property.dataType);

            if (!control) {
              return (
                <div key={property.id} role="alert">
                  Unsupported data type: {property.dataType}
                </div>
              );
            }

            const value = values[property.id];
            const disabled = !isFieldEditable(property);

            if (control === "select") {
              const enumValues = getEnumValues(property, value);

              return (
                <label key={property.id}>
                  {property.displayName}
                  <select
                    disabled={disabled}
                    name={property.id}
                    onChange={(event) =>
                      updateValue(property, event.target.value)
                    }
                    required={property.required}
                    value={String(value ?? "")}
                  >
                    {!property.required && <option value="" />}
                    {!enumValues.length && (
                      <option disabled value="">
                        No values available
                      </option>
                    )}
                    {enumValues.map((enumValue) => (
                      <option key={enumValue} value={enumValue}>
                        {enumValue}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            const inputType = control === "reference" ? "text" : control;

            return (
              <label key={property.id}>
                {property.displayName}
                <input
                  checked={
                    inputType === "checkbox" ? Boolean(value) : undefined
                  }
                  disabled={disabled}
                  name={property.id}
                  onChange={(event) =>
                    updateValue(
                      property,
                      inputType === "checkbox"
                        ? event.target.checked
                        : event.target.value,
                    )
                  }
                  required={property.required}
                  type={inputType}
                  value={
                    inputType === "checkbox" ? undefined : String(value ?? "")
                  }
                />
              </label>
            );
          })}
        </fieldset>
      ))}
      <button disabled={!actionId || isActionRunning} type="submit">
        {isActionRunning ? "Submitting..." : "Submit"}
      </button>
      {status === "failed" && (
        <div role="alert">
          {getActionExecutionErrorLabel(executionError)}:{" "}
          {executionError?.message || "Submission failed."}
        </div>
      )}
      {status === "succeeded" && <div role="status">Submitted.</div>}
      {localRequestId && (
        <div aria-live="polite">
          <div>Request ID: {localRequestId}</div>
          <div>Progress: {executionProgress}%</div>
          {executionId && <div>Execution ID: {executionId}</div>}
        </div>
      )}
    </form>
  );
}
