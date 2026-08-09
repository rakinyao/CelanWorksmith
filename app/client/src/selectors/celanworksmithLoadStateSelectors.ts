import type {
  CelanworksmithActionExecutionRequest,
  CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";
import { hashCelanworksmithParameters } from "actions/celanworksmithExecutionActions";
import type { CelanworksmithLinkRequest } from "actions/celanworksmithLinkActions";
import type { CelanworksmithObjectQueryRequest } from "actions/celanworksmithObjectQueryActions";
import {
  getCelanworksmithLinkKey,
  type CelanworksmithLinksState,
} from "reducers/celanworksmithLinksReducer";
import {
  getObjectQueryKey,
  type CelanworksmithObjectQueryState,
} from "reducers/celanworksmithObjectQueryReducer";
import type { CelanworksmithExecutionState } from "reducers/celanworksmithExecutionReducer";
import type { CelanworksmithObjectsState } from "reducers/celanworksmithObjectsReducer";
import type { CelanworksmithOntologyState } from "reducers/celanworksmithOntologyReducer";
import type { DefaultRootState } from "react-redux";
import {
  createOntologyLoadState,
  transitionOntologyLoadState,
  type OntologyLoadState,
} from "celanworksmith/ontologyLoadState";
import { getCelanworksmithObjectSetVariableRequest } from "entities/DataTree/dataTreeCelanworksmithVariables";
import type { VariableDefinition } from "celanworksmith/variables/types";

type CelanworksmithLoadStateRoot = Partial<
  Pick<
    DefaultRootState,
    | "celanworksmithExecution"
    | "celanworksmithLinks"
    | "celanworksmithObjectQueries"
    | "celanworksmithObjects"
    | "celanworksmithOntology"
  >
>;

type LegacyLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";

interface LegacyLoadSnapshot<T> {
  requestKey: string;
  status: LegacyLoadStatus;
  data?: T;
  error?: unknown;
  updatedAt?: number;
}

const objectsFallback: CelanworksmithObjectsState = {
  status: "idle",
  types: {},
};
const queriesFallback: CelanworksmithObjectQueryState = { entries: {} };
const linksFallback: CelanworksmithLinksState = { metadata: {}, entries: {} };
const ontologyFallback: CelanworksmithOntologyState = {
  status: "idle",
  functions: [],
  actions: [],
};
const executionFallback: CelanworksmithExecutionState = {
  functions: {},
  actions: {},
  requests: {},
  functionCache: {},
  inputs: {},
};

const getObjects = (state: CelanworksmithLoadStateRoot) =>
  (state.celanworksmithObjects as CelanworksmithObjectsState | undefined) ||
  objectsFallback;
const getQueries = (state: CelanworksmithLoadStateRoot) =>
  (state.celanworksmithObjectQueries as
    | CelanworksmithObjectQueryState
    | undefined) || queriesFallback;
const getLinks = (state: CelanworksmithLoadStateRoot) =>
  (state.celanworksmithLinks as CelanworksmithLinksState | undefined) ||
  linksFallback;
const getOntology = (state: CelanworksmithLoadStateRoot) =>
  (state.celanworksmithOntology as CelanworksmithOntologyState | undefined) ||
  ontologyFallback;
const getExecution = (state: CelanworksmithLoadStateRoot) =>
  (state.celanworksmithExecution as CelanworksmithExecutionState | undefined) ||
  executionFallback;

const adaptLegacyLoadState = <T>({
  data,
  error,
  requestKey,
  status,
  updatedAt,
}: LegacyLoadSnapshot<T>): OntologyLoadState<T> => {
  const hasData = data !== undefined;
  const base = hasData
    ? { ...createOntologyLoadState<T>(requestKey), data, updatedAt }
    : createOntologyLoadState<T>(requestKey);

  if (status === "idle") return base;

  if (status === "loading") {
    return transitionOntologyLoadState(base, { type: "loading" });
  }

  if (status === "ready" || status === "empty") {
    return transitionOntologyLoadState(base, {
      type: status,
      data: data as T,
      updatedAt: updatedAt || 0,
    });
  }

  return transitionOntologyLoadState(base, {
    type: "error",
    error: error || { code: "BACKEND_ERROR" },
  });
};

export const getCelanworksmithObjectMetadataLoadState = (
  state: CelanworksmithLoadStateRoot,
) => {
  const objects = getObjects(state);
  const data = Object.values(objects.types)
    .map((type) => type.metadata)
    .filter((metadata) => !!metadata);
  const status =
    objects.status === "ready" && !data.length ? "empty" : objects.status;

  return adaptLegacyLoadState({
    requestKey: "objects/metadata",
    status,
    ...(data.length ? { data } : {}),
    updatedAt: objects.updatedAt,
    error: objects.error,
  });
};

export const getCelanworksmithObjectSetLoadState = (
  state: CelanworksmithLoadStateRoot,
  typeId: string,
) => {
  const type = getObjects(state).types[typeId];
  const data: CelanworksmithObjectSet | undefined = type
    ? {
        typeId,
        items: type.items,
        total: type.total,
        offset: type.offset,
        limit: type.limit,
      }
    : undefined;

  return adaptLegacyLoadState({
    requestKey: `objects/${typeId}`,
    status: type?.status || "idle",
    data,
    updatedAt: type?.updatedAt,
    error: type?.error,
  });
};

export const getCelanworksmithObjectQueryLoadState = (
  state: CelanworksmithLoadStateRoot,
  request: CelanworksmithObjectQueryRequest,
) => {
  const entry = getQueries(state).entries[getObjectQueryKey(request)];

  return adaptLegacyLoadState({
    requestKey: getObjectQueryKey(request),
    status: entry?.status || "idle",
    data: entry?.result,
    updatedAt: entry?.updatedAt,
    error: entry?.error,
  });
};

export const getCelanworksmithLinkMetadataLoadState = (
  state: CelanworksmithLoadStateRoot,
  typeId: string,
) => {
  const metadata = getLinks(state).metadata[typeId];

  return adaptLegacyLoadState({
    requestKey: `links/metadata/${typeId}`,
    status: metadata?.status || "idle",
    data: metadata?.links,
    updatedAt: metadata?.updatedAt,
    error: metadata?.error,
  });
};

export const getCelanworksmithLinkEntryLoadState = (
  state: CelanworksmithLoadStateRoot,
  request: CelanworksmithLinkRequest,
) => {
  const entry = getLinks(state).entries[getCelanworksmithLinkKey(request)];

  return adaptLegacyLoadState({
    requestKey: `links/${getCelanworksmithLinkKey(request)}`,
    status: entry?.status || "idle",
    data: entry?.result,
    updatedAt: entry?.updatedAt,
    error: entry?.error,
  });
};

export const getCelanworksmithOntologyLoadState = (
  state: CelanworksmithLoadStateRoot,
) => {
  const ontology = getOntology(state);

  return adaptLegacyLoadState({
    requestKey: "ontology/metadata",
    status: ontology.status,
    data: { functions: ontology.functions, actions: ontology.actions },
    updatedAt: ontology.updatedAt,
    error: ontology.error,
  });
};

const getExecutionStatus = (status?: string): LegacyLoadStatus => {
  if (status === "queued" || status === "running") return "loading";

  if (status === "succeeded") return "ready";

  if (status === "failed") return "error";

  return "idle";
};

export const getCelanworksmithExecutionRequestLoadState = (
  state: CelanworksmithLoadStateRoot,
  requestId: string,
) => {
  const execution = getExecution(state);
  const request = execution.requests[requestId];
  const data =
    request?.kind === "function"
      ? execution.functions[request.entityId]?.data
      : request?.kind === "action"
        ? execution.actions[request.entityId]?.data
        : undefined;

  return adaptLegacyLoadState({
    requestKey: `execution/${request?.kind || "request"}/${requestId}`,
    status: getExecutionStatus(request?.status),
    data,
    updatedAt: request?.completedAt || request?.startedAt,
    error: request?.error,
  });
};

export const getCelanworksmithFunctionLoadState = (
  state: CelanworksmithLoadStateRoot,
  functionId: string,
  parameters: Record<string, unknown>,
) => {
  const functionState = getExecution(state).functions[functionId];
  const parametersHash = hashCelanworksmithParameters(parameters);
  const matchesParameters =
    functionState?.meta.parametersHash === parametersHash;

  return adaptLegacyLoadState({
    requestKey: `execution/function/${functionId}/${parametersHash}`,
    status: matchesParameters
      ? getExecutionStatus(functionState?.meta.status)
      : "idle",
    data: matchesParameters ? functionState?.data : undefined,
    updatedAt: matchesParameters ? functionState?.meta.completedAt : undefined,
    error: matchesParameters ? functionState?.meta.error : undefined,
  });
};

export const getCelanworksmithActionLoadState = (
  state: CelanworksmithLoadStateRoot,
  actionId: string,
  request: CelanworksmithActionExecutionRequest,
) => {
  const actionState = getExecution(state).actions[actionId];
  const parametersHash = hashCelanworksmithParameters(request.parameters || {});
  const matchesParameters = actionState?.meta.parametersHash === parametersHash;

  return adaptLegacyLoadState({
    requestKey: `execution/action/${actionId}/${parametersHash}`,
    status: matchesParameters
      ? getExecutionStatus(actionState?.meta.status)
      : "idle",
    data: matchesParameters ? actionState?.data : undefined,
    updatedAt: matchesParameters ? actionState?.meta.completedAt : undefined,
    error: matchesParameters ? actionState?.meta.error : undefined,
  });
};

export const getCelanworksmithVariableLoadState = (
  state: CelanworksmithLoadStateRoot,
  definition: VariableDefinition,
) => {
  if (definition.kind === "OBJECT_SET") {
    const loadState = getCelanworksmithObjectQueryLoadState(
      state,
      getCelanworksmithObjectSetVariableRequest(definition),
    );

    return {
      ...loadState,
      requestKey: `variables/${definition.id}/${loadState.requestKey}`,
    };
  }

  if (definition.kind === "FUNCTION") {
    const loadState = getCelanworksmithFunctionLoadState(
      state,
      definition.config.functionId,
      definition.config.parameters,
    );

    return {
      ...loadState,
      requestKey: `variables/${definition.id}/${loadState.requestKey}`,
    };
  }

  return createOntologyLoadState(`variables/${definition.id}`);
};
