export type OntologyObjectQueryDefinition = {
  objectTypeId: string;
  resultMode?: "ROWS" | "TOTAL";
  projection?: string[];
  filter?: {
    conditions: Array<{
      propertyId: string;
      operator: string;
      value?: unknown;
    }>;
  };
  sort?: Array<{
    propertyId: string;
    direction: string;
  }>;
  page?: {
    offset: unknown;
    limit: unknown;
  };
};

export type OntologyQueryMetadata = {
  objectTypes: Array<{
    id: string;
    properties: Array<{
      id: string;
      hidden?: boolean;
      operators?: Array<{ value: string; requiresValue?: boolean }>;
    }>;
  }>;
};

type ValidationResult =
  | { valid: true; definition: OntologyObjectQueryDefinition }
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

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function findUnsupportedField(
  value: Record<string, unknown>,
  supportedFields: readonly string[],
  context: string,
): string | undefined {
  const supported = new Set(supportedFields);
  const field = Object.keys(value).find((key) => !supported.has(key));

  return field ? `Unsupported field in ${context}: ${field}` : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.trim() === value
  );
}

function isBinding(value: unknown): value is string {
  return typeof value === "string" && /^\{\{[\s\S]+\}\}$/.test(value);
}

function isValidPageValue(value: unknown, isLimit: boolean): boolean {
  return (
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      (!isLimit || value > 0)) ||
    isBinding(value)
  );
}

function invalid(message: string): ValidationResult {
  return { valid: false, message };
}

function findVisibleProperty(
  objectType: OntologyQueryMetadata["objectTypes"][number],
  propertyId: unknown,
):
  | OntologyQueryMetadata["objectTypes"][number]["properties"][number]
  | undefined {
  if (!isNonEmptyString(propertyId)) {
    return undefined;
  }

  return objectType.properties.find(
    (property) => property.id === propertyId && property.hidden !== true,
  );
}

function validateProjection(
  definition: Record<string, unknown>,
  objectType: OntologyQueryMetadata["objectTypes"][number],
): ValidationResult | undefined {
  if (
    !hasOwn(definition, "projection") ||
    definition.projection === undefined
  ) {
    return undefined;
  }

  if (!Array.isArray(definition.projection)) {
    return invalid("Projection must be an array of visible Property IDs");
  }

  for (const propertyId of definition.projection) {
    if (!isNonEmptyString(propertyId)) {
      return invalid("Projection must contain non-empty Property IDs");
    }

    const property = objectType.properties.find(
      (item) => item.id === propertyId,
    );
    if (!property) {
      return invalid(`Unknown Property ID in projection: ${propertyId}`);
    }
    if (property.hidden === true) {
      return invalid(
        `Projection cannot include hidden Property: ${propertyId}`,
      );
    }
  }

  return undefined;
}

function validateFilter(
  definition: Record<string, unknown>,
  objectType: OntologyQueryMetadata["objectTypes"][number],
): ValidationResult | undefined {
  if (!hasOwn(definition, "filter") || definition.filter === undefined) {
    return undefined;
  }

  if (
    !isRecord(definition.filter) ||
    !Array.isArray(definition.filter.conditions)
  ) {
    return invalid("Filter must contain a conditions array");
  }

  const filterFieldError = findUnsupportedField(
    definition.filter,
    ["conditions"],
    "filter",
  );
  if (filterFieldError) {
    return invalid(filterFieldError);
  }

  for (const condition of definition.filter.conditions) {
    if (!isRecord(condition)) {
      return invalid("Filter conditions must be objects");
    }
    const conditionFieldError = findUnsupportedField(
      condition,
      ["propertyId", "operator", "value"],
      "filter condition",
    );
    if (conditionFieldError) {
      return invalid(conditionFieldError);
    }
    if (
      !isNonEmptyString(condition.propertyId) ||
      !isNonEmptyString(condition.operator)
    ) {
      return invalid("Filter conditions require a Property ID and operator");
    }

    const property = findVisibleProperty(objectType, condition.propertyId);
    if (!property) {
      return invalid(
        `Unknown or hidden Property in filter: ${condition.propertyId}`,
      );
    }

    const operator = property.operators?.find(
      (candidate) => candidate.value === condition.operator,
    );
    if (!operator) {
      return invalid(
        `Unsupported operator for Property ${condition.propertyId}: ${condition.operator}`,
      );
    }
    const isExplicitlyValueless = operator.value === "isEmpty";
    if (!isExplicitlyValueless && !hasValue(condition.value)) {
      return invalid(`Filter operator ${condition.operator} requires a value`);
    }
  }

  return undefined;
}

function validateSort(
  definition: Record<string, unknown>,
  objectType: OntologyQueryMetadata["objectTypes"][number],
): ValidationResult | undefined {
  if (!hasOwn(definition, "sort") || definition.sort === undefined) {
    return undefined;
  }

  if (!Array.isArray(definition.sort)) {
    return invalid("Sort must be an array of Property and direction entries");
  }
  if (definition.sort.length > 1) {
    return invalid("Sort must contain exactly one property and direction");
  }

  for (const item of definition.sort) {
    if (!isRecord(item) || !isNonEmptyString(item.propertyId)) {
      return invalid("Sort entries require a Property ID and direction");
    }
    const sortFieldError = findUnsupportedField(
      item,
      ["propertyId", "direction"],
      "sort entry",
    );
    if (sortFieldError) {
      return invalid(sortFieldError);
    }
    if (
      !isBinding(item.direction) &&
      item.direction !== "ASC" &&
      item.direction !== "DESC"
    ) {
      return invalid("Sort direction must be ASC or DESC");
    }
    if (
      !isBinding(item.propertyId) &&
      !findVisibleProperty(objectType, item.propertyId)
    ) {
      return invalid(`Unknown or hidden Property in sort: ${item.propertyId}`);
    }
  }

  return undefined;
}

function validatePage(
  definition: Record<string, unknown>,
): ValidationResult | undefined {
  if (!hasOwn(definition, "page") || definition.page === undefined) {
    return undefined;
  }

  if (!isRecord(definition.page)) {
    return invalid("Pagination must contain offset and limit");
  }
  const pageFieldError = findUnsupportedField(
    definition.page,
    ["offset", "limit"],
    "pagination",
  );
  if (pageFieldError) {
    return invalid(pageFieldError);
  }
  if (!hasOwn(definition.page, "offset") || !hasOwn(definition.page, "limit")) {
    return invalid("Pagination must contain both offset and limit");
  }
  if (
    !isValidPageValue(definition.page.offset, false) ||
    !isValidPageValue(definition.page.limit, true)
  ) {
    return invalid(
      "Pagination offset must be a non-negative integer and limit must be a positive integer or bindings",
    );
  }

  return undefined;
}

function validateDefinitionShape(definition: unknown): string | undefined {
  if (!isRecord(definition)) {
    return "Ontology query definition must be an object";
  }

  const supportedFields = new Set([
    "objectTypeId",
    "resultMode",
    "projection",
    "filter",
    "sort",
    "page",
  ]);
  const unsupportedField = Object.keys(definition).find(
    (key) => !supportedFields.has(key),
  );
  if (unsupportedField) {
    return `Unsupported field in ontology query definition: ${unsupportedField}`;
  }

  if (!isNonEmptyString(definition.objectTypeId)) {
    return "Ontology query definition requires a non-empty Object Type ID";
  }

  if (
    hasOwn(definition, "resultMode") &&
    definition.resultMode !== "ROWS" &&
    definition.resultMode !== "TOTAL"
  ) {
    return "Result mode must be ROWS or TOTAL";
  }

  if (hasOwn(definition, "projection") && definition.projection !== undefined) {
    if (!Array.isArray(definition.projection)) {
      return "Projection must be an array of visible Property IDs";
    }
    if (
      definition.projection.some((propertyId) => !isNonEmptyString(propertyId))
    ) {
      return "Projection must contain non-empty Property IDs";
    }
  }

  if (hasOwn(definition, "filter") && definition.filter !== undefined) {
    if (
      !isRecord(definition.filter) ||
      !Array.isArray(definition.filter.conditions)
    ) {
      return "Filter must contain a conditions array";
    }
    const filterFieldError = findUnsupportedField(
      definition.filter,
      ["conditions"],
      "filter",
    );
    if (filterFieldError) {
      return filterFieldError;
    }
    for (const condition of definition.filter.conditions) {
      if (
        !isRecord(condition) ||
        !isNonEmptyString(condition.propertyId) ||
        !isNonEmptyString(condition.operator)
      ) {
        return "Filter conditions require a Property ID and operator";
      }
      const conditionFieldError = findUnsupportedField(
        condition,
        ["propertyId", "operator", "value"],
        "filter condition",
      );
      if (conditionFieldError) {
        return conditionFieldError;
      }
    }
  }

  if (hasOwn(definition, "sort") && definition.sort !== undefined) {
    if (!Array.isArray(definition.sort)) {
      return "Sort must be an array of Property and direction entries";
    }
    if (definition.sort.length > 1) {
      return "Sort must contain exactly one property and direction";
    }
    for (const item of definition.sort) {
      if (
        !isRecord(item) ||
        !isNonEmptyString(item.propertyId) ||
        (!isBinding(item.direction) &&
          item.direction !== "ASC" &&
          item.direction !== "DESC")
      ) {
        return "Sort entries require a Property ID and direction; direction must be ASC or DESC";
      }
      const sortFieldError = findUnsupportedField(
        item,
        ["propertyId", "direction"],
        "sort entry",
      );
      if (sortFieldError) {
        return sortFieldError;
      }
    }
  }

  if (hasOwn(definition, "page") && definition.page !== undefined) {
    const page = definition.page;
    if (!isRecord(page)) {
      return "Pagination must contain offset and limit";
    }
    const pageFieldError = findUnsupportedField(
      page,
      ["offset", "limit"],
      "pagination",
    );
    if (pageFieldError) {
      return pageFieldError;
    }
    if (!hasOwn(page, "offset") || !hasOwn(page, "limit")) {
      return "Pagination must contain both offset and limit";
    }
    if (
      !isValidPageValue(page.offset, false) ||
      !isValidPageValue(page.limit, true)
    ) {
      return "Pagination offset must be a non-negative integer and limit must be a positive integer or bindings";
    }
  }

  return undefined;
}

export function validateDefinition(
  definition: OntologyObjectQueryDefinition,
  metadata: OntologyQueryMetadata,
): ValidationResult {
  const shapeError = validateDefinitionShape(definition);
  if (shapeError) {
    return invalid(shapeError);
  }

  const objectType = metadata.objectTypes.find(
    (candidate) => candidate.id === definition.objectTypeId,
  );
  if (!objectType) {
    return invalid(`Unknown Object Type ID: ${definition.objectTypeId}`);
  }

  const validators = [
    validateProjection(definition, objectType),
    validateFilter(definition, objectType),
    validateSort(definition, objectType),
    validatePage(definition),
  ];
  const validationError = validators.find((result) => result !== undefined);
  if (validationError) {
    return validationError;
  }

  return { valid: true, definition: normalizeDefinition(definition) };
}

export function normalizeDefinition(
  definition: OntologyObjectQueryDefinition,
): OntologyObjectQueryDefinition {
  if (
    typeof definition !== "object" ||
    definition === null ||
    Array.isArray(definition) ||
    typeof definition.objectTypeId !== "string" ||
    definition.objectTypeId.trim() === ""
  ) {
    throw new Error("Ontology query definition requires objectTypeId");
  }

  const normalized: OntologyObjectQueryDefinition = {
    objectTypeId: definition.objectTypeId,
  };

  if (definition.resultMode === "ROWS" || definition.resultMode === "TOTAL") {
    normalized.resultMode = definition.resultMode;
  }

  if (
    Array.isArray(definition.projection) &&
    definition.projection.length > 0
  ) {
    normalized.projection = [...definition.projection];
  }

  if (
    definition.filter &&
    Array.isArray(definition.filter.conditions) &&
    definition.filter.conditions.length > 0
  ) {
    normalized.filter = {
      conditions: definition.filter.conditions.map((condition) => ({
        propertyId: condition.propertyId,
        operator: condition.operator,
        ...(hasValue(condition.value) ? { value: condition.value } : {}),
      })),
    };
  }

  if (Array.isArray(definition.sort) && definition.sort.length > 0) {
    normalized.sort = definition.sort.map((item) => ({
      propertyId: item.propertyId,
      direction: item.direction,
    }));
  }

  if (
    definition.page &&
    hasValue(definition.page.offset) &&
    hasValue(definition.page.limit)
  ) {
    normalized.page = {
      offset: definition.page.offset,
      limit: definition.page.limit,
    };
  }

  return normalized;
}

export function serializeBuilderForm(
  formData: Record<string, unknown>,
  pretty = false,
): string {
  const objectTypeId = unwrapBuilderValue(formData.objectTypeId);
  const projection = unwrapBuilderValue(formData.projection);
  const filter = unwrapBuilderValue(formData.filter);
  const sort = unwrapBuilderValue(formData.sort);
  const page = unwrapBuilderValue(formData.page);
  const resultMode = unwrapBuilderValue(formData.resultMode);

  return JSON.stringify(
    normalizeDefinition({
      objectTypeId: objectTypeId as string,
      resultMode: resultMode as OntologyObjectQueryDefinition["resultMode"],
      projection: projection as string[] | undefined,
      filter: filter as OntologyObjectQueryDefinition["filter"],
      sort: sort as OntologyObjectQueryDefinition["sort"],
      page: page as OntologyObjectQueryDefinition["page"],
    }),
    null,
    pretty ? 2 : 0,
  );
}

export function hydrateBuilderForm(
  definition: OntologyObjectQueryDefinition,
): Record<string, unknown> {
  const normalized = normalizeDefinition(definition);

  return {
    "actionConfiguration.formData.objectTypeId.data": normalized.objectTypeId,
    "actionConfiguration.formData.resultMode.data":
      normalized.resultMode ?? "ROWS",
    "actionConfiguration.formData.projection.data": normalized.projection ?? [],
    "actionConfiguration.formData.filter.data.conditions":
      normalized.filter?.conditions ?? [],
    "actionConfiguration.formData.sort.data": normalized.sort ?? [],
    "actionConfiguration.formData.page.data": normalized.page ?? {
      offset: 0,
      limit: 50,
    },
  };
}

export function parseAdvancedDefinition(
  text: string,
): OntologyObjectQueryDefinition {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("Advanced JSON definition must be valid JSON", {
      cause: error,
    });
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Advanced JSON definition must be an object");
  }

  const shapeError = validateDefinitionShape(parsed);
  if (shapeError) {
    throw new Error(shapeError);
  }

  return normalizeDefinition(parsed as OntologyObjectQueryDefinition);
}
