import { ENTITY_TYPE } from "ee/entities/DataTree/types";

const OBJECT_QUERY_ENTITY_TYPE = "CELANWORKSMITH_OBJECT_QUERY";
const OBJECT_QUERY_RESULT_FIELDS = ["items", "limit", "offset", "total"];
const OBJECT_LOAD_STATUSES = new Set([
  "idle",
  "loading",
  "ready",
  "empty",
  "error",
]);
const WIDGET_OBJECT_META_OUTPUTS = new Set([
  "selectedObject",
  "selectedObjects",
]);
const WIDGET_OBJECT_OUTPUT_TYPES = new Set(["TABLE_WIDGET", "TABLE_WIDGET_V2"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isObjectTypeDataTreeEntry = (value: unknown): boolean => {
  if (!isRecord(value) || !Array.isArray(value.all) || !isRecord(value._meta)) {
    return false;
  }

  const { _meta: meta } = value;

  return (
    value.all.every(isRecord) &&
    typeof meta.status === "string" &&
    OBJECT_LOAD_STATUSES.has(meta.status) &&
    typeof meta.total === "number" &&
    (meta.updatedAt === undefined || typeof meta.updatedAt === "number") &&
    (meta.error === undefined ||
      (isRecord(meta.error) &&
        typeof meta.error.code === "string" &&
        typeof meta.error.message === "string"))
  );
};

const getExpressionPath = (expression: unknown) => {
  if (typeof expression !== "string") return undefined;

  const match = expression.match(/^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/);

  return match?.[1]?.split(".").filter(Boolean);
};

const isObjectInstance = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.typeId === "string" &&
  isRecord(value.properties);

const getObjectInstanceTypeId = (value: unknown) => {
  if (isObjectInstance(value)) {
    return value.typeId;
  }

  if (Array.isArray(value) && value.length > 0) {
    const typeId = getObjectInstanceTypeId(value[0]);

    return typeId &&
      value.every((item) => getObjectInstanceTypeId(item) === typeId)
      ? typeId
      : undefined;
  }

  return undefined;
};

const isObjectQueryResult = (
  value: unknown,
): value is Record<string, unknown> =>
  isRecord(value) &&
  typeof value.typeId === "string" &&
  Array.isArray(value.items) &&
  OBJECT_QUERY_RESULT_FIELDS.slice(1).every(
    (field) => typeof value[field] === "number",
  ) &&
  value.items.every((item) => getObjectInstanceTypeId(item) === value.typeId);

export const inferObjectTypeId = (
  expression: unknown,
  dataTree: Record<string, unknown> | undefined,
) => {
  const path = getExpressionPath(expression);

  if (!path || !dataTree || path.length < 2) return undefined;

  if (path[0] === "$objects") {
    const [, objectTypeId, outputName] = path;
    const objects = dataTree.$objects;

    if (
      path.length !== 3 ||
      !isRecord(objects) ||
      objects.ENTITY_TYPE !== ENTITY_TYPE.CELANWORKSMITH_OBJECTS ||
      !objectTypeId ||
      outputName !== "all" ||
      !isObjectTypeDataTreeEntry(objects[objectTypeId])
    ) {
      return undefined;
    }

    return objectTypeId;
  }

  if (path.length !== 2) return undefined;

  const [entityName, outputName] = path;
  const entity = dataTree[entityName];

  if (!isRecord(entity)) return undefined;

  if (
    outputName === "data" &&
    entity.ENTITY_TYPE === OBJECT_QUERY_ENTITY_TYPE &&
    isObjectQueryResult(entity.data)
  ) {
    return entity.data.typeId;
  }

  if (
    entity.ENTITY_TYPE !== ENTITY_TYPE.WIDGET ||
    !WIDGET_OBJECT_OUTPUT_TYPES.has(String(entity.type)) ||
    !WIDGET_OBJECT_META_OUTPUTS.has(outputName)
  ) {
    return undefined;
  }

  return getObjectInstanceTypeId(entity[outputName]);
};

export const selectObjectBindingObjectType = (
  metadata: {
    objectTypes?:
      | readonly { id: string }[]
      | Readonly<Record<string, { id: string } | undefined>>;
    types?: Readonly<Record<string, { metadata?: { id: string } | undefined }>>;
  },
  objectTypeId: string | undefined,
) => {
  if (!objectTypeId) return undefined;

  if (Array.isArray(metadata.objectTypes)) {
    return metadata.objectTypes.find(
      (objectType) => objectType.id === objectTypeId,
    );
  }

  return (
    metadata.objectTypes?.[objectTypeId] ||
    metadata.types?.[objectTypeId]?.metadata
  );
};
