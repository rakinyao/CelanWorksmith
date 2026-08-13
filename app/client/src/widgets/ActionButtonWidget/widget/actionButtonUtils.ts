import type {
  CelanworksmithAction,
  CelanworksmithActionExecutionRequest,
} from "api/CelanworksmithAPI";
import {
  validateActionBinding,
  type ActionBindingValidation,
} from "celanworksmith/objectActionValidation";

export {
  validateActionBinding,
  validateObjectBinding,
} from "celanworksmith/objectActionValidation";

export interface ActionButtonInput {
  objectData?: unknown;
  parameters?: unknown;
}

export const resolveActionBinding = (
  actions: CelanworksmithAction[],
  actionId: string | undefined,
  input: ActionButtonInput,
) => {
  const action = actions.find((candidate) => candidate.id === actionId);
  const validation = validateActionBinding(action, input);

  return { action, validation };
};

export const createActionRequest = (
  action: CelanworksmithAction | undefined,
  input: ActionButtonInput,
): CelanworksmithActionExecutionRequest | undefined => {
  return validateActionBinding(action, input).request;
};

export const getActionValidationFeedback = (
  validation: ActionBindingValidation,
) => ({
  error: validation.error || "The Ontology Action binding is invalid.",
  path: validation.errorPath,
  summary: validation.summary,
});
