import type { CelanworksmithProperty } from "api/CelanworksmithAPI";

export type DefaultFieldControl =
  | "checkbox"
  | "datetime-local"
  | "number"
  | "reference"
  | "select"
  | "text";

export interface FieldLayoutGroup {
  id: string;
  label: string;
  properties: CelanworksmithProperty[];
}

export interface FieldLayoutOptions {
  includeDerived?: boolean;
  includeHidden?: boolean;
}

const fieldControls: Record<string, DefaultFieldControl> = {
  BOOLEAN: "checkbox",
  DATETIME: "datetime-local",
  DECIMAL: "number",
  ENUM: "select",
  INTEGER: "number",
  REFERENCE: "reference",
  STRING: "text",
};

const getGroup = (property: CelanworksmithProperty) => {
  const group = property.group?.trim();

  if (group) return { id: `group:${group}`, label: group };

  return property.derived
    ? { id: "derived", label: "Derived" }
    : { id: "business", label: "Business" };
};

const compareFields = (
  left: { index: number; property: CelanworksmithProperty },
  right: { index: number; property: CelanworksmithProperty },
) => {
  const leftHasOrder = typeof left.property.order === "number";
  const rightHasOrder = typeof right.property.order === "number";

  if (leftHasOrder && !rightHasOrder) return -1;

  if (!leftHasOrder && rightHasOrder) return 1;

  if (leftHasOrder && rightHasOrder) {
    const difference = left.property.order! - right.property.order!;

    if (difference) return difference;
  }

  return left.index - right.index;
};

export const getDefaultFieldControl = (dataType: string) =>
  fieldControls[dataType];

export const isFieldEditable = (property: CelanworksmithProperty) =>
  !property.readOnly && !property.derived;

export const getFieldLayout = (
  properties: CelanworksmithProperty[],
  options: FieldLayoutOptions = {},
): FieldLayoutGroup[] => {
  const grouped = new Map<string, FieldLayoutGroup>();

  properties
    .map((property, index) => ({ index, property }))
    .filter(
      ({ property }) =>
        (options.includeHidden || !property.hidden) &&
        (options.includeDerived || !property.derived),
    )
    .sort(compareFields)
    .forEach(({ property }) => {
      const group = getGroup(property);
      const layoutGroup = grouped.get(group.id) || {
        ...group,
        properties: [],
      };

      layoutGroup.properties.push(property);
      grouped.set(group.id, layoutGroup);
    });

  const businessGroup = grouped.get("business");
  const derivedGroup = grouped.get("derived");
  const customGroups = Array.from(grouped.values()).filter(
    (group) => group.id !== "business" && group.id !== "derived",
  );

  return [
    ...(businessGroup ? [businessGroup] : []),
    ...customGroups,
    ...(derivedGroup ? [derivedGroup] : []),
  ];
};
