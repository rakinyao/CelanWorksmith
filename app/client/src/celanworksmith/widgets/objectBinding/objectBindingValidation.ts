import { selectObjectBindingObjectType } from "./objectBindingSelectors";
import {
  OBJECT_BINDING_SOURCES,
  type ObjectBinding,
  type ObjectBindingIssue,
  type ObjectBindingMetadata,
  type ObjectBindingPropertyKey,
} from "./types";

const PROPERTY_KEYS: ObjectBindingPropertyKey[] = [
  "selectedPropertyIds",
  "labelPropertyId",
  "groupPropertyId",
  "displayPropertyId",
  "valuePropertyId",
];

const getPropertyIds = (
  binding: ObjectBinding,
  propertyKey: ObjectBindingPropertyKey,
) => {
  const value = binding[propertyKey];

  return Array.isArray(value) ? value : value === undefined ? [] : [value];
};

const getExpectedDataTypes = (
  binding: ObjectBinding,
  propertyKey: ObjectBindingPropertyKey,
) => {
  const configured = binding.propertyDataTypes?.[propertyKey];

  if (!configured) return undefined;

  return Array.isArray(configured) ? configured : [configured];
};

export const validateObjectBinding = (
  binding: ObjectBinding,
  metadata: ObjectBindingMetadata,
): ObjectBindingIssue[] => {
  if (!binding.objectTypeId) return [{ code: "MISSING_OBJECT_TYPE" }];

  const objectType = selectObjectBindingObjectType(
    metadata,
    binding.objectTypeId,
  );

  if (!objectType || !("properties" in objectType)) {
    return [
      { code: "DELETED_OBJECT_TYPE", objectTypeId: binding.objectTypeId },
    ];
  }

  const issues: ObjectBindingIssue[] = [];

  if (
    binding.source !== undefined &&
    !OBJECT_BINDING_SOURCES.includes(
      binding.source as (typeof OBJECT_BINDING_SOURCES)[number],
    )
  ) {
    issues.push({ code: "INVALID_SOURCE", source: binding.source });
  }

  if (
    binding.linkTypeId &&
    metadata.links &&
    !metadata.links.some((link) => link.id === binding.linkTypeId)
  ) {
    issues.push({ code: "DELETED_LINK", linkTypeId: binding.linkTypeId });
  }

  if (
    binding.actionId &&
    metadata.actions &&
    !metadata.actions.some((action) => action.id === binding.actionId)
  ) {
    issues.push({ code: "DELETED_ACTION", actionId: binding.actionId });
  }

  const variableNames = Array.isArray(metadata.variables)
    ? metadata.variables
    : metadata.variables
      ? Object.keys(metadata.variables)
      : undefined;

  if (
    binding.aggregationVariableName &&
    variableNames &&
    !variableNames.includes(binding.aggregationVariableName)
  ) {
    issues.push({
      code: "DELETED_VARIABLE",
      variableName: binding.aggregationVariableName,
    });
  }

  PROPERTY_KEYS.forEach((propertyKey) => {
    const expectedDataTypes = getExpectedDataTypes(binding, propertyKey);

    getPropertyIds(binding, propertyKey).forEach((propertyId) => {
      if (!propertyId) {
        issues.push({ code: "MISSING_PROPERTY" });

        return;
      }

      const property = objectType.properties.find(
        (candidate) => candidate.id === propertyId,
      );

      if (!property) {
        issues.push({
          code: "DELETED_PROPERTY",
          objectTypeId: binding.objectTypeId,
          propertyId,
        });

        return;
      }

      if (expectedDataTypes && !expectedDataTypes.includes(property.dataType)) {
        issues.push({
          code: "INCOMPATIBLE_PROPERTY_TYPE",
          expectedDataTypes,
          objectTypeId: binding.objectTypeId,
          propertyId,
          receivedDataType: property.dataType,
        });
      }
    });
  });

  return issues;
};
