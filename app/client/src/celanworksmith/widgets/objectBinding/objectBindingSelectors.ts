const WIDGET_OBJECT_META_OUTPUTS = new Set([
  "selectedObject",
  "selectedObjects",
  "object",
  "objectData",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const getExpressionPath = (expression: unknown) => {
  if (typeof expression !== "string") return undefined;

  const match = expression.match(/^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/);

  return match?.[1]?.split(".").filter(Boolean);
};

const getObjectTypeId = (value: unknown) => {
  if (isRecord(value) && typeof value.typeId === "string") {
    return value.typeId;
  }

  if (Array.isArray(value) && value.length === 1) {
    return getObjectTypeId(value[0]);
  }

  return undefined;
};

export const inferObjectTypeId = (
  expression: unknown,
  dataTree: Record<string, unknown> | undefined,
) => {
  const path = getExpressionPath(expression);

  if (!path || !dataTree || path.length < 2) return undefined;

  if (path[0] === "$objects") {
    const [, objectTypeId] = path;
    const objects = dataTree.$objects;

    if (
      !isRecord(objects) ||
      !objectTypeId ||
      !isRecord(objects[objectTypeId])
    ) {
      return undefined;
    }

    const objectType = objects[objectTypeId];

    return Array.isArray(objectType.all) || isRecord(objectType._meta)
      ? objectTypeId
      : undefined;
  }

  if (path.length !== 2) return undefined;

  const [entityName, outputName] = path;
  const entity = dataTree[entityName];

  if (!isRecord(entity)) return undefined;

  if (outputName === "data") return getObjectTypeId(entity.data);

  if (!WIDGET_OBJECT_META_OUTPUTS.has(outputName)) return undefined;

  return getObjectTypeId(entity[outputName]) || getObjectTypeId(entity.meta);
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
