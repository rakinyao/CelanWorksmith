import type { CelanworksmithFunction } from "api/CelanworksmithAPI";
import {
  hashCelanworksmithParameters,
  type CelanworksmithFunctionRequestPayload,
} from "actions/celanworksmithExecutionActions";
import type { CelanworksmithObjectQueryRequest } from "actions/celanworksmithObjectQueryActions";
import {
  getObjectQueryKey,
  type CelanworksmithObjectQueryState,
} from "reducers/celanworksmithObjectQueryReducer";
import type { CelanworksmithExecutionState } from "reducers/celanworksmithExecutionReducer";
import type { CelanworksmithObjectsState } from "reducers/celanworksmithObjectsReducer";
import type { CelanworksmithOntologyState } from "reducers/celanworksmithOntologyReducer";
import type { VariableDefinition } from "./types";
import { getCelanworksmithObjectSetVariableRequest } from "entities/DataTree/dataTreeCelanworksmithVariables";

export interface CelanworksmithVariableLoadPlan {
  objectQueries: CelanworksmithObjectQueryRequest[];
  functionRuns: Array<
    Pick<CelanworksmithFunctionRequestPayload, "functionId" | "parameters">
  >;
}

export interface CelanworksmithVariableLoadState {
  definitions: VariableDefinition[];
  objects: CelanworksmithObjectsState;
  ontology: CelanworksmithOntologyState;
  execution: CelanworksmithExecutionState;
  queries: CelanworksmithObjectQueryState;
  applicationId?: string;
}

const hasFunctionMetadata = (
  functions: CelanworksmithFunction[],
  functionId: string,
) => functions.some((metadata) => metadata.id === functionId);

const hasSameFunctionInput = (
  execution: CelanworksmithExecutionState,
  functionId: string,
  parameters: Record<string, unknown>,
) => {
  const current = execution.functions[functionId];

  return (
    current?.meta.parametersHash === hashCelanworksmithParameters(parameters) &&
    ["queued", "running", "succeeded", "failed"].includes(current.meta.status)
  );
};

export const getCelanworksmithVariableLoadPlan = ({
  definitions,
  execution,
  objects,
  ontology,
  queries,
  applicationId,
}: CelanworksmithVariableLoadState): CelanworksmithVariableLoadPlan => {
  const objectQueries: CelanworksmithObjectQueryRequest[] = [];
  const functionRuns: CelanworksmithVariableLoadPlan["functionRuns"] = [];

  definitions.forEach((definition) => {
    if (definition.kind === "OBJECT_SET") {
      if (!objects.types[definition.config.typeId]?.metadata) return;

      const request = {
        ...getCelanworksmithObjectSetVariableRequest(definition),
        ...(applicationId ? { applicationId } : {}),
      };

      if (!queries.entries[getObjectQueryKey(request)]) {
        objectQueries.push(request);
      }

      return;
    }

    if (
      definition.kind === "FUNCTION" &&
      hasFunctionMetadata(ontology.functions, definition.config.functionId) &&
      !hasSameFunctionInput(
        execution,
        definition.config.functionId,
        definition.config.parameters,
      )
    ) {
      functionRuns.push({
        functionId: definition.config.functionId,
        parameters: definition.config.parameters,
      });
    }
  });

  return { objectQueries, functionRuns };
};
