import type {
  CelanworksmithObjectQuery,
  CelanworksmithObjectSet,
  CelanworksmithObjectType,
} from "api/CelanworksmithAPI";
import type { CelanworksmithObjectQueryRequest } from "actions/celanworksmithObjectQueryActions";

export interface ObjectTableColumn {
  id: string;
  label: string;
  dataType: string;
}

export const getObjectTableColumns = (
  metadata: CelanworksmithObjectType | undefined,
): ObjectTableColumn[] => [
  { id: "id", label: "ID", dataType: "STRING" },
  ...(metadata?.properties || []).map((property) => ({
    id: property.id,
    label: property.displayName,
    dataType: property.dataType,
  })),
];

export const getObjectTableRows = (
  result?: CelanworksmithObjectSet,
): Array<Record<string, unknown>> =>
  (result?.items || []).map((item) => ({
    id: item.id,
    typeId: item.typeId,
    ...item.properties,
  }));

export const createObjectTableQueryRequest = (
  widgetId: string,
  typeId: string,
  pageNo: number,
  pageSize: number,
  sortOrder: { column: string; order: "asc" | "desc" | null },
  filter?: unknown,
): CelanworksmithObjectQueryRequest => {
  const query: CelanworksmithObjectQuery = {
    offset: Math.max(0, (pageNo - 1) * pageSize),
    limit: pageSize,
  };

  if (sortOrder.column && sortOrder.order) {
    query.sortBy = sortOrder.column;
    query.sortDirection = sortOrder.order;
  }

  if (filter && typeof filter === "object") {
    query.filter = filter as Record<string, unknown>;
  }

  return { widgetId, typeId, query };
};
