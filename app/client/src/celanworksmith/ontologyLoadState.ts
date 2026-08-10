import type { CelanworksmithExecutionErrorCode } from "api/CelanworksmithAPI";

export type OntologyLoadStatus =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "permissionDenied"
  | "typeMismatch";

export type OntologyLoadErrorCode =
  | CelanworksmithExecutionErrorCode
  | "PERMISSION_DENIED"
  | "TYPE_MISMATCH";

export interface OntologyLoadError {
  code: OntologyLoadErrorCode;
  message: string;
}

export interface OntologyLoadState<T> {
  requestKey: string;
  status: OntologyLoadStatus;
  data?: T;
  error?: OntologyLoadError;
  updatedAt?: number;
  canRetry: boolean;
}

export type OntologyLoadTransition<T> =
  | { type: "loading"; requestKey?: string }
  | {
      type: "ready" | "empty";
      requestKey?: string;
      data: T;
      updatedAt: number;
    }
  | {
      type: "error" | "permissionDenied" | "typeMismatch";
      requestKey?: string;
      error: unknown;
    };

const ONTOLOGY_LOAD_ERROR_MESSAGES: Record<OntologyLoadErrorCode, string> = {
  INVALID_ARGUMENT: "The runtime request is invalid.",
  DUPLICATE_REQUEST: "An identical action is already running.",
  BUSINESS_REJECTED: "The Action was rejected by the business rules.",
  UNKNOWN_FUNCTION: "The requested function is not available.",
  UNKNOWN_ACTION: "The requested action is not available.",
  UNKNOWN_OBJECT: "The requested object is not available.",
  PROVIDER_UNAVAILABLE: "The runtime provider is unavailable.",
  TIMEOUT: "The runtime request timed out.",
  NETWORK_ERROR: "The runtime service could not be reached.",
  BACKEND_ERROR: "The runtime request failed.",
  PERMISSION_DENIED: "You do not have permission to access this ontology data.",
  TYPE_MISMATCH: "The ontology data does not match the expected type.",
};

const ERROR_CODE_MAP: Record<string, OntologyLoadErrorCode> = {
  INVALID_ARGUMENT: "INVALID_ARGUMENT",
  FILTER_INVALID: "INVALID_ARGUMENT",
  DUPLICATE_REQUEST: "DUPLICATE_REQUEST",
  BUSINESS_REJECTED: "BUSINESS_REJECTED",
  FUNCTION_NOT_FOUND: "UNKNOWN_FUNCTION",
  UNKNOWN_FUNCTION: "UNKNOWN_FUNCTION",
  ACTION_NOT_FOUND: "UNKNOWN_ACTION",
  UNKNOWN_ACTION: "UNKNOWN_ACTION",
  OBJECT_NOT_FOUND: "UNKNOWN_OBJECT",
  OBJECT_TYPE_NOT_FOUND: "UNKNOWN_OBJECT",
  UNKNOWN_OBJECT: "UNKNOWN_OBJECT",
  PROVIDER_NOT_CONFIGURED: "PROVIDER_UNAVAILABLE",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  NETWORK_ERROR: "NETWORK_ERROR",
  BACKEND_ERROR: "BACKEND_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  FORBIDDEN: "PERMISSION_DENIED",
  UNAUTHORIZED: "PERMISSION_DENIED",
  ACCESS_DENIED: "PERMISSION_DENIED",
  TYPE_MISMATCH: "TYPE_MISMATCH",
  OBJECT_TYPE_MISMATCH: "TYPE_MISMATCH",
  PROPERTY_TYPE_MISMATCH: "TYPE_MISMATCH",
  INCOMPATIBLE_TYPE: "TYPE_MISMATCH",
};

const RETRYABLE_ERROR_CODES = new Set<OntologyLoadErrorCode>([
  "NETWORK_ERROR",
  "PROVIDER_UNAVAILABLE",
  "TIMEOUT",
  "BACKEND_ERROR",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

const getHttpStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) return undefined;

  const response = isRecord(error.response) ? error.response : undefined;
  const status = response?.status ?? error.status;

  return typeof status === "number" ? status : undefined;
};

const getErrorPayload = (error: unknown): Record<string, unknown> => {
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

const getErrorCode = (code: unknown, error: unknown): OntologyLoadErrorCode => {
  const normalizedCode = typeof code === "string" ? code.toUpperCase() : "";

  if (ERROR_CODE_MAP[normalizedCode]) return ERROR_CODE_MAP[normalizedCode];

  if (
    normalizedCode.startsWith("AE-ACL-") ||
    [401, 403].includes(getHttpStatus(error) || 0)
  ) {
    return "PERMISSION_DENIED";
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
    (errorRecord && "request" in errorRecord && !("response" in errorRecord))
  ) {
    return "NETWORK_ERROR";
  }

  return "BACKEND_ERROR";
};

export const getOntologyLoadErrorMessage = (code: OntologyLoadErrorCode) =>
  ONTOLOGY_LOAD_ERROR_MESSAGES[code];

export const normalizeOntologyLoadError = (
  error: unknown,
): OntologyLoadError => {
  const payload = getErrorPayload(error);
  const code = getErrorCode(payload.code, error);

  return { code, message: getOntologyLoadErrorMessage(code) };
};

export const createOntologyLoadState = <T>(
  requestKey: string,
): OntologyLoadState<T> => ({
  requestKey,
  status: "idle",
  canRetry: false,
});

const getErrorStatus = (
  transitionType: "error" | "permissionDenied" | "typeMismatch",
  code: OntologyLoadErrorCode,
) => {
  if (transitionType !== "error") return transitionType;

  if (code === "PERMISSION_DENIED") return "permissionDenied";

  if (code === "TYPE_MISMATCH") return "typeMismatch";

  return "error";
};

export const transitionOntologyLoadState = <T>(
  state: OntologyLoadState<T>,
  transition: OntologyLoadTransition<T>,
): OntologyLoadState<T> => {
  const requestKey = transition.requestKey || state.requestKey;
  const previousData =
    requestKey === state.requestKey
      ? { data: state.data, updatedAt: state.updatedAt }
      : {};

  if (transition.type === "loading") {
    return {
      requestKey,
      status: "loading",
      ...previousData,
      canRetry: false,
    };
  }

  if (transition.type === "ready" || transition.type === "empty") {
    return {
      requestKey,
      status: transition.type,
      data: transition.data,
      updatedAt: transition.updatedAt,
      canRetry: false,
    };
  }

  const error = normalizeOntologyLoadError(transition.error);
  const status = getErrorStatus(transition.type, error.code);

  return {
    requestKey,
    status,
    ...previousData,
    error,
    canRetry: status === "error" && RETRYABLE_ERROR_CODES.has(error.code),
  };
};
