import CelanworksmithAPI, {
  normalizeCelanworksmithError,
  type CelanworksmithLinkType,
  type CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";
import type { ApiResponse } from "api/ApiResponses";
import type { ReduxAction } from "actions/ReduxActionTypes";
import {
  celanworksmithLinkLoadError,
  celanworksmithLinkLoadStart,
  celanworksmithLinkLoadSuccess,
  celanworksmithLinkMetadataLoadError,
  celanworksmithLinkMetadataLoadSuccess,
  type CelanworksmithLinkRequest,
} from "actions/celanworksmithLinkActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type {
  CelanworksmithLinkEntryState,
  CelanworksmithLinkMetadataState,
} from "reducers/celanworksmithLinksReducer";
import {
  getCelanworksmithLinkEntry,
  getCelanworksmithLinkMetadata,
} from "selectors/celanworksmithSelectors";
import { all, call, put, select, takeEvery } from "redux-saga/effects";

export const CELANWORKSMITH_LINK_QUERY_LIMIT = 100;

const inFlightMetadataTypes = new Set<string>();
const inFlightLinkKeys = new Set<string>();

const assertApiSuccess = <T>(response: ApiResponse<T>): T => {
  if (!response?.responseMeta?.success) {
    throw (
      response?.responseMeta?.error || new Error("CelanWorksmith API error")
    );
  }

  return response.data;
};

export function* loadCelanworksmithLinkMetadata(
  action: ReduxAction<string> & { meta?: { force?: boolean } },
) {
  const typeId = action.payload;
  const metadata: CelanworksmithLinkMetadataState | undefined = yield select(
    getCelanworksmithLinkMetadata,
    typeId,
  );

  if (
    inFlightMetadataTypes.has(typeId) ||
    (metadata?.updatedAt && !action.meta?.force)
  ) {
    return;
  }

  inFlightMetadataTypes.add(typeId);

  try {
    const response: ApiResponse<CelanworksmithLinkType[]> = yield call(
      [CelanworksmithAPI, CelanworksmithAPI.getLinkTypes],
      typeId,
    );

    yield put(
      celanworksmithLinkMetadataLoadSuccess(typeId, assertApiSuccess(response)),
    );
  } catch (error) {
    yield put(
      celanworksmithLinkMetadataLoadError(
        typeId,
        normalizeCelanworksmithError(error),
      ),
    );
  } finally {
    inFlightMetadataTypes.delete(typeId);
  }
}

export function* loadCelanworksmithLink(
  action: ReduxAction<CelanworksmithLinkRequest>,
) {
  const request = action.payload;
  const entry: CelanworksmithLinkEntryState | undefined = yield select(
    getCelanworksmithLinkEntry,
    request,
  );

  const key = `${request.typeId}/${request.objectId}/${request.linkTypeId}`;

  if (
    inFlightLinkKeys.has(key) ||
    (!request.force && ["ready", "empty"].includes(entry?.status || ""))
  ) {
    return;
  }

  inFlightLinkKeys.add(key);

  yield put(celanworksmithLinkLoadStart(request));

  try {
    const response: ApiResponse<CelanworksmithObjectSet> =
      yield request.applicationId
        ? call(
            [CelanworksmithAPI, CelanworksmithAPI.getLinkedObjects],
            request.typeId,
            request.objectId,
            request.linkTypeId,
            { offset: 0, limit: CELANWORKSMITH_LINK_QUERY_LIMIT },
            request.applicationId,
          )
        : call(
            [CelanworksmithAPI, CelanworksmithAPI.getLinkedObjects],
            request.typeId,
            request.objectId,
            request.linkTypeId,
            { offset: 0, limit: CELANWORKSMITH_LINK_QUERY_LIMIT },
          );

    yield put(
      celanworksmithLinkLoadSuccess(request, assertApiSuccess(response)),
    );
    yield put({ type: ReduxActionTypes.TRIGGER_EVAL });
  } catch (error) {
    yield put(
      celanworksmithLinkLoadError(request, normalizeCelanworksmithError(error)),
    );
  } finally {
    inFlightLinkKeys.delete(key);
  }
}

export default function* celanworksmithLinksSaga() {
  yield all([
    takeEvery(
      ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_REQUESTED,
      loadCelanworksmithLinkMetadata,
    ),
    takeEvery(
      ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_REQUESTED,
      loadCelanworksmithLink,
    ),
  ]);
}
