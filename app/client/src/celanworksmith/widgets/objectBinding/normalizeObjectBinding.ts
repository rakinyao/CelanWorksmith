import { inferObjectTypeId } from "./objectBindingSelectors";
import { validateObjectBinding } from "./objectBindingValidation";
import { objectKeys } from "@appsmith/utils";
import type {
  BindingMode,
  NormalizedObjectBinding,
  ObjectBinding,
  ObjectBindingMetadata,
  ObjectBindingSource,
} from "./types";
import { getObjectBindingModeProperty } from "./types";

type WidgetBindingProps = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const asString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const asStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string")
    ? [...value]
    : undefined;

const CHART_VALUE_DATA_TYPES = ["INTEGER", "DECIMAL"];

const getMode = (
  widgetType: string,
  widgetProps: WidgetBindingProps,
): BindingMode => {
  const modeProperty = getObjectBindingModeProperty(widgetType);
  const mode = modeProperty ? widgetProps[modeProperty] : undefined;

  return mode === "OBJECT" ? "OBJECT" : "QUERY";
};

const FILTER_OPERATORS = new Set([
  "equals",
  "contains",
  "startsWith",
  "gt",
  "gte",
  "lt",
  "lte",
  "isEmpty",
]);

const getFilterTypeId = (filter: unknown) =>
  isRecord(filter) &&
  typeof filter.typeId === "string" &&
  filter.version === 1 &&
  Array.isArray(filter.conditions) &&
  filter.conditions.every(
    (condition) =>
      isRecord(condition) &&
      typeof condition.propertyId === "string" &&
      FILTER_OPERATORS.has(String(condition.operator)),
  )
    ? filter.typeId
    : undefined;

const getSource = (binding: ObjectBinding): ObjectBindingSource | string => {
  if (binding.source) return binding.source;

  if (binding.filter !== undefined) return "FILTER";

  if (binding.objectPath || binding.objectIdPath) return "INSTANCE";

  if (binding.linkTypeId) return "LINKED";

  if (
    binding.selectedPropertyIds?.length ||
    binding.labelPropertyId ||
    binding.groupPropertyId ||
    binding.displayPropertyId ||
    binding.valuePropertyId
  ) {
    return "PROPERTY";
  }

  return "ALL";
};

const getBinding = (
  widgetType: string,
  widgetProps: WidgetBindingProps,
  metadata: ObjectBindingMetadata,
  mode: BindingMode,
): ObjectBinding => {
  const filter =
    widgetProps.objectFilter !== undefined
      ? widgetProps.objectFilter
      : widgetProps.filter;
  const objectPath = asString(widgetProps.objectPath || widgetProps.objectData);
  const explicitObjectTypeId = asString(widgetProps.objectTypeId);
  const inferredObjectTypeId =
    getFilterTypeId(filter) || inferObjectTypeId(objectPath, metadata.dataTree);
  const propertyDataTypes = isRecord(widgetProps.propertyDataTypes)
    ? (widgetProps.propertyDataTypes as ObjectBinding["propertyDataTypes"])
    : undefined;
  const binding: ObjectBinding = {
    objectTypeId: explicitObjectTypeId || inferredObjectTypeId,
    source: asString(widgetProps.source),
    objectPath,
    objectIdPath: asString(widgetProps.objectIdPath),
    filter,
    selectedPropertyIds: asStringArray(widgetProps.selectedPropertyIds),
    labelPropertyId: asString(widgetProps.labelPropertyId),
    groupPropertyId: asString(widgetProps.groupPropertyId),
    displayPropertyId: asString(widgetProps.displayPropertyId),
    valuePropertyId: asString(widgetProps.valuePropertyId),
    aggregationVariableName: asString(widgetProps.aggregationVariableName),
    linkTypeId: asString(widgetProps.linkTypeId),
    actionId: asString(widgetProps.actionId || widgetProps.objectActionId),
    propertyDataTypes:
      widgetType === "CHART_WIDGET" && mode === "OBJECT"
        ? {
            ...propertyDataTypes,
            valuePropertyId: CHART_VALUE_DATA_TYPES,
          }
        : propertyDataTypes,
  };

  objectKeys(binding).forEach((key) => {
    if (binding[key as keyof ObjectBinding] === undefined)
      delete binding[key as keyof ObjectBinding];
  });

  return { ...binding, source: getSource(binding) };
};

export const normalizeObjectBinding = (
  widgetType: string,
  widgetProps: WidgetBindingProps,
  metadata: ObjectBindingMetadata,
): NormalizedObjectBinding => {
  const mode = getMode(widgetType, widgetProps);
  const binding = getBinding(widgetType, widgetProps, metadata, mode);

  return {
    mode,
    binding,
    issues: mode === "OBJECT" ? validateObjectBinding(binding, metadata) : [],
  };
};
