import type { CelanworksmithObjectType } from "api/CelanworksmithAPI";

export const FILTER_OPERATORS = [
  "equals",
  "contains",
  "startsWith",
  "gt",
  "gte",
  "lt",
  "lte",
  "isEmpty",
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export interface FilterCondition {
  propertyId: string;
  operator: FilterOperator;
  value?: string | number | boolean;
}

export interface StructuredFilter {
  typeId: string;
  conditions: FilterCondition[];
  version: 1;
}

const stringOperators: FilterOperator[] = [
  "equals",
  "contains",
  "startsWith",
  "isEmpty",
];
const comparableOperators: FilterOperator[] = [
  "equals",
  "gt",
  "gte",
  "lt",
  "lte",
  "isEmpty",
];

export const isOperatorAllowed = (
  dataType: string | undefined,
  operator: string,
) => {
  if (!FILTER_OPERATORS.includes(operator as FilterOperator)) return false;

  if (dataType === "STRING")
    return stringOperators.includes(operator as FilterOperator);

  if (["INTEGER", "DECIMAL", "DATETIME"].includes(dataType || "")) {
    return comparableOperators.includes(operator as FilterOperator);
  }

  return dataType === "BOOLEAN" && operator === "equals";
};

const isValueValid = (dataType: string, condition: FilterCondition) => {
  if (condition.operator === "isEmpty") return condition.value === undefined;

  if (condition.value === undefined || condition.value === "") return false;

  if (dataType === "INTEGER") return Number.isInteger(condition.value);

  if (dataType === "DECIMAL") return typeof condition.value === "number";

  if (dataType === "BOOLEAN") return typeof condition.value === "boolean";

  return typeof condition.value === "string";
};

export const buildFilter = (
  metadata: CelanworksmithObjectType | undefined,
  conditions: FilterCondition[],
): { filter: StructuredFilter; isValid: boolean } => {
  const filter: StructuredFilter = {
    typeId: metadata?.id || "",
    conditions,
    version: 1,
  };

  const isValid =
    !!metadata &&
    conditions.every((condition) => {
      const property = metadata.properties.find(
        (candidate) => candidate.id === condition.propertyId,
      );

      return (
        !!property &&
        isOperatorAllowed(property.dataType, condition.operator) &&
        isValueValid(property.dataType, condition)
      );
    });

  return { filter, isValid };
};
