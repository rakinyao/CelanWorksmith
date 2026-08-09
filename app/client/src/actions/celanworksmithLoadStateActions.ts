import type { CelanworksmithActionExecutionRequest } from "api/CelanworksmithAPI";
import type { CelanworksmithLinkRequest } from "actions/celanworksmithLinkActions";
import type { CelanworksmithObjectQueryRequest } from "actions/celanworksmithObjectQueryActions";
import type { VariableDefinition } from "celanworksmith/variables/types";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";

export type CelanworksmithLoadRetryTarget =
  | { kind: "objectMetadata"; applicationId?: string }
  | { kind: "objectSet"; typeId: string }
  | { kind: "objectQuery"; request: CelanworksmithObjectQueryRequest }
  | { kind: "linkMetadata"; typeId: string }
  | { kind: "linkEntry"; request: CelanworksmithLinkRequest }
  | { kind: "ontology"; applicationId?: string }
  | {
      kind: "function";
      functionId: string;
      parameters: Record<string, unknown>;
      applicationId?: string;
    }
  | {
      kind: "action";
      actionId: string;
      request: CelanworksmithActionExecutionRequest;
      applicationId?: string;
    }
  | {
      kind: "variable";
      definition: VariableDefinition;
      applicationId?: string;
    };

export const celanworksmithLoadRetry = (
  target: CelanworksmithLoadRetryTarget,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_LOAD_RETRY,
  payload: target,
});
