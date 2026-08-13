import type { StructuredFilter } from "widgets/FilterListWidget/widget/filterUtils";

export const VARIABLE_SCHEMA_VERSION = 1 as const;

export type CelanworksmithVariableKind =
  | "OBJECT_SET"
  | "OBJECT_PROPERTY"
  | "FUNCTION"
  | "AGGREGATION";

export type AggregationOperation = "count" | "sum" | "avg" | "min" | "max";

export interface ObjectSetVariableConfig {
  typeId: string;
  filter?: StructuredFilter;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  offset?: number;
  limit?: number;
}

export interface ObjectPropertyVariableConfig {
  objectTypeId: string;
  objectId: string;
  propertyId: string;
}

export interface FunctionVariableConfig {
  functionId: string;
  parameters: Record<string, unknown>;
}

export interface AggregationVariableConfig {
  sourceVariableId: string;
  operation: AggregationOperation;
  propertyId?: string;
}

export interface VariableDefinitionBase {
  id: string;
  name: string;
  kind: CelanworksmithVariableKind;
  version: typeof VARIABLE_SCHEMA_VERSION;
  updatedAt: number;
  dependencies: string[];
}

export type VariableDefinition =
  | (VariableDefinitionBase & {
      kind: "OBJECT_SET";
      config: ObjectSetVariableConfig;
    })
  | (VariableDefinitionBase & {
      kind: "OBJECT_PROPERTY";
      config: ObjectPropertyVariableConfig;
    })
  | (VariableDefinitionBase & {
      kind: "FUNCTION";
      config: FunctionVariableConfig;
    })
  | (VariableDefinitionBase & {
      kind: "AGGREGATION";
      config: AggregationVariableConfig;
    });

export interface VariableValidationResult {
  valid: boolean;
  order: string[];
  errors: string[];
}
