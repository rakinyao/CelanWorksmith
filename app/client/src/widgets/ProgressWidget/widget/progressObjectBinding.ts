import type { CelanworksmithObjectSet } from "api/CelanworksmithAPI";
import type {
  CelanworksmithVariableMeta,
  CelanworksmithVariablesEntity,
} from "entities/DataTree/dataTreeCelanworksmithVariables";
import type { ObjectSetWidgetState } from "celanworksmith/widgets/objectBinding/objectSetUtils";

interface ProgressObjectBindingInput {
  aggregationVariableName?: string;
  error?: { message: string };
  metadata?: { properties: Array<{ dataType?: string; id: string }> };
  result?: CelanworksmithObjectSet;
  status: ObjectSetWidgetState;
  valuePropertyId?: string;
  variables?: CelanworksmithVariablesEntity;
}

export interface ProgressObjectValue {
  error?: string;
  status: ObjectSetWidgetState;
  value?: number;
}

const NUMERIC_PROPERTY_TYPES = new Set(["INTEGER", "DECIMAL"]);

const getVariableName = (value: string) => {
  const trimmedValue = value.trim();
  const variablePath = trimmedValue.match(
    /^(?:\{\{\s*)?\$variables\.([^\s{}]+?)(?:\s*\}\})?$/,
  );

  return variablePath?.[1] || trimmedValue;
};

const resolveVariableStatus = (
  metadata: CelanworksmithVariableMeta | undefined,
): ProgressObjectValue => {
  switch (metadata?.status) {
    case "ready":
      return { status: "ready" };
    case "empty":
      return { status: "empty" };
    case "error":
      return { error: metadata.error, status: "error" };
    case "idle":
    case "loading":
      return { status: "loading" };
    default:
      return { status: "typeMismatch" };
  }
};

export const getProgressObjectValue = ({
  aggregationVariableName,
  error,
  metadata,
  result,
  status,
  valuePropertyId,
  variables,
}: ProgressObjectBindingInput): ProgressObjectValue => {
  if (
    status === "loading" ||
    status === "error" ||
    status === "permissionDenied"
  ) {
    return { error: error?.message, status };
  }

  if (aggregationVariableName) {
    const variableName = getVariableName(aggregationVariableName);
    const variable = resolveVariableStatus(variables?._meta[variableName]);

    if (variable.status !== "ready") return variable;

    const value = variables?.[variableName];

    return typeof value === "number" && Number.isFinite(value)
      ? { status: "ready", value }
      : { status: "typeMismatch" };
  }

  if (status !== "ready") {
    return { error: error?.message, status };
  }

  if (!result?.items.length) return { status: "empty" };

  if (result.items.length !== 1) return { status: "typeMismatch" };

  const property = metadata?.properties.find(
    (candidate) => candidate.id === valuePropertyId,
  );
  const value = valuePropertyId
    ? result.items[0].properties[valuePropertyId]
    : undefined;

  if (!property || !NUMERIC_PROPERTY_TYPES.has(property.dataType || "")) {
    return { status: "typeMismatch" };
  }

  return typeof value === "number" && Number.isFinite(value)
    ? { status: "ready", value }
    : { status: "typeMismatch" };
};
