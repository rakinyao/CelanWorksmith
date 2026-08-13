export type SemanticDescription = string | Record<string, string>;

export interface SemanticMetadata {
  description?: SemanticDescription;
  semanticType?: string;
  examples?: string[];
}

export interface SemanticMetadataAccess {
  authorized?: boolean;
  sensitive?: boolean;
}

const SENSITIVE_VALUE_PATTERNS = [
  /(?:mongodb(?:\+srv)?|redis):\/\/\S+/i,
  /https?:\/\/[^/\s:@]+:[^/\s@]+@/i,
  /(?:^|[\s{[(,;&?])['"]?(?:password|passwd|pwd|token|secret|authorization|api[_-]?key|access[_-]?key|private[_-]?key)['"]?\s*[:=]\s*\S+/i,
  /(?:^|[/\\])(?:password|passwd|pwd|token|secret|authorization|api[_-]?key|access[_-]?key|private[_-]?key)(?:[/\\])[^/?#\s]+/i,
  /authorization\s+(?:basic|bearer)\s+\S+/i,
];

export const isSensitiveOntologyValue = (value: unknown): boolean => {
  if (typeof value !== "string") return true;

  const normalized = value.trim().replace(/[\r\n\t]+/g, " ");

  if (!normalized) return true;

  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(normalized));
};

const normalizeDescription = (
  description: unknown,
): SemanticDescription | undefined => {
  if (typeof description === "string") {
    const value = description.trim();

    return value && !isSensitiveOntologyValue(value) ? value : undefined;
  }

  if (!description || typeof description !== "object") return undefined;

  const localized = Object.fromEntries(
    Object.entries(description)
      .filter(
        ([locale, value]) =>
          typeof locale === "string" &&
          typeof value === "string" &&
          value.trim() &&
          !isSensitiveOntologyValue(value),
      )
      .map(([locale, value]) => [locale, (value as string).trim()]),
  );

  return Object.keys(localized).length ? localized : undefined;
};

export const filterSemanticMetadata = (
  metadata: SemanticMetadata | undefined,
  access: SemanticMetadataAccess = { authorized: false },
): SemanticMetadata => {
  if (!metadata || access.authorized !== true || access.sensitive) return {};

  const description = normalizeDescription(metadata.description);
  const semanticType =
    typeof metadata.semanticType === "string" &&
    !isSensitiveOntologyValue(metadata.semanticType)
      ? metadata.semanticType.trim() || undefined
      : undefined;
  const examples = Array.isArray(metadata.examples)
    ? metadata.examples
        .filter(
          (example): example is string =>
            typeof example === "string" &&
            !!example.trim() &&
            !isSensitiveOntologyValue(example),
        )
        .map((example) => example.trim())
    : undefined;

  return {
    ...(description ? { description } : {}),
    ...(semanticType ? { semanticType } : {}),
    ...(examples?.length ? { examples } : {}),
  };
};

export const createSemanticMetadataCacheKey = ({
  nodeId,
  projectId,
  projectVersion,
}: {
  projectId: string;
  projectVersion: string;
  nodeId: string;
}) => [projectId, projectVersion, nodeId].join("|");

export const isSemanticMetadataCacheValid = ({
  cachedProjectVersion,
  currentProjectVersion,
}: {
  cachedProjectVersion?: string;
  currentProjectVersion?: string;
}) =>
  !!cachedProjectVersion &&
  !!currentProjectVersion &&
  cachedProjectVersion === currentProjectVersion;
