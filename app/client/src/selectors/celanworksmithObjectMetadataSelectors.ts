import type { CelanworksmithProperty } from "api/CelanworksmithAPI";
import type { DefaultRootState } from "react-redux";
import { getCelanworksmithApplicationBindingState } from "./celanworksmithApplicationBindingSelectors";
import { getCelanworksmithObjectsState } from "./dataTreeSelectors";

export type CelanworksmithObjectMetadataStatus =
  | "loading"
  | "ready"
  | "empty"
  | "error";

export interface CelanworksmithObjectMetadataState {
  status: CelanworksmithObjectMetadataStatus;
  isBound: boolean;
  applicationId?: string;
  error?: { message: string };
}

export interface CelanworksmithObjectTypeOption {
  value: string;
  label: string;
  description: string;
  searchText: string;
}

export interface CelanworksmithObjectPropertyOption {
  value: string;
  label: string;
  dataType: string;
  readOnly: boolean;
  derived: boolean;
}

const compareDisplayNames = <T extends { label: string; value: string }>(
  first: T,
  second: T,
) =>
  first.label.localeCompare(second.label) ||
  first.value.localeCompare(second.value);

const getUniqueProperties = (properties: CelanworksmithProperty[]) => {
  const propertiesById = new Map<string, CelanworksmithProperty>();

  properties.forEach((property) => {
    if (property.id && !propertiesById.has(property.id)) {
      propertiesById.set(property.id, property);
    }
  });

  return [...propertiesById.values()];
};

export const getCelanworksmithObjectMetadataState = (
  state: DefaultRootState,
): CelanworksmithObjectMetadataState => {
  const bindingState = getCelanworksmithApplicationBindingState(state);

  if (bindingState.status === "loading") {
    return {
      status: "loading",
      isBound: false,
      applicationId: bindingState.applicationId,
    };
  }

  if (bindingState.status === "error") {
    return {
      status: "error",
      isBound: false,
      applicationId: bindingState.applicationId,
      error: bindingState.error,
    };
  }

  if (bindingState.status !== "ready") {
    return {
      status: "empty",
      isBound: false,
      applicationId: bindingState.applicationId,
    };
  }

  const objectsState = getCelanworksmithObjectsState(state);

  if (objectsState.status === "error") {
    return {
      status: "error",
      isBound: true,
      applicationId: bindingState.applicationId,
      error: objectsState.error,
    };
  }

  if (objectsState.status === "loading" || objectsState.status === "idle") {
    return {
      status: "loading",
      isBound: true,
      applicationId: bindingState.applicationId,
    };
  }

  return {
    status: Object.values(objectsState.types).some(
      (typeState) => typeState.metadata,
    )
      ? "ready"
      : "empty",
    isBound: true,
    applicationId: bindingState.applicationId,
  };
};

export const getCelanworksmithObjectTypeOptions = (
  state: DefaultRootState,
): CelanworksmithObjectTypeOption[] => {
  const typesById = new Map<string, CelanworksmithObjectTypeOption>();

  Object.values(getCelanworksmithObjectsState(state).types).forEach(
    (typeState) => {
      const metadata = typeState.metadata;

      if (!metadata?.id || typesById.has(metadata.id)) return;

      typesById.set(metadata.id, {
        value: metadata.id,
        label: metadata.displayName,
        description: metadata.id,
        searchText: `${metadata.displayName} ${metadata.id}`,
      });
    },
  );

  return [...typesById.values()].sort(compareDisplayNames);
};

export const getCelanworksmithPropertyOptions = (
  state: DefaultRootState,
  objectTypeId?: string,
): CelanworksmithObjectPropertyOption[] => {
  if (!objectTypeId) return [];

  const typeState = getCelanworksmithObjectsState(state).types[objectTypeId];
  const properties = typeState?.metadata?.properties || [];

  return getUniqueProperties(properties)
    .map((property) => ({
      value: property.id,
      label: property.displayName,
      dataType: property.dataType,
      readOnly: property.readOnly,
      derived: property.derived,
    }))
    .sort(compareDisplayNames);
};
