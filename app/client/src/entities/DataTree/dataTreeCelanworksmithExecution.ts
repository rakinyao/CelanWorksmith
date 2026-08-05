import type {
  CelanworksmithAction,
  CelanworksmithActionExecutionRequest,
  CelanworksmithExecutionMeta,
  CelanworksmithFunction,
} from "api/CelanworksmithAPI";
import {
  celanworksmithActionRun,
  celanworksmithFunctionRun,
} from "actions/celanworksmithExecutionActions";
import {
  ENTITY_TYPE,
  type CelanworksmithActionEntity,
  type CelanworksmithActionsEntity,
  type CelanworksmithDataTreeDispatch,
  type CelanworksmithFunctionEntity,
  type CelanworksmithFunctionsEntity,
} from "ee/entities/DataTree/types";
import type { CelanworksmithExecutionState } from "reducers/celanworksmithExecutionReducer";
import type { CelanworksmithOntologyState } from "reducers/celanworksmithOntologyReducer";

export interface CelanworksmithExecutionDataTreeState {
  ontology: CelanworksmithOntologyState;
  execution: CelanworksmithExecutionState;
}

export interface CelanworksmithExecutionDataTree {
  $functions: CelanworksmithFunctionsEntity;
  $actions: CelanworksmithActionsEntity;
}

const noopDispatch: CelanworksmithDataTreeDispatch = () => undefined;

const idleMeta = (): CelanworksmithExecutionMeta => ({
  status: "idle",
  requestId: "",
  parametersHash: "",
});

const attachMetadata = <T extends object>(
  entity: T,
  metadata: Record<string, unknown>,
): T => {
  Object.defineProperty(entity, "__metadata", {
    configurable: false,
    enumerable: false,
    value: metadata,
    writable: false,
  });

  return entity;
};

const createFunctionEntity = (
  metadata: CelanworksmithFunction,
  executionState: CelanworksmithExecutionState,
  dispatch: CelanworksmithDataTreeDispatch,
): CelanworksmithFunctionEntity => {
  const currentState = executionState.functions[metadata.id];
  const entity: CelanworksmithFunctionEntity = {
    data: currentState?.data,
    _meta: currentState?.meta || idleMeta(),
    ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_FUNCTION,
  };

  Object.defineProperty(entity, "run", {
    configurable: false,
    enumerable: false,
    value: (parameters = {}) => {
      const action = celanworksmithFunctionRun(metadata.id, parameters);

      dispatch(action);

      return action.payload.requestId;
    },
    writable: false,
  });

  return attachMetadata(entity, {
    returnType: metadata.returnType,
    parameters: metadata.parameters.map(({ dataType, id, required }) => ({
      id,
      dataType,
      required,
    })),
  });
};

const createActionEntity = (
  metadata: CelanworksmithAction,
  executionState: CelanworksmithExecutionState,
  dispatch: CelanworksmithDataTreeDispatch,
): CelanworksmithActionEntity => {
  const currentState = executionState.actions[metadata.id];
  const entity: CelanworksmithActionEntity = {
    data: currentState?.data,
    changedObjects: currentState?.changedObjects || [],
    sideEffects: currentState?.sideEffects || [],
    _meta: currentState?.meta || idleMeta(),
    ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_ACTION,
  };

  Object.defineProperty(entity, "run", {
    configurable: false,
    enumerable: false,
    value: (request: CelanworksmithActionExecutionRequest) => {
      const action = celanworksmithActionRun(metadata.id, request);

      dispatch(action);

      return action.payload.requestId;
    },
    writable: false,
  });

  return attachMetadata(entity, {
    objectTypeId: metadata.objectTypeId,
    parameters: metadata.parameters.map(({ dataType, id, required }) => ({
      id,
      dataType,
      required,
    })),
  });
};

export const generateCelanworksmithExecutionDataTree = (
  state: CelanworksmithExecutionDataTreeState,
  dispatch: CelanworksmithDataTreeDispatch = noopDispatch,
): CelanworksmithExecutionDataTree => {
  const functions = {
    ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_FUNCTION,
  } as CelanworksmithFunctionsEntity;
  const actions = {
    ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_ACTION,
  } as CelanworksmithActionsEntity;

  state.ontology.functions.forEach((metadata) => {
    functions[metadata.id] = createFunctionEntity(
      metadata,
      state.execution,
      dispatch,
    );
  });

  state.ontology.actions.forEach((metadata) => {
    actions[metadata.id] = createActionEntity(
      metadata,
      state.execution,
      dispatch,
    );
  });

  return { $functions: functions, $actions: actions };
};
