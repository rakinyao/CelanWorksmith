export interface OntologyQueryCandidate {
  config?: {
    name?: unknown;
    actionConfiguration?: { formData?: Record<string, unknown> };
  };
  actionConfiguration?: { formData?: Record<string, unknown> };
}

interface TableCandidate {
  type?: unknown;
  tableData?: unknown;
}

interface OntologyTableTargetProvenance {
  objectTypeId: string;
  projection?: string[];
}

const TABLE_QUERY_DATA_BINDING = /^\s*\{\{\s*([A-Za-z_$][\w$]*)\.data\s*}}\s*$/;
const ONTOLOGY_TARGET_TABLE_WIDGET_TYPES = new Set([
  "TABLE_WIDGET",
  "TABLE_WIDGET_V2",
  "WDS_TABLE_WIDGET",
]);

export function isOntologyTargetTableWidgetType(type: unknown): type is string {
  return (
    typeof type === "string" && ONTOLOGY_TARGET_TABLE_WIDGET_TYPES.has(type)
  );
}

function readControlData(value: unknown): unknown {
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

export function resolveOntologyTableTargetProvenance(
  table: TableCandidate,
  actions: OntologyQueryCandidate[],
): OntologyTableTargetProvenance | undefined {
  if (
    !isOntologyTargetTableWidgetType(table.type) ||
    typeof table.tableData !== "string"
  ) {
    return undefined;
  }

  const queryName = TABLE_QUERY_DATA_BINDING.exec(table.tableData)?.[1];
  const query = actions.find((action) => action.config?.name === queryName);
  const formData =
    query?.config?.actionConfiguration?.formData ??
    query?.actionConfiguration?.formData;

  if (readControlData(formData?.operation) !== "OBJECT_QUERY") {
    return undefined;
  }

  const queryMode = readControlData(formData?.queryMode);

  if (queryMode === "ADVANCED") {
    const definition = readAdvancedDefinition(
      readControlData(formData?.definition),
    );

    if (!definition || typeof definition.objectTypeId !== "string") {
      return undefined;
    }

    const projection = definition.projection;

    if (
      projection !== undefined &&
      (!Array.isArray(projection) ||
        !projection.every((property) => typeof property === "string"))
    ) {
      return undefined;
    }

    return {
      objectTypeId: definition.objectTypeId,
      projection: Array.isArray(projection) ? projection : [],
    };
  }

  const objectTypeId = readControlData(formData?.objectTypeId);

  return typeof objectTypeId === "string" && objectTypeId.trim()
    ? { objectTypeId }
    : undefined;
}

function readAdvancedDefinition(
  value: unknown,
): Record<string, unknown> | undefined {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);

    return parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
