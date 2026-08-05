import type {
  CelanworksmithAction,
  CelanworksmithActionExecutionRequest,
} from "api/CelanworksmithAPI";
import { normalizeObjectData } from "widgets/ObjectDetailWidget/widget/objectDetailUtils";

export interface ActionButtonInput {
  objectData?: unknown;
  parameters?: unknown;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const createActionRequest = (
  action: CelanworksmithAction | undefined,
  input: ActionButtonInput,
): CelanworksmithActionExecutionRequest | undefined => {
  const object = normalizeObjectData(input.objectData);

  if (
    !object ||
    (action?.objectTypeId && action.objectTypeId !== object.typeId)
  ) {
    return undefined;
  }

  if (input.parameters !== undefined && !isRecord(input.parameters)) {
    return undefined;
  }

  return {
    objectTypeId: object.typeId,
    objectId: object.id,
    parameters: (input.parameters as Record<string, unknown> | undefined) || {},
  };
};
