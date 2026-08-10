import CelanworksmithAPI, {
  normalizeCelanworksmithError,
  type CelanworksmithObjectQuery,
  type CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";
import type { ApiResponse } from "api/ApiResponses";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type { ReduxAction } from "actions/ReduxActionTypes";
import {
  celanworksmithObjectQueryError,
  celanworksmithObjectQueryStart,
  celanworksmithObjectQuerySuccess,
  type CelanworksmithObjectQueryRequest,
  getCelanworksmithObjectQuerySignature,
} from "actions/celanworksmithObjectQueryActions";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithCurrentApplicationId,
} from "selectors/celanworksmithApplicationBindingSelectors";
import { call, put, select, takeEvery } from "redux-saga/effects";

export const CELANWORKSMITH_OBJECT_QUERY_MAX_LIMIT = 100;
const inFlight = new Set<string>();
const FILTER_OPERATORS = new Set([
  "equals",
  "contains",
  "startsWith",
  "gt",
  "gte",
  "lt",
  "lte",
  "isEmpty",
]);

const getKey = (request: CelanworksmithObjectQueryRequest) =>
  `${request.widgetId}/${request.typeId}/${getCelanworksmithObjectQuerySignature(request.query)}`;

const normalizeQuery = (
  request: CelanworksmithObjectQueryRequest,
  propertyIds: Set<string>,
): CelanworksmithObjectQuery => {
  const query = request.query || {};
  const limit = Math.min(
    CELANWORKSMITH_OBJECT_QUERY_MAX_LIMIT,
    Math.max(1, Number.isInteger(query.limit) ? query.limit! : 100),
  );
  const offset = Math.max(
    0,
    Number.isInteger(query.offset) ? query.offset! : 0,
  );

  if (query.sortBy && !propertyIds.has(query.sortBy)) {
    throw {
      code: "INVALID_ARGUMENT",
      message: "The sort property is invalid.",
    };
  }

  if (
    query.sortDirection !== undefined &&
    query.sortDirection !== "asc" &&
    query.sortDirection !== "desc"
  ) {
    throw {
      code: "INVALID_ARGUMENT",
      message: "The sort direction is invalid.",
    };
  }

  if (query.filter !== undefined) {
    const filter = query.filter;
    const conditions =
      typeof filter === "object" && !Array.isArray(filter)
        ? (filter as Record<string, unknown>).conditions
        : undefined;

    if (
      typeof filter !== "object" ||
      Array.isArray(filter) ||
      (filter as Record<string, unknown>).typeId !== request.typeId ||
      (filter as Record<string, unknown>).version !== 1 ||
      !Array.isArray(conditions) ||
      conditions.some(
        (condition) =>
          !condition ||
          typeof condition !== "object" ||
          !propertyIds.has(
            String((condition as Record<string, unknown>).propertyId),
          ) ||
          !FILTER_OPERATORS.has(
            String((condition as Record<string, unknown>).operator),
          ),
      )
    ) {
      throw {
        code: "INVALID_ARGUMENT",
        message: "The object filter is invalid.",
      };
    }
  }

  return {
    offset,
    limit,
    ...(query.sortBy ? { sortBy: query.sortBy } : {}),
    ...(query.sortDirection ? { sortDirection: query.sortDirection } : {}),
    ...(query.filter !== undefined ? { filter: query.filter } : {}),
  };
};

export function* loadCelanworksmithObjectQuery(
  action: ReduxAction<CelanworksmithObjectQueryRequest>,
) {
  const requestedRequest = action.payload;
  const currentApplicationId: string | undefined = yield select(
    getCelanworksmithCurrentApplicationId,
  );
  const bindingState = (yield select(
    getCelanworksmithApplicationBindingState,
  )) || {
    status: "idle",
    applicationId: undefined,
  };
  if (
    currentApplicationId &&
    (bindingState.applicationId !== currentApplicationId ||
      !["ready", "unbound"].includes(bindingState.status))
  ) {
    return;
  }
  if (
    requestedRequest.applicationId &&
    requestedRequest.applicationId !== currentApplicationId
  ) {
    return;
  }
  const request = {
    ...requestedRequest,
    ...(bindingState.status === "ready" && currentApplicationId
      ? { applicationId: currentApplicationId }
      : {}),
  };
  const key = getKey(request);

  if (inFlight.has(key)) return;

  const objectState = yield select(getCelanworksmithObjectsState);
  const metadata = objectState.types[request.typeId]?.metadata;

  if (!metadata) {
    yield put(
      celanworksmithObjectQueryError(request, {
        code: "UNKNOWN_OBJECT",
        message: "The object type metadata is unavailable.",
      }),
    );

    return;
  }

  inFlight.add(key);
  yield put(celanworksmithObjectQueryStart(request));

  try {
    const query = normalizeQuery(
      request,
      new Set(metadata.properties.map((property) => property.id)),
    );
    const response: ApiResponse<CelanworksmithObjectSet> =
      yield request.applicationId
        ? call(
            [CelanworksmithAPI, CelanworksmithAPI.queryObjects],
            request.typeId,
            query,
            request.applicationId,
          )
        : call(
            [CelanworksmithAPI, CelanworksmithAPI.queryObjects],
            request.typeId,
            query,
          );

    if (!response?.responseMeta?.success) throw response?.responseMeta?.error;

    yield put(celanworksmithObjectQuerySuccess(request, response.data));
  } catch (error) {
    yield put(
      celanworksmithObjectQueryError(
        request,
        normalizeCelanworksmithError(error),
      ),
    );
  } finally {
    inFlight.delete(key);
  }
}

export default function* celanworksmithObjectQuerySaga() {
  yield takeEvery(
    ReduxActionTypes.CELANWORKSMITH_OBJECT_QUERY_REQUESTED,
    loadCelanworksmithObjectQuery,
  );
}
