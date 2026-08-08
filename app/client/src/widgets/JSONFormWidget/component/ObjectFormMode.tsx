import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { celanworksmithActionRun } from "actions/celanworksmithExecutionActions";
import {
  getCelanworksmithExecutionState,
  getCelanworksmithOntologyState,
} from "selectors/celanworksmithSelectors";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import { normalizeObjectData } from "widgets/ObjectDetailWidget/widget/objectDetailUtils";
import type { CelanworksmithProperty } from "api/CelanworksmithAPI";

interface ObjectFormModeProps {
  objectTypeId?: string;
  objectData?: unknown;
  actionId?: string;
  updateWidgetMetaProperty: (propertyName: string, value: unknown) => void;
}

const getInputType = (dataType: string) => {
  if (dataType === "BOOLEAN") return "checkbox";

  if (dataType === "INTEGER" || dataType === "DECIMAL") return "number";

  if (dataType === "DATETIME") return "datetime-local";

  return "text";
};

const SUPPORTED_DATA_TYPES = new Set([
  "STRING",
  "INTEGER",
  "DECIMAL",
  "BOOLEAN",
  "DATETIME",
  "ENUM",
  "REFERENCE",
]);

const getEnumValues = (property: CelanworksmithProperty, value: unknown) => {
  const configuredValues = (
    property as CelanworksmithProperty & {
      enumValues?: unknown;
    }
  ).enumValues;

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
  }, [isObjectBindingValid, status, updateWidgetMetaProperty, values]);

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

  const updateValue = (
    propertyId: string,
    dataType: string,
    value: string | boolean,
  ) => {
    dirtyRef.current = true;
    setValues((current) => ({
      ...current,
      [propertyId]: parseValue(dataType, value),
    }));
  };

  const submit = () => {
    const missing = metadata.properties.find(
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
    const actionRequest = celanworksmithActionRun(action.id, {
      objectTypeId: object.typeId,
      objectId: object.id,
      parameters: values,
    });

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
      {metadata.properties.map((property) => {
        if (!SUPPORTED_DATA_TYPES.has(property.dataType)) {
          return (
            <div key={property.id} role="alert">
              Unsupported data type: {property.dataType}
            </div>
          );
        }

        const inputType = getInputType(property.dataType);
        const value = values[property.id];
        const disabled = property.readOnly || property.derived;

        if (property.dataType === "ENUM") {
          const enumValues = getEnumValues(property, value);

          return (
            <label key={property.id}>
              {property.displayName}
              <select
                disabled={disabled}
                name={property.id}
                onChange={(event) =>
                  updateValue(
                    property.id,
                    property.dataType,
                    event.target.value,
                  )
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

        return (
          <label key={property.id}>
            {property.displayName}
            <input
              checked={inputType === "checkbox" ? Boolean(value) : undefined}
              disabled={disabled}
              name={property.id}
              onChange={(event) =>
                updateValue(
                  property.id,
                  property.dataType,
                  inputType === "checkbox"
                    ? event.target.checked
                    : event.target.value,
                )
              }
              required={property.required}
              type={inputType}
              value={inputType === "checkbox" ? undefined : String(value ?? "")}
            />
          </label>
        );
      })}
      <button
        disabled={!actionId || status === "queued" || status === "running"}
        type="submit"
      >
        {status === "queued" || status === "running"
          ? "Submitting..."
          : "Submit"}
      </button>
      {status === "failed" && (
        <div role="alert">
          {executionError?.message || "Submission failed."}
        </div>
      )}
      {status === "succeeded" && <div role="status">Submitted.</div>}
    </form>
  );
}
