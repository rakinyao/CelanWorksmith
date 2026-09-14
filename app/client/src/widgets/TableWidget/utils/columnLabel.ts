export const getColumnLabel = (
  columnNameMap: Record<string, string> | undefined,
  fieldName: string,
): string => {
  const label = columnNameMap?.[fieldName]?.trim();

  return label || fieldName;
};
