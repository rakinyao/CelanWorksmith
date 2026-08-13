import type { CelanworksmithObjectSet } from "api/CelanworksmithAPI";
import type { CelanworksmithExecutionState } from "reducers/celanworksmithExecutionReducer";
import type { CelanworksmithObjectsState } from "reducers/celanworksmithObjectsReducer";
import type { CelanworksmithObjectQueryState } from "reducers/celanworksmithObjectQueryReducer";
import type { CelanworksmithObjectQueryRequest } from "actions/celanworksmithObjectQueryActions";
import { getObjectQueryKey } from "reducers/celanworksmithObjectQueryReducer";
import {
  aggregateValues,
  validateVariableDefinitions,
} from "celanworksmith/variables/variableUtils";
import type { VariableDefinition } from "celanworksmith/variables/types";

export interface CelanworksmithVariableMeta {
  status: "idle" | "loading" | "ready" | "empty" | "error";
  type: VariableDefinition["kind"];
  updatedAt?: number;
  error?: string;
  dependencies: string[];
  path?: string;
  returnType?: string;
  stableId?: string;
}

export interface CelanworksmithVariablesEntity {
  ENTITY_TYPE: "CELANWORKSMITH_VARIABLES";
  _meta: Record<string, CelanworksmithVariableMeta>;
  [name: string]: unknown;
}

export interface CelanworksmithVariablesDataTreeState {
  definitions: VariableDefinition[];
  objects: CelanworksmithObjectsState;
  queries: CelanworksmithObjectQueryState;
  execution: CelanworksmithExecutionState;
  applicationId?: string;
}

const toFlatObject = (item: CelanworksmithObjectSet["items"][number]) => ({
  ...item.properties,
  id: item.id,
  typeId: item.typeId,
});

const getObjectProperty = (
  objects: CelanworksmithObjectsState,
  objectTypeId: string,
  objectId: string,
  propertyId: string,
) => {
  const instance = objects.types[objectTypeId]?.items.find(
    (item) => item.id === objectId,
  );

  return instance?.properties[propertyId];
};

const getObjectSetRequest = (
  definition: Extract<VariableDefinition, { kind: "OBJECT_SET" }>,
  applicationId?: string,
): CelanworksmithObjectQueryRequest => ({
  widgetId: `$variable/${definition.id}`,
  typeId: definition.config.typeId,
  query: {
    offset: definition.config.offset || 0,
    limit: definition.config.limit || 100,
    ...(definition.config.filter
      ? {
          filter: definition.config.filter as unknown as Record<
            string,
            unknown
          >,
        }
      : {}),
    ...(definition.config.sortBy ? { sortBy: definition.config.sortBy } : {}),
    ...(definition.config.sortDirection
      ? { sortDirection: definition.config.sortDirection }
      : {}),
  },
  ...(applicationId ? { applicationId } : {}),
});

const getObjectSetState = (
  definition: Extract<VariableDefinition, { kind: "OBJECT_SET" }>,
  queries: CelanworksmithObjectQueryState,
  applicationId?: string,
) =>
  queries.entries[
    getObjectQueryKey(getObjectSetRequest(definition, applicationId))
  ];

export const buildCelanworksmithVariablesDataTree = ({
  applicationId,
  definitions,
  execution,
  objects,
  queries,
}: CelanworksmithVariablesDataTreeState): CelanworksmithVariablesEntity => {
  const entity = {
    ENTITY_TYPE: "CELANWORKSMITH_VARIABLES",
    _meta: {},
  } as CelanworksmithVariablesEntity;
  const values = new Map<string, unknown>();
  const definitionsById = new Map(
    definitions.map((definition) => [definition.id, definition]),
  );
  const validation = validateVariableDefinitions(definitions);

  if (!validation.valid) {
    definitions.forEach((definition) => {
      entity._meta[definition.name] = {
        path: `$variables.${definition.name}`,
        returnType:
          definition.kind === "OBJECT_SET"
            ? `ObjectSet<${definition.config.typeId}>`
            : definition.kind === "OBJECT_PROPERTY"
              ? `${definition.config.objectTypeId}.${definition.config.propertyId}`
              : definition.kind,
        status: "error",
        stableId: definition.id,
        type: definition.kind,
        error: validation.errors.join("; "),
        dependencies: definition.dependencies,
      };
    });

    return entity;
  }

  validation.order.forEach((id) => {
    const definition = definitionsById.get(id);

    if (!definition) return;

    let value: unknown;
    let status: CelanworksmithVariableMeta["status"] = "ready";
    let error: string | undefined;

    if (definition.kind === "OBJECT_SET") {
      const queryState = getObjectSetState(definition, queries, applicationId);

      status = queryState?.status || "idle";
      value = queryState?.result?.items.map(toFlatObject);
      error = queryState?.error?.message;
    } else if (definition.kind === "OBJECT_PROPERTY") {
      value = getObjectProperty(
        objects,
        definition.config.objectTypeId,
        definition.config.objectId,
        definition.config.propertyId,
      );
      status = value === undefined ? "idle" : "ready";
    } else if (definition.kind === "FUNCTION") {
      const functionState = execution.functions[definition.config.functionId];

      value = functionState?.data;
      const functionStatus = functionState?.meta.status;

      status =
        functionStatus === "succeeded"
          ? "ready"
          : functionStatus === "failed" || functionStatus === "cancelled"
            ? "error"
            : functionStatus === "queued" || functionStatus === "running"
              ? "loading"
              : "idle";
      error = functionState?.meta.error?.message;
    } else {
      const source = values.get(definition.config.sourceVariableId);
      const rows = Array.isArray(source) ? source : [];
      const aggregateInput = definition.config.propertyId
        ? rows.map(
            (row) =>
              (row as Record<string, unknown>)[definition.config.propertyId!],
          )
        : rows;

      value = aggregateValues(aggregateInput, definition.config.operation);
      status = values.has(definition.config.sourceVariableId)
        ? "ready"
        : "idle";
    }

    if (status === "empty")
      value = definition.kind === "OBJECT_SET" ? [] : value;

    if (status === "error") value = undefined;

    if (value !== undefined) entity[definition.name] = value;

    values.set(id, value);
    entity._meta[definition.name] = {
      path: `$variables.${definition.name}`,
      returnType:
        definition.kind === "OBJECT_SET"
          ? `ObjectSet<${definition.config.typeId}>`
          : definition.kind === "OBJECT_PROPERTY"
            ? `${definition.config.objectTypeId}.${definition.config.propertyId}`
            : definition.kind,
      status,
      stableId: definition.id,
      type: definition.kind,
      updatedAt:
        definition.kind === "OBJECT_SET"
          ? getObjectSetState(definition, queries, applicationId)?.updatedAt
          : undefined,
      error,
      dependencies: definition.dependencies,
    };
  });

  return entity;
};

export const getCelanworksmithObjectSetVariableRequest = getObjectSetRequest;
