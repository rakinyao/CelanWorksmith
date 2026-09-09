export type OntologyCapabilityOperation = "FUNCTION_QUERY" | "ACTION_QUERY";

export type OntologyCapabilityQueryTarget =
  | {
      source: "SINGLE_OBJECT";
      objectId: string;
    }
  | {
      source: "OBJECT_SET";
      objectIds: string | string[];
    };

export interface OntologyCapabilityQueryDefinition {
  target: OntologyCapabilityQueryTarget;
  parameters: Record<string, unknown>;
}

export interface OntologyCapabilityMetadata {
  capabilities: Array<{
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
  | { valid: true; definition: OntologyCapabilityQueryDefinition }
  | { valid: false; errorId: "invalidDefinition"; message: string };

type BuilderValue = { data?: unknown } | unknown;

function operationLabel(operation: OntologyCapabilityOperation): string {
  return operation === "FUNCTION_QUERY" ? "Function" : "Action";
}

function capabilityField(operation: OntologyCapabilityOperation): string {
  return operation === "FUNCTION_QUERY" ? "functionId" : "actionId";
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function invalid(message: string): ValidationResult {
  return { valid: false, errorId: "invalidDefinition", message };
}

function parseParameters(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") {
    if (!isRecord(value)) {
      throw new Error("Ontology capability parameters must be a JSON object");
    }

    return { ...value };
  }

  try {
    const parsed = JSON.parse(value);

    if (!isRecord(parsed)) {
      throw new Error("Ontology capability parameters must be a JSON object");
    }

    return { ...parsed };
  } catch (error) {
    if (error instanceof Error && error.message.includes("must be")) {
      throw error;
    }

    throw new Error("Ontology capability parameters must be a JSON object", {
      cause: error,
    });
  }
}

function hasNoWritableParameters(
  selectedCapabilityId: unknown,
  metadata?: OntologyCapabilityMetadata,
): boolean {
  if (typeof selectedCapabilityId !== "string" || !metadata) {
    return false;
  }

  return (
    metadata.capabilities
      .find((capability) => capability.id === selectedCapabilityId)
      ?.parameters.every(
        (parameter) => parameter.readOnly || parameter.derived,
      ) === true
  );
}

function parseBuilderParameters(
  value: unknown,
  selectedCapabilityId: unknown,
  metadata?: OntologyCapabilityMetadata,
): Record<string, unknown> {
  if (
    value === undefined &&
    hasNoWritableParameters(selectedCapabilityId, metadata)
  ) {
    return {};
  }

  return parseParameters(value);
}

function normalizeDefinition(
  definition: OntologyCapabilityQueryDefinition,
): OntologyCapabilityQueryDefinition {
  const target =
    definition.target.source === "SINGLE_OBJECT"
      ? {
          source: "SINGLE_OBJECT" as const,
          objectId: definition.target.objectId,
        }
      : {
          source: "OBJECT_SET" as const,
          objectIds: Array.isArray(definition.target.objectIds)
            ? [...definition.target.objectIds]
            : definition.target.objectIds,
        };

  return {
    target,
    parameters: { ...definition.parameters },
  };
}

function validateDefinitionShape(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return "Ontology capability query definition must be an object";
  }

  const unsupportedField = Object.keys(value).find(
    (key) => key !== "target" && key !== "parameters",
  );

  if (unsupportedField) {
    return `Unsupported field in ontology capability query definition: ${unsupportedField}`;
  }

  if (!isRecord(value.target)) {
    return "Ontology capability query definition requires a target object";
  }

  const source = value.target.source;
  const allowedTargetFields =
    source === "SINGLE_OBJECT"
      ? ["source", "objectId"]
      : ["source", "objectIds"];
  const unsupportedTargetField = Object.keys(value.target).find(
    (key) => !allowedTargetFields.includes(key),
  );

  if (unsupportedTargetField) {
    return `Unsupported field in ontology capability target: ${unsupportedTargetField}`;
  }

  if (source === "SINGLE_OBJECT") {
    if (
      typeof value.target.objectId !== "string" ||
      value.target.objectId.trim() === ""
    ) {
      return "Ontology capability target requires an object ID";
    }
  } else if (source === "OBJECT_SET") {
    const objectIds = value.target.objectIds;

    if (typeof objectIds === "string") {
      if (objectIds.trim() === "") {
        return "Ontology capability target requires object IDs";
      }
    } else if (
      !Array.isArray(objectIds) ||
      objectIds.length === 0 ||
      objectIds.some(
        (objectId) => typeof objectId !== "string" || objectId.trim() === "",
      )
    ) {
      return "Ontology capability target requires an object ID array";
    }
  } else {
    return "Ontology capability target source must be SINGLE_OBJECT or OBJECT_SET";
  }

  if (!isRecord(value.parameters)) {
    return "Ontology capability query definition requires parameters to be an object";
  }

  return undefined;
}

function parseBuilderManyExpression(expression: string): string | string[] {
  const trimmed = expression.trim();

  if (!trimmed.startsWith("[")) {
    return expression;
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return parsed as string[];
    }
  } catch {
    return expression;
  }

  return expression;
}

function canonicalizeBuilderTarget(
  value: unknown,
  operation: OntologyCapabilityOperation,
): OntologyCapabilityQueryTarget {
  if (!isRecord(value)) {
    return value as OntologyCapabilityQueryTarget;
  }

  if (
    !hasOwn(value, "mode") &&
    !hasOwn(value, "cardinality") &&
    !hasOwn(value, "expression")
  ) {
    return value as OntologyCapabilityQueryTarget;
  }

  if (value.mode !== "WIDGET" && value.mode !== "MANUAL") {
    throw new Error("Ontology capability target mode must be WIDGET or MANUAL");
  }

  if (value.cardinality !== "ONE" && value.cardinality !== "MANY") {
    throw new Error(
      "Ontology capability target cardinality must be ONE or MANY",
    );
  }

  if (typeof value.expression !== "string" || value.expression.trim() === "") {
    throw new Error("Ontology capability target requires an expression");
  }

  if (operation === "ACTION_QUERY" && value.cardinality === "MANY") {
    throw new Error("Action query Builder supports only one target");
  }

  return value.cardinality === "MANY"
    ? {
        source: "OBJECT_SET",
        objectIds: parseBuilderManyExpression(value.expression),
      }
    : { source: "SINGLE_OBJECT", objectId: value.expression };
}

export function validateCapabilityDefinition(
  definition: OntologyCapabilityQueryDefinition,
  operation: OntologyCapabilityOperation,
  selectedCapabilityId: unknown,
  metadata?: OntologyCapabilityMetadata,
): ValidationResult {
  const shapeError = validateDefinitionShape(definition);

  if (shapeError) {
    return invalid(shapeError);
  }

  const normalized = normalizeDefinition(definition);

  if (
    operation === "ACTION_QUERY" &&
    normalized.target.source === "OBJECT_SET"
  ) {
    return invalid("Action query Builder supports only one target");
  }

  if (
    typeof selectedCapabilityId !== "string" ||
    selectedCapabilityId.trim() === "" ||
    selectedCapabilityId.trim() !== selectedCapabilityId
  ) {
    return invalid(
      `${operationLabel(operation)} query requires ${capabilityField(operation)}`,
    );
  }

  if (!metadata) {
    return { valid: true, definition: normalized };
  }

  const capability = metadata.capabilities.find(
    (candidate) => candidate.id === selectedCapabilityId,
  );

  if (!capability) {
    return invalid(
      `Unknown ${operationLabel(operation)}: ${selectedCapabilityId}`,
    );
  }

  for (const parameterId of Object.keys(normalized.parameters)) {
    const parameter = capability.parameters.find(
      (candidate) => candidate.id === parameterId,
    );

    if (!parameter) {
      return invalid(
        `Unknown ${operationLabel(operation)} parameter: ${parameterId}`,
      );
    }

    if (parameter.readOnly || parameter.derived) {
      return invalid(
        `${operationLabel(operation)} parameter is not writable: ${parameterId}`,
      );
    }
  }

  const missingRequiredParameter = capability.parameters.find(
    (parameter) =>
      parameter.required &&
      !parameter.readOnly &&
      !parameter.derived &&
      !hasOwn(normalized.parameters, parameter.id),
  );

  if (missingRequiredParameter) {
    return invalid(
      `Missing required ${operationLabel(operation)} parameter: ${missingRequiredParameter.id}`,
    );
  }

  return { valid: true, definition: normalized };
}

export function parseAdvancedCapabilityDefinition(
  text: string,
): OntologyCapabilityQueryDefinition {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("Advanced capability definition must be valid JSON", {
      cause: error,
    });
  }

  const shapeError = validateDefinitionShape(parsed);

  if (shapeError) {
    throw new Error(shapeError);
  }

  return normalizeDefinition(parsed as OntologyCapabilityQueryDefinition);
}

export function serializeCapabilityBuilderForm(
  formData: Record<string, unknown>,
  operation: OntologyCapabilityOperation,
  metadata?: OntologyCapabilityMetadata,
): string {
  const objectTypeId = unwrapBuilderValue(formData.objectTypeId);
  const selectedCapabilityId = unwrapBuilderValue(
    formData[capabilityField(operation)],
  );

  if (
    typeof objectTypeId !== "string" ||
    objectTypeId.trim() === "" ||
    objectTypeId.trim() !== objectTypeId
  ) {
    throw new Error("Ontology capability query requires objectTypeId");
  }

  const validation = validateCapabilityDefinition(
    {
      target: canonicalizeBuilderTarget(
        unwrapBuilderValue(formData.target),
        operation,
      ),
      parameters: parseBuilderParameters(
        unwrapBuilderValue(formData.parameters),
        selectedCapabilityId,
        metadata,
      ),
    },
    operation,
    selectedCapabilityId,
    metadata,
  );

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  return JSON.stringify(validation.definition);
}

export function hydrateCapabilityBuilderForm(
  definition: OntologyCapabilityQueryDefinition,
): Record<string, unknown> {
  const shapeError = validateDefinitionShape(definition);

  if (shapeError) {
    throw new Error(shapeError);
  }

  const normalized = normalizeDefinition(definition);

  const builderTarget =
    normalized.target.source === "SINGLE_OBJECT"
      ? {
          mode: "MANUAL" as const,
          cardinality: "ONE" as const,
          expression: normalized.target.objectId,
        }
      : {
          mode: "MANUAL" as const,
          cardinality: "MANY" as const,
          expression: Array.isArray(normalized.target.objectIds)
            ? JSON.stringify(normalized.target.objectIds)
            : normalized.target.objectIds,
        };

  return {
    "actionConfiguration.formData.target.data": builderTarget,
    "actionConfiguration.formData.parameters.data": normalized.parameters,
  };
}
