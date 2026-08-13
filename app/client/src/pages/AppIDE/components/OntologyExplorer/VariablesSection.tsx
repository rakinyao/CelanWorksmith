import React, {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { Flex, Icon } from "@appsmith/ads";
import styled from "styled-components";
import { batchUpdateWidgetProperty } from "actions/controlActions";
import {
  getOntologyNamePresentation,
  type OntologyNameMetadata,
} from "celanworksmith/ontologyNames";
import type {
  CelanworksmithFunction,
  CelanworksmithObjectInstance,
  CelanworksmithObjectType,
} from "api/CelanworksmithAPI";
import { getCelanworksmithVariablesDataTree } from "selectors/dataTreeSelectors";
import {
  CELANWORKSMITH_VARIABLES_PROPERTY,
  getCelanworksmithVariableDefinitions,
  getCelanworksmithVariableRootWidgetIdFromState,
} from "selectors/celanworksmithVariableSelectors";
import { validateVariableDefinitions } from "celanworksmith/variables/variableUtils";
import {
  buildFilter,
  type FilterOperator,
} from "widgets/FilterListWidget/widget/filterUtils";
import type {
  CelanworksmithVariableKind,
  AggregationOperation,
  VariableDefinition,
} from "celanworksmith/variables/types";

interface VariablesSectionProps {
  objectTypes: CelanworksmithObjectType[];
  objectInstances: Record<string, CelanworksmithObjectInstance[]>;
  functions: CelanworksmithFunction[];
}

const SectionHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: var(--ads-v2-spaces-3) var(--ads-v2-spaces-4) var(--ads-v2-spaces-2);
`;

const OntologyText = styled.span<{ $kind?: "body-s"; $color?: string }>`
  color: ${({ $color }) => $color || "var(--ads-v2-color-fg)"};
  font-size: 12px;
  line-height: 16px;
`;

const EmptySection = () => (
  <OntologyText $color="var(--ads-v2-color-fg-secondary)">
    No variables / 暂无变量
  </OntologyText>
);

const Control = styled.select`
  background: var(--ads-v2-color-bg);
  border: 1px solid var(--ads-v2-color-border);
  color: var(--ads-v2-color-fg);
  min-height: 28px;
  min-width: 0;
  padding: 0 var(--ads-v2-spaces-2);
`;

const TextControl = styled.input`
  background: var(--ads-v2-color-bg);
  border: 1px solid var(--ads-v2-color-border);
  color: var(--ads-v2-color-fg);
  min-height: 28px;
  min-width: 0;
  padding: 0 var(--ads-v2-spaces-2);
  width: 100%;
`;

const InlineControls = styled.div`
  display: flex;
  gap: var(--ads-v2-spaces-2);
  padding: 0 var(--ads-v2-spaces-4) var(--ads-v2-spaces-2);
`;

const AddButton = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--ads-v2-color-fg-secondary);
  cursor: pointer;
  display: inline-flex;
  gap: var(--ads-v2-spaces-1);
  padding: var(--ads-v2-spaces-1);

  &:hover {
    color: var(--ads-v2-color-fg);
  }
`;

const VariableRow = styled.div`
  align-items: center;
  display: flex;
  gap: var(--ads-v2-spaces-2);
  min-height: 32px;
  padding: var(--ads-v2-spaces-1) var(--ads-v2-spaces-4);
`;

const VariableName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatusText = styled.span<{ $error?: boolean }>`
  color: ${({ $error }) =>
    $error
      ? "var(--ads-v2-color-red-600)"
      : "var(--ads-v2-color-fg-secondary)"};
  font-size: 11px;
`;

const DeleteButton = styled.button`
  background: transparent;
  border: 0;
  color: var(--ads-v2-color-fg-secondary);
  cursor: pointer;
  display: inline-flex;
  padding: var(--ads-v2-spaces-1);

  &:hover {
    color: var(--ads-v2-color-red-600);
  }
`;

const KIND_LABELS: Record<CelanworksmithVariableKind, string> = {
  OBJECT_SET: "Object Set",
  OBJECT_PROPERTY: "Object Property",
  FUNCTION: "Function",
  AGGREGATION: "Aggregation",
};

const getUniqueName = (
  kind: CelanworksmithVariableKind,
  definitions: VariableDefinition[],
) => {
  const base =
    kind === "OBJECT_SET"
      ? "purchaseOrders"
      : kind === "AGGREGATION"
        ? "purchaseOrderCount"
        : kind === "FUNCTION"
          ? "functionResult"
          : "objectProperty";
  const names = new Set(definitions.map((definition) => definition.name));

  if (!names.has(base)) return base;

  let index = 2;

  while (names.has(`${base}${index}`)) index += 1;

  return `${base}${index}`;
};

const createDefinition = ({
  aggregationOperation,
  aggregationSourceId,
  definitions,
  filter,
  functionId,
  functionParameters,
  functions,
  kind,
  name,
  objectInstances,
  objectTypeId,
  objectTypes,
}: {
  kind: CelanworksmithVariableKind;
  name: string;
  objectTypes: CelanworksmithObjectType[];
  objectInstances: Record<string, CelanworksmithObjectInstance[]>;
  functions: CelanworksmithFunction[];
  definitions: VariableDefinition[];
  objectTypeId?: string;
  filter?: NonNullable<
    Extract<VariableDefinition, { kind: "OBJECT_SET" }>["config"]["filter"]
  >;
  aggregationSourceId?: string;
  aggregationOperation?: AggregationOperation;
  functionId?: string;
  functionParameters?: Record<string, unknown>;
}): VariableDefinition | undefined => {
  const id = `celanworksmith-variable-${Date.now()}`;
  const firstObjectType =
    objectTypes.find((objectType) => objectType.id === objectTypeId) ||
    objectTypes[0];

  if (kind === "OBJECT_SET") {
    if (!firstObjectType) return undefined;

    return {
      id,
      name,
      kind,
      version: 1,
      updatedAt: Date.now(),
      dependencies: [],
      config: {
        typeId: objectTypeId || firstObjectType.id,
        limit: 100,
        ...(filter ? { filter } : {}),
      },
    };
  }

  if (kind === "AGGREGATION") {
    const source = definitions.find(
      (definition) =>
        definition.kind === "OBJECT_SET" &&
        definition.id === (aggregationSourceId || definition.id),
    );

    if (!source) return undefined;

    return {
      id,
      name,
      kind,
      version: 1,
      updatedAt: Date.now(),
      dependencies: [source.id],
      config: {
        sourceVariableId: source.id,
        operation: aggregationOperation || "count",
      },
    };
  }

  if (kind === "FUNCTION") {
    const functionMetadata = functions.find(
      (candidate) => candidate.id === (functionId || candidate.id),
    );

    if (!functionMetadata) return undefined;

    return {
      id,
      name,
      kind,
      version: 1,
      updatedAt: Date.now(),
      dependencies: [],
      config: {
        functionId: functionMetadata.id,
        parameters: functionParameters || {},
      },
    };
  }

  const objectId = firstObjectType
    ? objectInstances[firstObjectType.id]?.[0]?.id
    : undefined;
  const propertyId = firstObjectType?.properties[0]?.id;

  if (!firstObjectType || !objectId || !propertyId) return undefined;

  return {
    id,
    name,
    kind,
    version: 1,
    updatedAt: Date.now(),
    dependencies: [],
    config: {
      objectTypeId: firstObjectType.id,
      objectId,
      propertyId,
    },
  };
};

const VariablesSection = ({
  functions,
  objectInstances,
  objectTypes,
}: VariablesSectionProps) => {
  const dispatch = useDispatch();
  const definitions = useSelector(getCelanworksmithVariableDefinitions);
  const rootWidgetId = useSelector(
    getCelanworksmithVariableRootWidgetIdFromState,
  );
  const variablesDataTree = useSelector(getCelanworksmithVariablesDataTree);
  const [kind, setKind] = useState<CelanworksmithVariableKind>("OBJECT_SET");
  const [variableName, setVariableName] = useState("");
  const [objectTypeId, setObjectTypeId] = useState(objectTypes[0]?.id || "");
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [filterPropertyId, setFilterPropertyId] = useState("");
  const [filterOperator, setFilterOperator] =
    useState<FilterOperator>("equals");
  const [filterValue, setFilterValue] = useState("");
  const [aggregationSourceId, setAggregationSourceId] = useState("");
  const [aggregationOperation, setAggregationOperation] =
    useState<AggregationOperation>("count");
  const [functionId, setFunctionId] = useState("");
  const [functionParameters, setFunctionParameters] = useState("{}");
  const [error, setError] = useState<string>();

  const objectTypeOptions = useMemo(
    () =>
      objectTypes.map((objectType) => ({
        value: objectType.id,
        label: getOntologyNamePresentation(objectType as OntologyNameMetadata)
          .label,
      })),
    [objectTypes],
  );

  const selectedObjectType = objectTypes.find(
    (objectType) => objectType.id === objectTypeId,
  );
  const objectSetDefinitions = definitions.filter(
    (definition) => definition.kind === "OBJECT_SET",
  );

  useEffect(() => {
    if (!objectTypeId && objectTypes[0]) setObjectTypeId(objectTypes[0].id);
  }, [objectTypeId, objectTypes]);

  useEffect(() => {
    if (!filterPropertyId && selectedObjectType?.properties[0]) {
      setFilterPropertyId(selectedObjectType.properties[0].id);
    }
  }, [filterPropertyId, selectedObjectType]);

  useEffect(() => {
    if (!aggregationSourceId && objectSetDefinitions[0]) {
      setAggregationSourceId(objectSetDefinitions[0].id);
    }
  }, [aggregationSourceId, objectSetDefinitions]);

  useEffect(() => {
    if (!functionId && functions[0]) setFunctionId(functions[0].id);
  }, [functionId, functions]);

  const saveDefinitions = useCallback(
    (nextDefinitions: VariableDefinition[]) => {
      const validation = validateVariableDefinitions(nextDefinitions);

      if (!validation.valid) {
        setError(validation.errors.join("; "));

        return;
      }

      if (!rootWidgetId) {
        setError("The page root widget is unavailable.");

        return;
      }

      setError(undefined);
      dispatch(
        batchUpdateWidgetProperty(rootWidgetId, {
          modify: { [CELANWORKSMITH_VARIABLES_PROPERTY]: nextDefinitions },
        }),
      );
    },
    [dispatch, rootWidgetId],
  );

  const addVariable = useCallback(() => {
    const name = variableName.trim() || getUniqueName(kind, definitions);
    let filter:
      | NonNullable<
          Extract<
            VariableDefinition,
            { kind: "OBJECT_SET" }
          >["config"]["filter"]
        >
      | undefined;
    let parsedFunctionParameters: Record<string, unknown> | undefined;

    if (kind === "OBJECT_SET" && filterEnabled) {
      const selectedProperty = selectedObjectType?.properties.find(
        (property) => property.id === filterPropertyId,
      );
      const typedValue =
        selectedProperty?.dataType === "INTEGER"
          ? Number(filterValue)
          : selectedProperty?.dataType === "DECIMAL"
            ? Number(filterValue)
            : selectedProperty?.dataType === "BOOLEAN"
              ? filterValue === "true"
              : filterValue;
      const result = buildFilter(selectedObjectType, [
        {
          propertyId: filterPropertyId,
          operator: filterOperator,
          value: filterOperator === "isEmpty" ? undefined : typedValue,
        },
      ]);

      if (!result.isValid) {
        setError("The Object Set filter is invalid.");

        return;
      }

      filter = result.filter;
    }

    if (kind === "FUNCTION") {
      try {
        const value = JSON.parse(functionParameters);

        if (!value || Array.isArray(value) || typeof value !== "object") {
          throw new Error("not an object");
        }

        parsedFunctionParameters = value;
      } catch {
        setError("Function parameters must be a JSON object.");

        return;
      }
    }

    const definition = createDefinition({
      kind,
      name,
      objectTypes,
      objectInstances,
      functions,
      definitions,
      objectTypeId,
      filter,
      aggregationSourceId,
      aggregationOperation,
      functionId,
      functionParameters: parsedFunctionParameters,
    });

    if (!definition) {
      setError(
        `Unable to create ${KIND_LABELS[kind]}. Metadata is incomplete.`,
      );

      return;
    }

    saveDefinitions([...definitions, definition]);
  }, [
    aggregationOperation,
    aggregationSourceId,
    definitions,
    filterEnabled,
    filterOperator,
    filterPropertyId,
    filterValue,
    functionId,
    functionParameters,
    functions,
    kind,
    objectInstances,
    objectTypeId,
    objectTypes,
    saveDefinitions,
    selectedObjectType,
    variableName,
  ]);

  const deleteVariable = useCallback(
    (variableId: string) => {
      saveDefinitions(
        definitions.filter((definition) => definition.id !== variableId),
      );
    },
    [definitions, saveDefinitions],
  );

  return (
    <section aria-label="Variables / 变量">
      <SectionHeader>
        <OntologyText $color="var(--ads-v2-color-fg-secondary)" $kind="body-s">
          Variables / 变量
        </OntologyText>
        <Flex alignItems="center" gap="spaces-1">
          <Control
            aria-label="Variable type"
            data-testid="t--variables-kind"
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setKind(event.target.value as CelanworksmithVariableKind)
            }
            value={kind}
          >
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Control>
          <AddButton
            aria-label="Add variable"
            data-testid="t--variables-add"
            onClick={addVariable}
            title="Add variable"
            type="button"
          >
            <Icon name="add-line" size="sm" />
          </AddButton>
        </Flex>
      </SectionHeader>
      <InlineControls>
        <TextControl
          aria-label="Variable name"
          data-testid="t--variables-name"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setVariableName(event.target.value)
          }
          placeholder={getUniqueName(kind, definitions)}
          value={variableName}
        />
      </InlineControls>
      {kind === "OBJECT_SET" ? (
        <>
          <InlineControls>
            <Control
              aria-label="Object type"
              data-testid="t--variables-object-type"
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setObjectTypeId(event.target.value)
              }
              value={objectTypeId}
            >
              {objectTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Control>
            <label>
              <input
                checked={filterEnabled}
                data-testid="t--variables-filter-enabled"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setFilterEnabled(event.target.checked)
                }
                type="checkbox"
              />
              Filter
            </label>
          </InlineControls>
          {filterEnabled ? (
            <InlineControls>
              <Control
                aria-label="Filter property"
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setFilterPropertyId(event.target.value)
                }
                value={filterPropertyId}
              >
                {selectedObjectType?.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {
                      getOntologyNamePresentation(
                        property as OntologyNameMetadata,
                      ).label
                    }
                  </option>
                ))}
              </Control>
              <Control
                aria-label="Filter operator"
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setFilterOperator(event.target.value as FilterOperator)
                }
                value={filterOperator}
              >
                {[
                  "equals",
                  "contains",
                  "startsWith",
                  "gt",
                  "gte",
                  "lt",
                  "lte",
                  "isEmpty",
                ].map((operator) => (
                  <option key={operator} value={operator}>
                    {operator}
                  </option>
                ))}
              </Control>
              {filterOperator !== "isEmpty" ? (
                <TextControl
                  aria-label="Filter value"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setFilterValue(event.target.value)
                  }
                  value={filterValue}
                />
              ) : null}
            </InlineControls>
          ) : null}
        </>
      ) : null}
      {kind === "AGGREGATION" ? (
        <InlineControls>
          <Control
            aria-label="Aggregation source"
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setAggregationSourceId(event.target.value)
            }
            value={aggregationSourceId}
          >
            {objectSetDefinitions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.name}
              </option>
            ))}
          </Control>
          <Control
            aria-label="Aggregation operation"
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setAggregationOperation(
                event.target.value as AggregationOperation,
              )
            }
            value={aggregationOperation}
          >
            {["count", "sum", "avg", "min", "max"].map((operation) => (
              <option key={operation} value={operation}>
                {operation}
              </option>
            ))}
          </Control>
        </InlineControls>
      ) : null}
      {kind === "FUNCTION" ? (
        <InlineControls>
          <Control
            aria-label="Function"
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setFunctionId(event.target.value)
            }
            value={functionId}
          >
            {functions.map((func) => (
              <option key={func.id} value={func.id}>
                {
                  getOntologyNamePresentation(func as OntologyNameMetadata)
                    .label
                }
              </option>
            ))}
          </Control>
          <TextControl
            aria-label="Function parameters"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFunctionParameters(event.target.value)
            }
            value={functionParameters}
          />
        </InlineControls>
      ) : null}
      {error ? <StatusText $error>{error}</StatusText> : null}
      {definitions.map((definition) => {
        const metadata = variablesDataTree._meta[definition.name];

        return (
          <VariableRow
            data-testid={`t--variable-${definition.name}`}
            key={definition.id}
          >
            <VariableName>{definition.name}</VariableName>
            <StatusText $error={metadata?.status === "error"}>
              {metadata?.error ||
                metadata?.status ||
                KIND_LABELS[definition.kind]}
            </StatusText>
            <DeleteButton
              aria-label={`Delete ${definition.name}`}
              data-testid={`t--variable-delete-${definition.name}`}
              onClick={() => deleteVariable(definition.id)}
              title={`Delete ${definition.name}`}
              type="button"
            >
              <Icon name="delete-bin-line" size="sm" />
            </DeleteButton>
          </VariableRow>
        );
      })}
      {definitions.length === 0 ? <EmptySection /> : null}
      {objectTypeOptions.length === 0 && kind === "OBJECT_SET" ? (
        <StatusText $error>Object metadata is unavailable.</StatusText>
      ) : null}
    </section>
  );
};

export default VariablesSection;
