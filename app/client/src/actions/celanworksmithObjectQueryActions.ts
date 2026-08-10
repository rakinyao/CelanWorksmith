import type {
  CelanworksmithObjectQuery,
  CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";
import type { ReduxAction } from "actions/ReduxActionTypes";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";

export interface CelanworksmithObjectQueryRequest {
  widgetId: string;
  typeId: string;
  query?: CelanworksmithObjectQuery;
  applicationId?: string;
}

export interface CelanworksmithObjectQueryError {
  code: string;
  message: string;
}

const normalizeQueryValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeQueryValue);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, normalizeQueryValue(nestedValue)]),
    );
  }

  return value;
};

export const getCelanworksmithObjectQuerySignature = (
  query?: CelanworksmithObjectQuery,
) => {
  const offset = Number.isInteger(query?.offset)
    ? Math.max(0, query!.offset!)
    : 0;
  const limit = Number.isInteger(query?.limit)
    ? Math.min(100, Math.max(1, query!.limit!))
    : 100;
  const normalizedQuery: Record<string, unknown> = { offset, limit };

  if (query?.sortBy) normalizedQuery.sortBy = query.sortBy;

  if (query?.sortDirection) normalizedQuery.sortDirection = query.sortDirection;

  if (query?.filter !== undefined) normalizedQuery.filter = query.filter;

  return JSON.stringify(normalizeQueryValue(normalizedQuery));
};

export const celanworksmithObjectQueryRequested = (
  request: CelanworksmithObjectQueryRequest,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_REQUESTED,
  payload: request,
});

export const celanworksmithObjectQueryStart = (
  request: CelanworksmithObjectQueryRequest,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_START,
  payload: request,
});

export const celanworksmithObjectQuerySuccess = (
  request: CelanworksmithObjectQueryRequest,
  result: CelanworksmithObjectSet,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_SUCCESS,
  payload: { ...request, result },
});

export const celanworksmithObjectQueryError = (
  request: CelanworksmithObjectQueryRequest,
  error: CelanworksmithObjectQueryError,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_ERROR,
  payload: { ...request, error },
});

export type CelanworksmithObjectQueryAction = ReduxAction<
  | CelanworksmithObjectQueryRequest
  | (CelanworksmithObjectQueryRequest & { result: CelanworksmithObjectSet })
  | (CelanworksmithObjectQueryRequest & {
      error: CelanworksmithObjectQueryError;
    })
>;
