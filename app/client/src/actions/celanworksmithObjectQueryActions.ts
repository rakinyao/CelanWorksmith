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
}

export interface CelanworksmithObjectQueryError {
  code: string;
  message: string;
}

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
