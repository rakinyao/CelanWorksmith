import CelanworksmithAPI, {
  type CelanworksmithObjectInstance,
  type CelanworksmithObjectSet,
  type CelanworksmithObjectType,
} from "api/CelanworksmithAPI";
import type { ApiResponse } from "api/ApiResponses";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type { ReduxAction } from "actions/ReduxActionTypes";
import {
  all,
  call,
  put,
  select,
  takeEvery,
  takeLeading,
} from "redux-saga/effects";
import {
  celanworksmithObjectTypeLoadError,
  celanworksmithObjectTypeLoadStart,
  celanworksmithObjectTypeLoadSuccess,
  celanworksmithObjectTypeRefreshStart,
  celanworksmithObjectTypesRefreshComplete,
  celanworksmithObjectsLoadError,
  celanworksmithObjectsLoadInit,
  celanworksmithObjectsMetadataSuccess,
} from "actions/celanworksmithObjectActions";
import type { CelanworksmithObjectError } from "reducers/celanworksmithObjectsReducer";
import type { CelanworksmithObjectsState } from "reducers/celanworksmithObjectsReducer";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithCurrentApplicationId,
} from "selectors/celanworksmithApplicationBindingSelectors";

export const CELANWORKSMITH_OBJECT_QUERY_LIMIT = 100;

type ObjectTypeLoadStart = (typeId: string) => {
  type: string;
  payload: string;
};

export const CELANWORKSMITH_OBJECT_LOAD_TRIGGERS = [
  ReduxActionTypes.CELANWORKSMITH_OBJECTS_LOAD_REQUEST,
  ReduxActionTypes.INITIALIZE_EDITOR_SUCCESS,
  ReduxActionTypes.INITIALIZE_PAGE_VIEWER_SUCCESS,
  ReduxActionTypes.FETCH_PAGE_INIT,
  ReduxActionTypes.FETCH_PAGE_SUCCESS,
  ReduxActionTypes.CREATE_PAGE_SUCCESS,
  ReduxActionTypes.SETUP_PAGE_SUCCESS,
  ReduxActionTypes.FETCH_ALL_PAGE_ENTITY_COMPLETION,
  ReduxActionTypes.FETCH_PUBLISHED_PAGE_INIT,
  ReduxActionTypes.FETCH_PUBLISHED_PAGE_SUCCESS,
  ReduxActionTypes.UPDATE_WIDGET_PROPERTY,
  ReduxActionTypes.BATCH_UPDATE_WIDGET_PROPERTY,
];

const getApiError = (error: unknown): CelanworksmithObjectError => {
  const response = (error as { response?: { data?: unknown } })?.response
    ?.data as Partial<ApiResponse> | undefined;
  const responseError = response?.responseMeta?.error;

  if (responseError) {
    return {
      code: responseError.code || "CELANWORKSMITH_OBJECTS_ERROR",
      message: responseError.message || "Unable to load object data",
    };
  }

  if (error && typeof error === "object" && "message" in error) {
    return {
      code: "CELANWORKSMITH_OBJECTS_ERROR",
      message: String((error as { message: unknown }).message),
    };
  }

  return {
    code: "CELANWORKSMITH_OBJECTS_ERROR",
    message: "Unable to load object data",
  };
};

const assertApiSuccess = <T>(response: ApiResponse<T>): T => {
  if (!response?.responseMeta?.success) {
    throw (
      response?.responseMeta?.error || new Error("CelanWorksmith API error")
    );
  }

  return response.data;
};

export function* loadCelanworksmithObjectType(
  typeId: string,
  startLoad: ObjectTypeLoadStart = celanworksmithObjectTypeLoadStart,
  applicationId?: string,
) {
  yield put(startLoad(typeId));

  try {
    const items: CelanworksmithObjectInstance[] = [];
    let offset = 0;
    let total = 0;
    let page: CelanworksmithObjectSet;

    do {
      const queryCall = applicationId
        ? call(
            [CelanworksmithAPI, CelanworksmithAPI.queryObjects],
            typeId,
            { offset, limit: CELANWORKSMITH_OBJECT_QUERY_LIMIT },
            applicationId,
          )
        : call([CelanworksmithAPI, CelanworksmithAPI.queryObjects], typeId, {
            offset,
            limit: CELANWORKSMITH_OBJECT_QUERY_LIMIT,
          });
      const response: ApiResponse<CelanworksmithObjectSet> = yield queryCall;

      page = assertApiSuccess(response);
      const pageItems = page.items || [];

      items.push(...pageItems);
      total = page.total ?? items.length;

      if (!pageItems.length || items.length >= total) break;

      const nextOffset = offset + pageItems.length;

      if (nextOffset <= offset) break;

      offset = nextOffset;
    } while (items.length < total);

    yield put(
      celanworksmithObjectTypeLoadSuccess(typeId, {
        typeId,
        items,
        offset: 0,
        limit: CELANWORKSMITH_OBJECT_QUERY_LIMIT,
        total,
      }),
    );
  } catch (error) {
    yield put(celanworksmithObjectTypeLoadError(typeId, getApiError(error)));
  }
}

export function* refreshCelanworksmithObjectTypes(
  action: ReduxAction<string[]> & { meta?: { correlationId?: string } },
) {
  const typeIds = [...new Set(action.payload)];

  if (!typeIds.length) return;

  const currentApplicationId: string | undefined = yield select(
    getCelanworksmithCurrentApplicationId,
  );
  const bindingState = (yield select(
    getCelanworksmithApplicationBindingState,
  )) || {
    status: "idle",
    applicationId: undefined,
  };
  const applicationId =
    currentApplicationId &&
    bindingState.applicationId === currentApplicationId &&
    bindingState.status === "ready"
      ? currentApplicationId
      : undefined;

  yield all(
    typeIds.map((typeId) =>
      call(
        loadCelanworksmithObjectType,
        typeId,
        celanworksmithObjectTypeRefreshStart,
        applicationId,
      ),
    ),
  );
  yield put(
    celanworksmithObjectTypesRefreshComplete(
      typeIds,
      action.meta?.correlationId,
    ),
  );
}

export function* loadCelanworksmithObjects(
  action?: ReduxAction<{ applicationId?: string }>,
) {
  const requestedApplicationId = action?.payload?.applicationId;
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
      bindingState.status !== "ready")
  ) {
    return;
  }
  if (requestedApplicationId && requestedApplicationId !== currentApplicationId)
    return;
  const applicationId =
    requestedApplicationId ||
    (bindingState.status === "ready" ? currentApplicationId : undefined);
  const cachedState: CelanworksmithObjectsState = yield select(
    getCelanworksmithObjectsState,
  );

  yield put(celanworksmithObjectsLoadInit());

  try {
    let objectTypes = Object.values(cachedState.types)
      .map((typeState) => typeState.metadata)
      .filter((metadata): metadata is CelanworksmithObjectType => !!metadata);

    if (!objectTypes.length) {
      const metadataCall = applicationId
        ? call(
            [CelanworksmithAPI, CelanworksmithAPI.getObjectTypes],
            applicationId,
          )
        : call([CelanworksmithAPI, CelanworksmithAPI.getObjectTypes]);
      const response: ApiResponse<CelanworksmithObjectType[]> =
        yield metadataCall;

      objectTypes = assertApiSuccess(response);
      yield put(celanworksmithObjectsMetadataSuccess(objectTypes));
    }

    const typesToLoad = objectTypes.filter((objectType) => {
      const cachedType = cachedState.types[objectType.id];

      return (
        !cachedType || ["idle", "loading", "error"].includes(cachedType.status)
      );
    });

    yield all(
      typesToLoad.map((objectType) =>
        applicationId
          ? call(
              loadCelanworksmithObjectType,
              objectType.id,
              celanworksmithObjectTypeLoadStart,
              applicationId,
            )
          : call(loadCelanworksmithObjectType, objectType.id),
      ),
    );
    yield put({ type: ReduxActionTypes.TRIGGER_EVAL });
  } catch (error) {
    yield put(celanworksmithObjectsLoadError(getApiError(error)));
    yield put({ type: ReduxActionTypes.TRIGGER_EVAL });
  }
}

export default function* celanworksmithObjectsSaga() {
  yield all([
    takeLeading(CELANWORKSMITH_OBJECT_LOAD_TRIGGERS, loadCelanworksmithObjects),
    takeEvery(
      ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPES_REFRESH_REQUESTED,
      refreshCelanworksmithObjectTypes,
    ),
  ]);
}
