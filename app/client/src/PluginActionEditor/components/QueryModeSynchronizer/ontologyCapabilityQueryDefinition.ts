export type OntologyCapabilityOperation = "FUNCTION_QUERY" | "ACTION_QUERY";

export interface OntologyCapabilityQueryDefinition {
  target: {
    source: "SINGLE_OBJECT";
    objectId: string;
  };
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
  | { valid: false; message: string };

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
  return { valid: false, message };
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

function normalizeDefinition(
  definition: OntologyCapabilityQueryDefinition,
): OntologyCapabilityQueryDefinition {
  return {
    target: {
      source: "SINGLE_OBJECT",
      objectId: definition.target.objectId,
    },
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

  const unsupportedTargetField = Object.keys(value.target).find(
    (key) => key !== "source" && key !== "objectId",
  );

  if (unsupportedTargetField) {
    return `Unsupported field in ontology capability target: ${unsupportedTargetField}`;
  }

  if (value.target.source !== "SINGLE_OBJECT") {
    return "Ontology capability target source must be SINGLE_OBJECT";
  }

  if (
    typeof value.target.objectId !== "string" ||
    value.target.objectId.trim() === ""
  ) {
    return "Ontology capability target requires an object ID";
  }

  if (!isRecord(value.parameters)) {
    return "Ontology capability query definition requires parameters to be an object";
  }

  return undefined;
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

  if (
    typeof objectTypeId !== "string" ||
    objectTypeId.trim() === "" ||
    objectTypeId.trim() !== objectTypeId
  ) {
    throw new Error("Ontology capability query requires objectTypeId");
  }

  const validation = validateCapabilityDefinition(
    {
      target: unwrapBuilderValue(
        formData.target,
      ) as OntologyCapabilityQueryDefinition["target"],
      parameters: parseParameters(unwrapBuilderValue(formData.parameters)),
    },
    operation,
    unwrapBuilderValue(formData[capabilityField(operation)]),
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

  return {
    "actionConfiguration.formData.target.data": normalized.target,
    "actionConfiguration.formData.parameters.data": normalized.parameters,
  };
}
