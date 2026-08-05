import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import {
  buildFilter,
  FILTER_OPERATORS,
  type FilterCondition,
  type FilterOperator,
} from "../widget/filterUtils";

export interface FilterListComponentProps {
  initialConditions?: FilterCondition[];
  initialObjectTypeId?: string;
  updateWidgetMetaProperty: (propertyName: string, value: unknown) => void;
}

const EMPTY_CONDITIONS: FilterCondition[] = [];

const createCondition = (): FilterCondition => ({
  propertyId: "",
  operator: "equals",
  value: "",
});

const getValue = (dataType: string | undefined, value: string) => {
  if (dataType === "INTEGER") return value === "" ? "" : Number(value);

  if (dataType === "DECIMAL") return value === "" ? "" : Number(value);

  return value;
};

export default function FilterListComponent({
  initialConditions = EMPTY_CONDITIONS,
  initialObjectTypeId,
  updateWidgetMetaProperty,
}: FilterListComponentProps) {
  const objectsState = useSelector((state: DefaultRootState) =>
    getCelanworksmithObjectsState(state),
  );
  const [objectTypeId, setObjectTypeId] = useState(initialObjectTypeId || "");
  const [conditions, setConditions] =
    useState<FilterCondition[]>(initialConditions);
  const conditionsRef = useRef(conditions);

  conditionsRef.current = conditions;
  const metadata = objectsState.types[objectTypeId]?.metadata;
  const result = useMemo(
    () => buildFilter(metadata, conditions),
    [conditions, metadata],
  );

  useEffect(() => {
    const nextObjectTypeId = initialObjectTypeId || "";

    if (nextObjectTypeId !== objectTypeId) setObjectTypeId(nextObjectTypeId);
  }, [initialObjectTypeId, objectTypeId]);

  useEffect(() => {
    const nextConditions = initialConditions || [];

    if (
      JSON.stringify(nextConditions) !== JSON.stringify(conditionsRef.current)
    ) {
      setConditions(nextConditions);
    }
  }, [initialConditions]);

  useEffect(() => {
    updateWidgetMetaProperty("objectTypeId", objectTypeId || undefined);
    updateWidgetMetaProperty("filter", result.filter);
    updateWidgetMetaProperty("isValid", result.isValid);
  }, [objectTypeId, result, updateWidgetMetaProperty]);

  const objectTypes = Object.values(objectsState.types)
    .map((typeState) => typeState.metadata)
    .filter((type): type is NonNullable<typeof type> => !!type);

  const publish = (
    nextObjectTypeId: string,
    nextConditions: FilterCondition[],
  ) => {
    const nextMetadata = objectsState.types[nextObjectTypeId]?.metadata;
    const nextResult = buildFilter(nextMetadata, nextConditions);

    updateWidgetMetaProperty("objectTypeId", nextObjectTypeId || undefined);
    updateWidgetMetaProperty("filter", nextResult.filter);
    updateWidgetMetaProperty("isValid", nextResult.isValid);
  };

  const updateConditions = (nextConditions: FilterCondition[]) => {
    setConditions(nextConditions);
    publish(objectTypeId, nextConditions);
  };

  if (objectsState.status === "loading" && !objectTypes.length) {
    return <div>Loading object metadata...</div>;
  }

  if (objectsState.status === "error" && !objectTypes.length) {
    const metadataError =
      objectsState.error?.message ||
      Object.values(objectsState.types).find((type) => type.error)?.error
        ?.message;

    return <div>{metadataError || "Unable to load object metadata."}</div>;
  }

  const reset = () => updateConditions([]);

  return (
    <div className="t--filter-list-widget">
      <label>
        Object type
        <select
          aria-label="Object type"
          onChange={(event) => {
            const nextObjectTypeId = event.target.value;

            setObjectTypeId(nextObjectTypeId);
            updateConditionsForType(nextObjectTypeId);
          }}
          value={objectTypeId}
        >
          <option value="">Select an object type</option>
          {objectTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.displayName}
            </option>
          ))}
        </select>
      </label>
      {!objectTypeId && <div>Select an object type to add filters.</div>}
      {objectTypeId && (
        <>
          {conditions.map((condition, index) => {
            const property = metadata?.properties.find(
              (candidate) => candidate.id === condition.propertyId,
            );
            const operatorNeedsValue = condition.operator !== "isEmpty";

            return (
              <div key={index}>
                <label>
                  Property
                  <select
                    aria-label="Property"
                    onChange={(event) => {
                      const next = [...conditions];

                      next[index] = {
                        ...condition,
                        propertyId: event.target.value,
                        value: "",
                      };
                      updateConditions(next);
                    }}
                    value={condition.propertyId}
                  >
                    <option value="">Select a property</option>
                    {metadata?.properties.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Operator
                  <select
                    aria-label="Operator"
                    onChange={(event) => {
                      const operator = event.target.value as FilterOperator;
                      const next = [...conditions];

                      next[index] = {
                        ...condition,
                        operator,
                        value:
                          operator === "isEmpty"
                            ? undefined
                            : condition.value || "",
                      };
                      updateConditions(next);
                    }}
                    value={condition.operator}
                  >
                    {FILTER_OPERATORS.map((operator) => (
                      <option key={operator} value={operator}>
                        {operator}
                      </option>
                    ))}
                  </select>
                </label>
                {operatorNeedsValue && (
                  <label>
                    Value
                    {property?.dataType === "BOOLEAN" ? (
                      <select
                        aria-label="Value"
                        onChange={(event) => {
                          const next = [...conditions];

                          next[index] = {
                            ...condition,
                            value: event.target.value === "true",
                          };
                          updateConditions(next);
                        }}
                        value={String(condition.value ?? "")}
                      >
                        <option value="">Select a value</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : (
                      <input
                        aria-label="Value"
                        onChange={(event) => {
                          const next = [...conditions];

                          next[index] = {
                            ...condition,
                            value: getValue(
                              property?.dataType,
                              event.target.value,
                            ),
                          };
                          updateConditions(next);
                        }}
                        type={
                          property?.dataType === "INTEGER" ||
                          property?.dataType === "DECIMAL"
                            ? "number"
                            : "text"
                        }
                        value={String(condition.value ?? "")}
                      />
                    )}
                  </label>
                )}
                <button
                  aria-label={`Remove condition ${index + 1}`}
                  onClick={() =>
                    updateConditions(
                      conditions.filter((_, item) => item !== index),
                    )
                  }
                  type="button"
                >
                  Remove
                </button>
              </div>
            );
          })}
          <button
            onClick={() => updateConditions([...conditions, createCondition()])}
            type="button"
          >
            Add condition
          </button>
          <button onClick={reset} type="button">
            Reset
          </button>
          {!result.isValid && conditions.length > 0 && (
            <div role="alert">
              Choose a valid property, operator, and value.
            </div>
          )}
        </>
      )}
    </div>
  );

  function updateConditionsForType(nextObjectTypeId: string) {
    setConditions([]);
    publish(nextObjectTypeId, []);
  }
}
