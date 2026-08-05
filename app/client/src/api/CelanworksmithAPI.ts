import Api from "api/Api";
import type { ApiResponse } from "api/ApiResponses";

type CelanworksmithApiResponse<T> = Promise<ApiResponse<T>>;

const asApiResponse = async <T>(request: Promise<unknown>) =>
  (await request) as ApiResponse<T>;

export interface CelanworksmithProperty {
  id: string;
  displayName: string;
  dataType: string;
  required: boolean;
  readOnly: boolean;
  derived: boolean;
}

export interface CelanworksmithObjectType {
  id: string;
  displayName: string;
  properties: CelanworksmithProperty[];
}

export interface CelanworksmithLinkType {
  id: string;
  displayName: string;
  sourceTypeId: string;
  targetTypeId: string;
  cardinality: string;
}

export interface CelanworksmithFunction {
  id: string;
  displayName: string;
  returnType: string;
  parameters: CelanworksmithProperty[];
  sideEffectFree: boolean;
}

export interface CelanworksmithAction {
  id: string;
  displayName: string;
  objectTypeId: string;
  parameters: CelanworksmithProperty[];
  requiresConfirmation: boolean;
}

export interface CelanworksmithObjectInstance {
  id: string;
  typeId: string;
  properties: Record<string, unknown>;
}

export interface CelanworksmithObjectSet {
  typeId: string;
  items: CelanworksmithObjectInstance[];
  offset: number;
  limit: number;
  total: number;
}

export interface CelanworksmithObjectQuery {
  filter?: Record<string, unknown> | string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  offset?: number;
  limit?: number;
}

export interface CelanworksmithActionExecutionRequest {
  objectTypeId: string;
  objectId: string;
  parameters: Record<string, unknown>;
}

export type CelanworksmithExecutionStatus =
  | "idle"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type CelanworksmithExecutionErrorCode =
  | "INVALID_ARGUMENT"
  | "DUPLICATE_REQUEST"
  | "UNKNOWN_FUNCTION"
  | "UNKNOWN_ACTION"
  | "UNKNOWN_OBJECT"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "BACKEND_ERROR";

export interface CelanworksmithExecutionError {
  code: CelanworksmithExecutionErrorCode;
  message: string;
}

export interface CelanworksmithExecutionMeta {
  status: CelanworksmithExecutionStatus;
  requestId: string;
  executionId?: string;
  startedAt?: number;
  completedAt?: number;
  error?: CelanworksmithExecutionError;
  parametersHash: string;
}

export interface CelanworksmithActionResult {
  success: boolean;
  message: string;
  executionId: string;
  changedObjects: CelanworksmithObjectInstance[];
  sideEffects: Record<string, unknown>[];
}

export type CelanworksmithFunctionExecutionResponse = ApiResponse<unknown>;
export type CelanworksmithActionExecutionResponse =
  ApiResponse<CelanworksmithActionResult>;

export interface CelanworksmithReasoningResult {
  answer: string;
  evidence: string[];
  confidence: number;
  elapsedMs: number;
  degraded: boolean;
}

export interface CelanworksmithReasoningRequest {
  objectTypeId: string;
  objectId: string;
  question: string;
}

const serializeObjectQuery = (query?: CelanworksmithObjectQuery) => {
  if (!query) return undefined;

  const serializedQuery = { ...query };

  if (typeof query.filter === "string") {
    if (query.filter.trim()) {
      serializedQuery.filter = query.filter;
    } else {
      delete serializedQuery.filter;
    }
  } else if (query.filter) {
    serializedQuery.filter = JSON.stringify(query.filter);
  } else {
    delete serializedQuery.filter;
  }

  return serializedQuery;
};

const DEFAULT_EXECUTION_ERROR_MESSAGES: Record<
  CelanworksmithExecutionErrorCode,
  string
> = {
  INVALID_ARGUMENT: "The runtime request is invalid.",
  DUPLICATE_REQUEST: "An identical action is already running.",
  UNKNOWN_FUNCTION: "The requested function is not available.",
  UNKNOWN_ACTION: "The requested action is not available.",
  UNKNOWN_OBJECT: "The requested object is not available.",
  PROVIDER_UNAVAILABLE: "The runtime provider is unavailable.",
  TIMEOUT: "The runtime request timed out.",
  NETWORK_ERROR: "The runtime service could not be reached.",
  BACKEND_ERROR: "The runtime request failed.",
};

const SERVER_ERROR_CODE_MAP: Record<string, CelanworksmithExecutionErrorCode> =
  {
    INVALID_ARGUMENT: "INVALID_ARGUMENT",
    FILTER_INVALID: "INVALID_ARGUMENT",
    FUNCTION_NOT_FOUND: "UNKNOWN_FUNCTION",
    ACTION_NOT_FOUND: "UNKNOWN_ACTION",
    OBJECT_NOT_FOUND: "UNKNOWN_OBJECT",
    OBJECT_TYPE_NOT_FOUND: "UNKNOWN_OBJECT",
    PROVIDER_NOT_CONFIGURED: "PROVIDER_UNAVAILABLE",
    PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  };

interface RuntimeErrorPayload {
  code?: unknown;
  message?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

const getRuntimeErrorPayload = (error: unknown): RuntimeErrorPayload => {
  if (!isRecord(error)) return {};

  const response = isRecord(error.response) ? error.response : undefined;
  const responseData =
    response && isRecord(response.data) ? response.data : undefined;
  const responseMeta =
    responseData && isRecord(responseData.responseMeta)
      ? responseData.responseMeta
      : undefined;
  const responseMetaError =
    responseMeta && isRecord(responseMeta.error)
      ? responseMeta.error
      : undefined;
  const directResponseMeta = isRecord(error.responseMeta)
    ? error.responseMeta
    : undefined;
  const directResponseMetaError =
    directResponseMeta && isRecord(directResponseMeta.error)
      ? directResponseMeta.error
      : undefined;

  return responseMetaError || directResponseMetaError || responseData || error;
};

const hasStackTrace = (message: string) =>
  /(?:\r?\n|^)\s*at\s+[\w$.[\]-]+\(/.test(message) ||
  /^[\w.$]+(?:Exception|Error)(?::|\s)/.test(message);

const getSafeRuntimeErrorMessage = (
  message: unknown,
  code: CelanworksmithExecutionErrorCode,
) => {
  if (
    code === "TIMEOUT" ||
    code === "NETWORK_ERROR" ||
    code === "BACKEND_ERROR" ||
    typeof message !== "string" ||
    !message.trim() ||
    hasStackTrace(message)
  ) {
    return DEFAULT_EXECUTION_ERROR_MESSAGES[code];
  }

  return message.trim().split(/\r?\n/, 1)[0];
};

const getNormalizedErrorCode = (
  serverCode: unknown,
  error: unknown,
): CelanworksmithExecutionErrorCode => {
  if (serverCode && SERVER_ERROR_CODE_MAP[String(serverCode)]) {
    return SERVER_ERROR_CODE_MAP[String(serverCode)];
  }

  const errorRecord = isRecord(error) ? error : undefined;
  const transportCode = errorRecord?.code;
  const message = errorRecord?.message;

  if (
    transportCode === "ECONNABORTED" ||
    transportCode === "ETIMEDOUT" ||
    (typeof message === "string" && message.toLowerCase().includes("timeout"))
  ) {
    return "TIMEOUT";
  }

  if (
    transportCode === "ERR_NETWORK" ||
    (typeof message === "string" && message === "Network Error") ||
    (isRecord(error) && "request" in error && !("response" in error))
  ) {
    return "NETWORK_ERROR";
  }

  return "BACKEND_ERROR";
};

export const normalizeCelanworksmithError = (
  error: unknown,
): CelanworksmithExecutionError => {
  const payload = getRuntimeErrorPayload(error);
  const code = getNormalizedErrorCode(payload.code, error);

  return {
    code,
    message: getSafeRuntimeErrorMessage(payload.message, code),
  };
};

const postExecutionRequest = async <T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): CelanworksmithApiResponse<T> =>
  asApiResponse(
    signal ? Api.post(url, body, undefined, { signal }) : Api.post(url, body),
  );

class CelanworksmithAPI extends Api {
  static baseUrl = "v1/celanworksmith";

  static async getObjectTypes(): CelanworksmithApiResponse<
    CelanworksmithObjectType[]
  > {
    return asApiResponse(Api.get(`${this.baseUrl}/ontology/object-types`));
  }

  static async getObjectType(
    typeId: string,
  ): CelanworksmithApiResponse<CelanworksmithObjectType> {
    return asApiResponse(
      Api.get(`${this.baseUrl}/ontology/object-types/${typeId}`),
    );
  }

  static async getLinkTypes(
    sourceTypeId?: string,
  ): CelanworksmithApiResponse<CelanworksmithLinkType[]> {
    return asApiResponse(
      Api.get(
        `${this.baseUrl}/ontology/link-types`,
        sourceTypeId ? { sourceTypeId } : undefined,
      ),
    );
  }

  static async getFunctions(): CelanworksmithApiResponse<
    CelanworksmithFunction[]
  > {
    return asApiResponse(Api.get(`${this.baseUrl}/ontology/functions`));
  }

  static async getActions(
    objectTypeId?: string,
  ): CelanworksmithApiResponse<CelanworksmithAction[]> {
    return asApiResponse(
      Api.get(
        `${this.baseUrl}/ontology/actions`,
        objectTypeId ? { objectTypeId } : undefined,
      ),
    );
  }

  static async queryObjects(
    typeId: string,
    query?: CelanworksmithObjectQuery,
  ): CelanworksmithApiResponse<CelanworksmithObjectSet> {
    return asApiResponse(
      Api.get(
        `${this.baseUrl}/runtime/objects/${typeId}`,
        serializeObjectQuery(query),
      ),
    );
  }

  static async getInstance(
    typeId: string,
    instanceId: string,
  ): CelanworksmithApiResponse<CelanworksmithObjectInstance> {
    return asApiResponse(
      Api.get(`${this.baseUrl}/runtime/objects/${typeId}/${instanceId}`),
    );
  }

  static async getLinkedObjects(
    typeId: string,
    instanceId: string,
    linkTypeId: string,
    query?: CelanworksmithObjectQuery,
  ): CelanworksmithApiResponse<CelanworksmithObjectSet> {
    return asApiResponse(
      Api.get(`${this.baseUrl}/runtime/objects/${typeId}/${instanceId}/links`, {
        linkTypeId,
        ...serializeObjectQuery(query),
      }),
    );
  }

  static async executeAction(
    actionId: string,
    request: CelanworksmithActionExecutionRequest,
    signal?: AbortSignal,
  ): CelanworksmithApiResponse<CelanworksmithActionResult> {
    return postExecutionRequest<CelanworksmithActionResult>(
      `${this.baseUrl}/runtime/actions/${actionId}/execute`,
      request,
      signal,
    );
  }

  static async callFunction(
    functionId: string,
    parameters: Record<string, unknown>,
    signal?: AbortSignal,
  ): CelanworksmithApiResponse<unknown> {
    return postExecutionRequest<unknown>(
      `${this.baseUrl}/runtime/functions/${functionId}/execute`,
      {
        parameters,
      },
      signal,
    );
  }

  static async reasoning(
    request: CelanworksmithReasoningRequest,
  ): CelanworksmithApiResponse<CelanworksmithReasoningResult> {
    return asApiResponse(
      Api.post(`${this.baseUrl}/runtime/reasoning`, request),
    );
  }
}

export default CelanworksmithAPI;
