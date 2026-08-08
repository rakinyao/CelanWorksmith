import type {
  CelanworksmithObjectInstance,
  CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";

export type ObjectSetWidgetState =
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "permissionDenied"
  | "typeMismatch";

export interface ObjectSetOption {
  label: string;
  value: string | number | boolean;
}

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const getPropertyValue = (
  object: CelanworksmithObjectInstance,
  propertyId: string,
) => object.properties[propertyId];

export const getObjectSetRows = (
  result?: CelanworksmithObjectSet,
): CelanworksmithObjectInstance[] => result?.items || [];

export const getObjectSetOptions = (
  result: CelanworksmithObjectSet | undefined,
  displayPropertyId: string | undefined,
  valuePropertyId: string | undefined,
): { options: ObjectSetOption[]; state: "ready" | "typeMismatch" } => {
  if (!result || !displayPropertyId || !valuePropertyId) {
    return { options: [], state: "typeMismatch" };
  }

  const options = result.items.map((object) => {
    const display = getPropertyValue(object, displayPropertyId);
    const value = getPropertyValue(object, valuePropertyId);

    if (!isScalar(display) || !isScalar(value)) return undefined;

    return { label: String(display), value };
  });

  if (options.some((option) => !option)) {
    return { options: [], state: "typeMismatch" };
  }

  return { options: options as ObjectSetOption[], state: "ready" };
};
