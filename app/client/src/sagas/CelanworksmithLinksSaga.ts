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
  type CelanworksmithLinkMetadataRequestMeta,
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
import {
  getCelanworksmithLinkKey,
  getCelanworksmithLinkMetadataKey,
} from "reducers/celanworksmithLinksReducer";
import type { Task } from "redux-saga";
import { all, call, cancel, fork, put, select, take } from "redux-saga/effects";

export const CELANWORKSMITH_LINK_QUERY_LIMIT = 100;

const assertApiSuccess = <T>(response: ApiResponse<T>): T => {
  if (!response?.responseMeta?.success) {
    throw (
      response?.responseMeta?.error || new Error("CelanWorksmith API error")
    );
  }

  return response.data;
};

export function* loadCelanworksmithLinkMetadata(
  action: ReduxAction<string> & {
    meta?: CelanworksmithLinkMetadataRequestMeta;
  },
) {
  const typeId = action.payload;
  const applicationId = action.meta?.applicationId;
  const metadata: CelanworksmithLinkMetadataState | undefined = yield select(
    getCelanworksmithLinkMetadata,
    typeId,
    applicationId,
  );

  if (metadata?.updatedAt && !action.meta?.force) {
    return;
  }

  try {
    const response: ApiResponse<CelanworksmithLinkType[]> = yield applicationId
      ? call(
          [CelanworksmithAPI, CelanworksmithAPI.getLinkTypes],
          typeId,
          applicationId,
        )
      : call([CelanworksmithAPI, CelanworksmithAPI.getLinkTypes], typeId);

    yield put(
      celanworksmithLinkMetadataLoadSuccess(
        typeId,
        assertApiSuccess(response),
        applicationId,
      ),
    );
  } catch (error) {
    yield put(
      celanworksmithLinkMetadataLoadError(
        typeId,
        normalizeCelanworksmithError(error),
        applicationId,
      ),
    );
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

  if (!request.force && ["ready", "empty"].includes(entry?.status || "")) {
    return;
  }

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
  }
}

interface TrackedLinkTask {
  task: Task;
  token: symbol;
}

function* runTrackedLinkMetadata(
  action: ReduxAction<string> & {
    meta?: CelanworksmithLinkMetadataRequestMeta;
  },
  key: string,
  tasks: Map<string, TrackedLinkTask>,
  token: symbol,
) {
  try {
    yield call(loadCelanworksmithLinkMetadata, action);
  } finally {
    if (tasks.get(key)?.token === token) tasks.delete(key);
  }
}

export function* watchCelanworksmithLinkMetadataRequests() {
  const tasks = new Map<string, TrackedLinkTask>();

  while (true) {
    const action: ReduxAction<string> & {
      meta?: CelanworksmithLinkMetadataRequestMeta;
    } = yield take(
      ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_REQUESTED,
    );
    const key = getCelanworksmithLinkMetadataKey(
      action.payload,
      action.meta?.applicationId,
    );
    const current = tasks.get(key);

    if (current?.task.isRunning()) {
      if (!action.meta?.force) continue;

      tasks.delete(key);
      yield cancel(current.task);
    } else if (current) {
      tasks.delete(key);
    }

    const token = Symbol(key);
    const task: Task = yield fork(
      runTrackedLinkMetadata,
      action,
      key,
      tasks,
      token,
    );

    if (task.isRunning()) tasks.set(key, { task, token });
  }
}

function* runTrackedLink(
  action: ReduxAction<CelanworksmithLinkRequest>,
  key: string,
  tasks: Map<string, TrackedLinkTask>,
  token: symbol,
) {
  try {
    yield call(loadCelanworksmithLink, action);
  } finally {
    if (tasks.get(key)?.token === token) tasks.delete(key);
  }
}

export function* watchCelanworksmithLinkRequests() {
  const tasks = new Map<string, TrackedLinkTask>();

  while (true) {
    const action: ReduxAction<CelanworksmithLinkRequest> = yield take(
      ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_REQUESTED,
    );
    const request = action.payload;
    const key = getCelanworksmithLinkKey(request);
    const current = tasks.get(key);

    if (current?.task.isRunning()) {
      if (!request.force) continue;

      tasks.delete(key);
      yield cancel(current.task);
    } else if (current) {
      tasks.delete(key);
    }

    const token = Symbol(key);
    const task: Task = yield fork(runTrackedLink, action, key, tasks, token);

    if (task.isRunning()) tasks.set(key, { task, token });
  }
}

export default function* celanworksmithLinksSaga() {
  yield all([
    call(watchCelanworksmithLinkMetadataRequests),
    call(watchCelanworksmithLinkRequests),
  ]);
}
