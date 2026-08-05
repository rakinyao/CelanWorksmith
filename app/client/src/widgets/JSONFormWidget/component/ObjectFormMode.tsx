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
  const metadata = objectTypeId
    ? objectsState.types[objectTypeId]?.metadata
    : undefined;
  const [values, setValues] = useState<Record<string, unknown>>(
    object?.properties || {},
  );
  const dirtyRef = useRef(false);
  const actionState = actionId ? execution.actions[actionId] : undefined;
  const status = actionState?.meta.status || "idle";
  const action = ontology.actions.find(
    (candidate) => candidate.id === actionId,
  );

  useEffect(() => {
    if (!dirtyRef.current) setValues(object?.properties || {});
  }, [object]);

  useEffect(() => {
    updateWidgetMetaProperty("formData", values);
    updateWidgetMetaProperty("isValid", true);
    updateWidgetMetaProperty("executionStatus", status);
  }, [status, updateWidgetMetaProperty, values]);

  if (!objectTypeId || !metadata) return <div>Select an Object Type.</div>;

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
      !action ||
      action.objectTypeId !== object.typeId
    ) {
      updateWidgetMetaProperty("isValid", false);

      return;
    }

    updateWidgetMetaProperty("isValid", true);
    dispatch(
      celanworksmithActionRun(action.id, {
        objectTypeId: object.typeId,
        objectId: object.id,
        parameters: values,
      }),
    );
  };

  return (
    <form
      className="t--object-form-mode"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {metadata.properties
        .filter((property) => !property.derived)
        .map((property) => {
          const inputType = getInputType(property.dataType);
          const value = values[property.id];

          return (
            <label key={property.id}>
              {property.displayName}
              <input
                checked={inputType === "checkbox" ? Boolean(value) : undefined}
                disabled={property.readOnly}
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
                value={
                  inputType === "checkbox" ? undefined : String(value ?? "")
                }
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
          {actionState?.meta.error?.message || "Submission failed."}
        </div>
      )}
      {status === "succeeded" && <div role="status">Submitted.</div>}
    </form>
  );
}
