export const ONTOLOGY_COLUMN_LABELS_HEADER = "X-CELANWORKSHOP-COLUMN-LABELS";

type ResponseHeaders = Record<string, unknown> | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getOntologyColumnLabels = (
  headers: ResponseHeaders,
): Record<string, string> => {
  if (!headers) return {};

  const headerValue = Object.entries(headers).find(
    ([headerName]) =>
      headerName.toLowerCase() === ONTOLOGY_COLUMN_LABELS_HEADER.toLowerCase(),
  )?.[1];
  const serializedLabels = Array.isArray(headerValue)
    ? headerValue.find((value): value is string => typeof value === "string")
    : typeof headerValue === "string"
      ? headerValue
      : undefined;

  if (!serializedLabels) return {};

  try {
    const labels = JSON.parse(serializedLabels) as unknown;

    if (!isRecord(labels)) return {};

    return Object.fromEntries(
      Object.entries(labels).filter(
        ([field, label]) =>
          field.trim().length > 0 &&
          typeof label === "string" &&
          label.trim().length > 0,
      ),
    ) as Record<string, string>;
  } catch {
    return {};
  }
};
