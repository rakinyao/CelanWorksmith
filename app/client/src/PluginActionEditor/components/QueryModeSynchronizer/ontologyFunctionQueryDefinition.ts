import { objectKeys } from "@appsmith/utils";

export interface OntologyFunctionQueryDefinition {
  functionId: string;
  parameters: Record<string, unknown>;
}

export interface OntologyFunctionMetadata {
  functions: Array<{
    id: string;
    parameters: Array<{
      id: string;
      required?: boolean;
      readOnly?: boolean;
      derived?: boolean;
    }>;
  }>;
}

type ValidationResult =
  | { valid: true; definition: OntologyFunctionQueryDefinition }
  | { valid: false; message: string };

type BuilderValue = { data?: unknown } | unknown;

function unwrapBuilderValue(value: BuilderValue): unknown {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, "data")
  ) {
    return (value as { data: unknown }).data;
  }

  return value;
}

function parseBuilderParameters(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error("Function Builder parameters must be valid JSON", {
      cause: error,
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function invalid(message: string): ValidationResult {
  return { valid: false, message };
}

function validateDefinitionShape(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return "Function query definition must be an object";
  }

  const unsupportedField = objectKeys(value).find(
    (key) => key !== "functionId" && key !== "parameters",
  );

  if (unsupportedField) {
    return `Unsupported field in Function query definition: ${unsupportedField}`;
  }

  if (
    typeof value.functionId !== "string" ||
    value.functionId.trim() === "" ||
    value.functionId.trim() !== value.functionId
  ) {
    return "Function query definition requires functionId";
  }

  if (!isRecord(value.parameters)) {
    return "Function query definition requires parameters to be an object";
  }

  return undefined;
}

function normalizeDefinition(
  definition: OntologyFunctionQueryDefinition,
): OntologyFunctionQueryDefinition {
  return {
    functionId: definition.functionId.trim(),
    parameters: { ...definition.parameters },
  };
}

export function validateDefinition(
  definition: OntologyFunctionQueryDefinition,
  metadata: OntologyFunctionMetadata,
): ValidationResult {
  const shapeError = validateDefinitionShape(definition);

  if (shapeError) {
    return invalid(shapeError);
  }

  const normalized = normalizeDefinition(definition);
  const ontologyFunction = metadata.functions.find(
    (candidate) => candidate.id === normalized.functionId,
  );

  if (!ontologyFunction) {
    return invalid(`Unknown Function ID: ${normalized.functionId}`);
  }

  for (const parameterId of objectKeys(normalized.parameters)) {
    const parameter = ontologyFunction.parameters.find(
      (candidate) => candidate.id === parameterId,
    );

    if (!parameter) {
      return invalid(`Unknown Function parameter: ${parameterId}`);
    }

    if (parameter.readOnly || parameter.derived) {
      return invalid(`Function parameter is not writable: ${parameterId}`);
    }
  }

  const missingRequiredParameter = ontologyFunction.parameters.find(
    (parameter) =>
      parameter.required &&
      !parameter.readOnly &&
      !parameter.derived &&
      !hasOwn(normalized.parameters, parameter.id),
  );

  if (missingRequiredParameter) {
    return invalid(
      `Missing required Function parameter: ${missingRequiredParameter.id}`,
    );
  }

  return { valid: true, definition: normalized };
}

export function serializeFunctionBuilderForm(
  formData: Record<string, unknown>,
  metadata: OntologyFunctionMetadata,
): string {
  const validation = validateDefinition(
    {
      functionId: unwrapBuilderValue(formData.functionId) as string,
      parameters: parseBuilderParameters(
        unwrapBuilderValue(formData.parameters),
      ) as Record<string, unknown>,
    },
    metadata,
  );

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  return JSON.stringify(validation.definition);
}

export function hydrateBuilderForm(
  definition: OntologyFunctionQueryDefinition,
): Record<string, unknown> {
  const normalized = normalizeDefinition(definition);

  return {
    "actionConfiguration.formData.functionId.data": normalized.functionId,
    "actionConfiguration.formData.parameters.data": normalized.parameters,
  };
}

export function parseAdvancedDefinition(
  text: string,
): OntologyFunctionQueryDefinition {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("Advanced JSON definition must be valid JSON", {
      cause: error,
    });
  }

  const shapeError = validateDefinitionShape(parsed);

  if (shapeError) {
    throw new Error(shapeError);
  }

  return normalizeDefinition(parsed as OntologyFunctionQueryDefinition);
}
