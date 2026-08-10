import type {
  CelanworksmithObjectType,
  CelanworksmithProperty,
} from "api/CelanworksmithAPI";
import { getFieldLayout } from "celanworksmith/fieldMetadataLayout";

export enum ObjectDetailDisplayMode {
  BUSINESS_ONLY = "BUSINESS_ONLY",
  BUSINESS_AND_DERIVED = "BUSINESS_AND_DERIVED",
  ALL_METADATA = "ALL_METADATA",
}

export interface NormalizedObjectData {
  id: string;
  typeId: string;
  properties: Record<string, unknown>;
}

export interface ObjectDetailProperty {
  id: string;
  label: string;
  value: unknown;
  dataType: string;
}

export interface ObjectDetailPropertyGroup {
  id: string;
  label: string;
  properties: ObjectDetailProperty[];
}

export interface ObjectPropertyValue {
  state: "empty" | "ready" | "typeMismatch";
  value?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const toLabel = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase());

const toProperty = (
  property: CelanworksmithProperty,
  values: Record<string, unknown>,
): ObjectDetailProperty => ({
  id: property.id,
  label: property.displayName || toLabel(property.id),
  value: values[property.id],
  dataType: property.dataType,
});

export const normalizeObjectData = (
  value: unknown,
): NormalizedObjectData | undefined => {
  if (!isRecord(value)) return undefined;

  const { id, typeId } = value;

  if (typeof id !== "string" || !id || typeof typeId !== "string" || !typeId) {
    return undefined;
  }

  const flatProperties = Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => key !== "id" && key !== "typeId" && key !== "properties",
    ),
  );
  const nestedProperties = isRecord(value.properties) ? value.properties : {};

  return {
    id,
    typeId,
    properties: { ...flatProperties, ...nestedProperties },
  };
};

export const getObjectIdentity = (
  value: NormalizedObjectData | undefined,
): string | undefined => (value ? `${value.typeId}/${value.id}` : undefined);

export const getObjectPropertyValue = (
  value: unknown,
  propertyId: string | undefined,
): ObjectPropertyValue => {
  const object = normalizeObjectData(value);

  if (!object) return { state: "empty" };

  if (!propertyId || !Object.hasOwn(object.properties, propertyId)) {
    return { state: "typeMismatch" };
  }

  return { state: "ready", value: object.properties[propertyId] };
};

export const groupObjectProperties = (
  object: NormalizedObjectData,
  metadata: CelanworksmithObjectType | undefined,
  displayMode: ObjectDetailDisplayMode,
): ObjectDetailPropertyGroup[] => {
  const groups: ObjectDetailPropertyGroup[] = [
    {
      id: "basic",
      label: "Basic",
      properties: [
        { id: "id", label: "ID", value: object.id, dataType: "STRING" },
        {
          id: "typeId",
          label: "Type",
          value: object.typeId,
          dataType: "STRING",
        },
      ],
    },
  ];

  const metadataProperties = metadata?.properties || [];
  const fieldGroups = getFieldLayout(metadataProperties, {
    includeDerived: displayMode !== ObjectDetailDisplayMode.BUSINESS_ONLY,
  });

  groups.push(
    ...fieldGroups.map((group) => ({
      ...group,
      properties: group.properties.map((property) =>
        toProperty(property, object.properties),
      ),
    })),
  );

  if (displayMode === ObjectDetailDisplayMode.ALL_METADATA) {
    const metadataIds = new Set(
      metadataProperties.map((property) => property.id),
    );
    const unknownProperties = Object.entries(object.properties)
      .filter(([id]) => !metadataIds.has(id))
      .map(([id, value]) => ({
        id,
        label: toLabel(id),
        value,
        dataType: "STRING",
      }));

    if (unknownProperties.length) {
      const allMetadataGroup = groups.find((group) => group.id === "business");

      if (allMetadataGroup) {
        allMetadataGroup.properties.push(...unknownProperties);
      } else {
        groups.push({
          id: "business",
          label: "Business",
          properties: unknownProperties,
        });
      }
    }
  }

  return groups;
};
