import type {
  CelanworksmithAction,
  CelanworksmithActionExecutionRequest,
} from "api/CelanworksmithAPI";
import { isEqual } from "lodash";
import {
  normalizeObjectData,
  type NormalizedObjectData,
} from "widgets/ObjectDetailWidget/widget/objectDetailUtils";
import type { CelanworksmithProperty } from "api/CelanworksmithAPI";

export type ObjectActionValidationCode =
  | "ACTION_MISSING"
  | "DERIVED"
  | "INVALID_ENUM"
  | "INVALID_REFERENCE"
  | "MAX_LENGTH"
  | "MAX_VALUE"
  | "MIN_LENGTH"
  | "MIN_VALUE"
  | "OBJECT_REQUIRED"
  | "OBJECT_TYPE_MISMATCH"
  | "PARAMETERS_OBJECT"
  | "READ_ONLY"
  | "REQUIRED"
  | "TYPE_MISMATCH";

export interface ObjectActionValidationIssue {
  code: ObjectActionValidationCode;
  displayName?: string;
  objectTypeId?: string;
  propertyId?: string;
  path: string;
  message: string;
}

export interface ObjectActionValidationSummary {
  issues: ObjectActionValidationIssue[];
  firstIssue?: ObjectActionValidationIssue;
  errorPath?: string;
  summary?: string;
}

export interface FieldValidationOptions {
  objectTypeId?: string;
  path?: string;
  uneditedValue?: unknown;
}

type ValidationProperty = CelanworksmithProperty & {
  maximum?: number;
  maximumLength?: number;
  minimum?: number;
  minimumLength?: number;
  max?: number;
  maxLength?: number;
  min?: number;
  minLength?: number;
};

export interface ObjectBindingValidation {
  valid: boolean;
  error?: string;
  object?: NormalizedObjectData;
  issues: ObjectActionValidationIssue[];
  firstIssue?: ObjectActionValidationIssue;
  errorPath?: string;
  summary?: string;
}

export interface ActionBindingValidation extends ObjectBindingValidation {
  request?: CelanworksmithActionExecutionRequest;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isMissing = (value: unknown) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "");

const getPath = (propertyId: string, options?: FieldValidationOptions) =>
  options?.path ? `${options.path}.${propertyId}` : propertyId;

const getDisplayPath = (path: string, options?: FieldValidationOptions) =>
  options?.objectTypeId ? `${options.objectTypeId}.${path}` : path;

const createIssue = (
  code: ObjectActionValidationCode,
  property: Pick<CelanworksmithProperty, "id" | "displayName"> | undefined,
  message: string,
  options?: FieldValidationOptions,
  path = property ? getPath(property.id, options) : options?.path || "action",
): ObjectActionValidationIssue => ({
  code,
  displayName: property?.displayName,
  objectTypeId: options?.objectTypeId,
  propertyId: property?.id,
  path,
  message,
});

const createSummary = (
  issues: ObjectActionValidationIssue[],
): ObjectActionValidationSummary => {
  const firstIssue = issues[0];

  return {
    errorPath: firstIssue?.path,
    firstIssue,
    issues,
    summary: firstIssue
      ? `${issues.length} validation error${issues.length === 1 ? "" : "s"}. Fix ${firstIssue.path}: ${firstIssue.message}`
      : undefined,
  };
};

const hasNumericConstraint = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const getNumericConstraint = (
  property: ValidationProperty,
  ...keys: (keyof ValidationProperty)[]
) => {
  const key = keys.find((candidate) =>
    hasNumericConstraint(property[candidate]),
  );

  return key ? (property[key] as number) : undefined;
};

const getTypeErrorMessage = (
  value: unknown,
  property: CelanworksmithProperty,
  options?: FieldValidationOptions,
) => {
  const expected = property.dataType;
  const actual = value === null ? "null" : typeof value;
  const article = /^[AEIOU]/.test(expected) ? "an" : "a";
  const path = options?.objectTypeId
    ? `${options.objectTypeId}.${property.id}`
    : getPath(property.id, options);

  return `${path} must be ${article} ${expected} value; received ${actual}.`;
};

export const validateFieldValue = (
  value: unknown,
  property: CelanworksmithProperty,
  options: FieldValidationOptions = {},
): ObjectActionValidationIssue[] => {
  const path = getPath(property.id, options);
  const displayPath = getDisplayPath(path, options);
  const validationProperty = property as ValidationProperty;

  if (isMissing(value)) {
    return property.required
      ? [
          createIssue(
            "REQUIRED",
            property,
            `${displayPath} is required.`,
            options,
          ),
        ]
      : [];
  }

  const matchesUneditedValue =
    options.uneditedValue !== undefined &&
    isEqual(value, options.uneditedValue);

  if (property.readOnly && !matchesUneditedValue) {
    return [
      createIssue(
        "READ_ONLY",
        property,
        `${displayPath} is read-only and cannot be edited.`,
        options,
      ),
    ];
  }

  if (property.derived && !matchesUneditedValue) {
    return [
      createIssue(
        "DERIVED",
        property,
        `${displayPath} is derived and cannot be edited.`,
        options,
      ),
    ];
  }

  const isValidType = validateParameterType(value, property.dataType);

  if (!isValidType) {
    return [
      createIssue(
        "TYPE_MISMATCH",
        property,
        getTypeErrorMessage(value, property, options),
        options,
      ),
    ];
  }

  if (
    property.dataType === "ENUM" &&
    property.enumValues?.length &&
    !property.enumValues.includes(value as string)
  ) {
    return [
      createIssue(
        "INVALID_ENUM",
        property,
        `${displayPath} must be one of: ${property.enumValues.join(", ")}.`,
        options,
      ),
    ];
  }

  if (
    property.dataType === "REFERENCE" &&
    typeof value === "string" &&
    !value.trim()
  ) {
    return [
      createIssue(
        "INVALID_REFERENCE",
        property,
        `${displayPath} must identify a referenced object.`,
        options,
      ),
    ];
  }

  const issues: ObjectActionValidationIssue[] = [];
  const minimum = getNumericConstraint(validationProperty, "minimum", "min");
  const maximum = getNumericConstraint(validationProperty, "maximum", "max");
  const minimumLength = getNumericConstraint(
    validationProperty,
    "minimumLength",
    "minLength",
  );
  const maximumLength = getNumericConstraint(
    validationProperty,
    "maximumLength",
    "maxLength",
  );

  if (minimum !== undefined && typeof value === "number" && value < minimum) {
    issues.push(
      createIssue(
        "MIN_VALUE",
        property,
        `${displayPath} must be at least ${minimum}.`,
        options,
      ),
    );
  }

  if (maximum !== undefined && typeof value === "number" && value > maximum) {
    issues.push(
      createIssue(
        "MAX_VALUE",
        property,
        `${displayPath} must be at most ${maximum}.`,
        options,
      ),
    );
  }

  if (
    minimumLength !== undefined &&
    typeof value === "string" &&
    value.length < minimumLength
  ) {
    issues.push(
      createIssue(
        "MIN_LENGTH",
        property,
        `${displayPath} must contain at least ${minimumLength} characters.`,
        options,
      ),
    );
  }

  if (
    maximumLength !== undefined &&
    typeof value === "string" &&
    value.length > maximumLength
  ) {
    issues.push(
      createIssue(
        "MAX_LENGTH",
        property,
        `${displayPath} must contain at most ${maximumLength} characters.`,
        options,
      ),
    );
  }

  return issues;
};

export const validateFieldValues = (
  values: Record<string, unknown>,
  properties: CelanworksmithProperty[],
  options: FieldValidationOptions = {},
) => {
  const issues = properties.flatMap((property) =>
    validateFieldValue(values[property.id], property, options),
  );

  return createSummary(issues);
};

export const validateParameterType = (value: unknown, dataType: string) => {
  switch (dataType) {
    case "INTEGER":
      return typeof value === "number" && Number.isInteger(value);
    case "DECIMAL":
      return typeof value === "number" && Number.isFinite(value);
    case "BOOLEAN":
      return typeof value === "boolean";
    case "STRING":
    case "ENUM":
    case "REFERENCE":
      return typeof value === "string";
    case "DATETIME":
      return (
        typeof value === "string" &&
        value.trim() !== "" &&
        Number.isFinite(Date.parse(value))
      );
    default:
      return true;
  }
};

export const validateObjectBinding = (
  objectData: unknown,
  expectedObjectTypeId?: string,
): ObjectBindingValidation => {
  const object = normalizeObjectData(objectData);

  if (!object) {
    const issues = [
      createIssue(
        "OBJECT_REQUIRED",
        undefined,
        "Object data must include both id and typeId.",
        { path: "objectData" },
        "objectData",
      ),
    ];

    return {
      valid: false,
      error: issues[0].message,
      ...createSummary(issues),
    };
  }

  if (expectedObjectTypeId && object.typeId !== expectedObjectTypeId) {
    const issues = [
      createIssue(
        "OBJECT_TYPE_MISMATCH",
        undefined,
        `This Action requires a ${expectedObjectTypeId} object.`,
        { path: "objectData" },
        "objectData",
      ),
    ];

    return {
      valid: false,
      error: issues[0].message,
      ...createSummary(issues),
    };
  }

  return { valid: true, object, ...createSummary([]) };
};

export const validateActionBinding = (
  action: CelanworksmithAction | undefined,
  input: { objectData?: unknown; parameters?: unknown },
): ActionBindingValidation => {
  if (!action) {
    const issues = [
      createIssue(
        "ACTION_MISSING",
        undefined,
        "The requested Action is not available.",
        { path: "actionId" },
        "actionId",
      ),
    ];

    return {
      valid: false,
      error: issues[0].message,
      ...createSummary(issues),
    };
  }

  const objectBinding = validateObjectBinding(
    input.objectData,
    action.objectTypeId,
  );

  if (!objectBinding.valid || !objectBinding.object) return objectBinding;

  if (input.parameters !== undefined && !isRecord(input.parameters)) {
    const issues = [
      createIssue(
        "PARAMETERS_OBJECT",
        undefined,
        "Action parameters must be an object.",
        { path: "parameters" },
        "parameters",
      ),
    ];

    return {
      valid: false,
      error: issues[0].message,
      object: objectBinding.object,
      ...createSummary(issues),
    };
  }

  const explicitParameters = input.parameters || {};
  const mappedParameters = Object.fromEntries(
    action.parameters
      .filter((parameter) =>
        Object.hasOwn(objectBinding.object!.properties, parameter.id),
      )
      .map((parameter) => [
        parameter.id,
        objectBinding.object!.properties[parameter.id],
      ]),
  );
  const parameters = { ...mappedParameters, ...explicitParameters };

  const parameterValidation = validateFieldValues(
    parameters,
    action.parameters,
    {
      objectTypeId: objectBinding.object.typeId,
      path: "parameters",
    },
  );

  if (parameterValidation.issues.length) {
    return {
      valid: false,
      error: parameterValidation.firstIssue?.message,
      object: objectBinding.object,
      ...parameterValidation,
    };
  }

  return {
    valid: true,
    object: objectBinding.object,
    ...parameterValidation,
    request: {
      objectTypeId: objectBinding.object.typeId,
      objectId: objectBinding.object.id,
      parameters,
    },
  };
};
