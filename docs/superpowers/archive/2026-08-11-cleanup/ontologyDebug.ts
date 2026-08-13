import type {
  CelanworksmithApplicationBinding,
  CelanworksmithExecutionError,
} from "api/CelanworksmithAPI";

export interface OntologyDebugRequestInput {
  requestKey?: string;
  apiPath?: string;
  responseStatus?: number;
  durationMs?: number;
  cacheHit?: boolean;
  refreshReason?: string;
  canRetry?: boolean;
}

export interface OntologyDebugRequest {
  requestKey?: string;
  apiPath?: string;
  responseStatus?: number;
  durationMs?: number;
  cacheHit?: boolean;
  refreshReason?: string;
  canRetry: boolean;
}

export interface OntologyDebugInfoInput {
  applicationId?: string;
  binding?: CelanworksmithApplicationBinding | null;
  status: string;
  objectTypeIds?: readonly string[];
  objectTypeStatus?: string;
  error?: Pick<CelanworksmithExecutionError, "code" | "message">;
  request?: OntologyDebugRequestInput;
}

export interface OntologyDebugInfo {
  applicationId?: string;
  projectId?: string;
  projectVersion?: string;
  providerId?: string;
  bindingKey?: string;
  bindingKeySafeToCopy: boolean;
  status: string;
  objectTypeIds: string[];
  objectTypeStatus?: string;
  error?: Pick<CelanworksmithExecutionError, "code" | "message">;
  request: OntologyDebugRequest;
}

const REDACTED_VALUE = "[redacted]";
const SENSITIVE_KEY =
  "(?:password|passwd|pwd|token|secret|authorization|api[_-]?key|access[_-]?key|private[_-]?key)";
const SENSITIVE_VALUE_PATTERNS = [
  /(?:mongodb(?:\+srv)?|redis):\/\/\S+/i,
  /https?:\/\/[^/\s:@]+:[^/\s@]+@/i,
  new RegExp(
    `(?:^|[\\s{[(,;&?])['\"]?${SENSITIVE_KEY}['\"]?\\s*[:=]\\s*\\S+`,
    "i",
  ),
  new RegExp(`(?:^|[/\\\\])${SENSITIVE_KEY}(?:[/\\\\])[^/?#\\s]+`, "i"),
  /authorization\s+(?:basic|bearer)\s+\S+/i,
];

const decodeDebugValue = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const isSensitiveOntologyValue = (value: unknown): boolean => {
  if (typeof value !== "string") return true;

  const normalized = value.trim().replace(/[\r\n\t]+/g, " ");

  if (!normalized) return true;

  return [normalized, decodeDebugValue(normalized)].some((candidate) =>
    SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(candidate)),
  );
};

export const sanitizeOntologyDebugValue = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return REDACTED_VALUE;

  const normalized = value.trim().replace(/[\r\n]+/g, " ");

  return isSensitiveOntologyValue(normalized) ? REDACTED_VALUE : normalized;
};

const sanitizeErrorMessage = (message: unknown) => {
  if (typeof message !== "string" || !message.trim()) return REDACTED_VALUE;

  const normalized = message.trim();

  return /\bat\s+[\w.$-]+\(/.test(normalized) ||
    isSensitiveOntologyValue(normalized)
    ? REDACTED_VALUE
    : sanitizeOntologyDebugValue(normalized);
};

const sanitizeApiPath = (path: unknown) => {
  if (typeof path !== "string" || !path.trim()) return undefined;

  const sanitized = sanitizeOntologyDebugValue(path.trim().split(/[?#]/, 1)[0]);

  return sanitized === REDACTED_VALUE ? REDACTED_VALUE : sanitized;
};

const sanitizeOptionalDebugValue = (value: unknown) =>
  typeof value === "string" && value.trim()
    ? sanitizeOntologyDebugValue(value)
    : undefined;

export const createStableBindingKey = (binding: {
  applicationId?: string;
  projectId?: string;
  projectVersion?: string;
  providerId?: string;
}) =>
  [
    binding.applicationId,
    binding.projectId,
    binding.projectVersion,
    binding.providerId,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .join("|");

export const buildOntologyDebugInfo = (
  input: OntologyDebugInfoInput,
): OntologyDebugInfo => {
  const binding = input.binding || undefined;
  const rawBindingKey = binding
    ? createStableBindingKey({
        applicationId: input.applicationId || binding.applicationId,
        projectId: binding.projectId,
        projectVersion: binding.projectVersion,
        providerId: binding.providerId,
      })
    : undefined;
  const bindingKey = sanitizeOptionalDebugValue(rawBindingKey);
  const bindingKeySafeToCopy =
    !!rawBindingKey &&
    bindingKey !== REDACTED_VALUE &&
    [
      input.applicationId || binding?.applicationId,
      binding?.projectId,
      binding?.projectVersion,
      binding?.providerId,
    ].every(
      (value) => typeof value === "string" && !isSensitiveOntologyValue(value),
    );
  const requestKey = sanitizeOntologyDebugValue(
    input.request?.requestKey || rawBindingKey,
  );

  return {
    applicationId: sanitizeOptionalDebugValue(input.applicationId),
    projectId: sanitizeOptionalDebugValue(binding?.projectId),
    projectVersion: sanitizeOptionalDebugValue(binding?.projectVersion),
    providerId: sanitizeOptionalDebugValue(binding?.providerId),
    bindingKey,
    bindingKeySafeToCopy,
    status: sanitizeOntologyDebugValue(input.status),
    objectTypeIds: (input.objectTypeIds || []).map(sanitizeOntologyDebugValue),
    objectTypeStatus: sanitizeOptionalDebugValue(input.objectTypeStatus),
    error: input.error
      ? {
          code: input.error.code,
          message: sanitizeErrorMessage(input.error.message),
        }
      : undefined,
    request: {
      requestKey: requestKey === REDACTED_VALUE ? undefined : requestKey,
      apiPath: sanitizeApiPath(input.request?.apiPath),
      responseStatus: input.request?.responseStatus,
      durationMs: input.request?.durationMs,
      cacheHit: input.request?.cacheHit,
      refreshReason: sanitizeOptionalDebugValue(input.request?.refreshReason),
      canRetry: input.request?.canRetry ?? input.status === "error",
    },
  };
};
