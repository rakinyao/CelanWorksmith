import type {
  CelanworksmithObjectInstance,
  CelanworksmithObjectType,
} from "api/CelanworksmithAPI";

const toSearchText = (value: unknown) => {
  if (value === undefined || value === null) return "";

  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

export const getObjectTypeLabel = (
  typeId: string,
  metadata?: CelanworksmithObjectType,
) => {
  const displayName = metadata?.displayName?.trim();

  return displayName && displayName !== typeId
    ? `${displayName} (${typeId})`
    : typeId;
};

export const filterLinkedObjects = (
  objects: CelanworksmithObjectInstance[],
  targetTypeId: string,
  search: string,
) => {
  const normalizedSearch = search.trim().toLocaleLowerCase();

  return objects.filter((object) => {
    if (object.typeId !== targetTypeId) return false;

    if (!normalizedSearch) return true;

    return [object.id, ...Object.values(object.properties)].some((value) =>
      toSearchText(value).toLocaleLowerCase().includes(normalizedSearch),
    );
  });
};

export const getLinkedObjectSummary = (
  object: CelanworksmithObjectInstance,
  metadata?: CelanworksmithObjectType,
) => {
  const orderedProperties = [...(metadata?.properties || [])]
    .filter((property) => !property.hidden)
    .sort(
      (first, second) =>
        (first.order ?? Number.MAX_SAFE_INTEGER) -
          (second.order ?? Number.MAX_SAFE_INTEGER) ||
        first.id.localeCompare(second.id),
    );
  const metadataProperty = orderedProperties.find(
    (property) => toSearchText(object.properties[property.id]) !== "",
  );

  if (metadataProperty) {
    return {
      label: metadataProperty.displayName || metadataProperty.id,
      value: toSearchText(object.properties[metadataProperty.id]),
    };
  }

  const fallback = Object.entries(object.properties).find(
    ([, value]) => toSearchText(value) !== "",
  );

  return fallback
    ? { label: fallback[0], value: toSearchText(fallback[1]) }
    : undefined;
};

export const isLinkPermissionError = (code?: string) =>
  code === "PERMISSION_DENIED";
