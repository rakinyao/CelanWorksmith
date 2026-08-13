import {
  celanworksmithActionRetry,
  celanworksmithFunctionRetry,
} from "actions/celanworksmithExecutionActions";
import {
  celanworksmithLinkLoadRequested,
  celanworksmithLinkMetadataLoadRequested,
} from "actions/celanworksmithLinkActions";
import {
  celanworksmithRuntimeCacheCleared,
  type CelanworksmithLoadRetryTarget,
} from "actions/celanworksmithLoadStateActions";
import {
  celanworksmithObjectTypesRefreshRequested,
  celanworksmithObjectsLoadRequest,
} from "actions/celanworksmithObjectActions";
import { celanworksmithObjectQueryRequested } from "actions/celanworksmithObjectQueryActions";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";
import { getCelanworksmithObjectSetVariableRequest } from "entities/DataTree/dataTreeCelanworksmithVariables";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type { CelanworksmithLinksState } from "reducers/celanworksmithLinksReducer";
import type { CelanworksmithObjectQueryState } from "reducers/celanworksmithObjectQueryReducer";
import { all, put, select, takeEvery } from "redux-saga/effects";

interface CelanworksmithRuntimeCacheRootState {
  celanworksmithLinks?: CelanworksmithLinksState;
  celanworksmithObjectQueries?: CelanworksmithObjectQueryState;
}

const getRuntimeCacheRootState = (
  state: CelanworksmithRuntimeCacheRootState,
) => ({
  links: state.celanworksmithLinks || { entries: {}, metadata: {} },
  queries: state.celanworksmithObjectQueries || { entries: {} },
});

const isRequestInApplication = (
  requestApplicationId: string | undefined,
  applicationId?: string,
) => !applicationId || requestApplicationId === applicationId;

export function* clearCelanworksmithRuntimeCache(action: {
  payload?: { applicationId?: string };
}) {
  const applicationId = action.payload?.applicationId;
  const { links, queries }: ReturnType<typeof getRuntimeCacheRootState> =
    yield select(getRuntimeCacheRootState);
  const queryRequests = Object.values(queries.entries)
    .map((entry) => entry.request)
    .filter((request) =>
      isRequestInApplication(request.applicationId, applicationId),
    );
  const linkRequests = Object.values(links.entries)
    .map((entry) => entry.request)
    .filter(
      (request) =>
        request && isRequestInApplication(request.applicationId, applicationId),
    );

  yield put(celanworksmithRuntimeCacheCleared(applicationId));
  yield put(celanworksmithOntologyLoadRequest(applicationId));
  yield put(celanworksmithObjectsLoadRequest(applicationId));

  for (const request of queryRequests) {
    yield put(
      celanworksmithObjectQueryRequested({
        ...request,
        force: true,
      }),
    );
  }

  for (const request of linkRequests) {
    yield put(
      celanworksmithLinkLoadRequested({
        ...request,
        force: true,
      }),
    );
  }
}

export function* routeCelanworksmithLoadRetry(action: {
  payload: CelanworksmithLoadRetryTarget;
}) {
  const target = action.payload;

  if (target.kind === "objectMetadata") {
    yield put(celanworksmithObjectsLoadRequest(target.applicationId));
  } else if (target.kind === "objectSet") {
    yield put(celanworksmithObjectTypesRefreshRequested([target.typeId]));
  } else if (target.kind === "objectQuery") {
    yield put(celanworksmithObjectQueryRequested(target.request));
  } else if (target.kind === "linkMetadata") {
    yield put(
      celanworksmithLinkMetadataLoadRequested(
        target.typeId,
        true,
        target.applicationId,
      ),
    );
  } else if (target.kind === "linkEntry") {
    yield put(
      celanworksmithLinkLoadRequested({ ...target.request, force: true }),
    );
  } else if (target.kind === "ontology") {
    yield put(celanworksmithOntologyLoadRequest(target.applicationId));
  } else if (target.kind === "function") {
    yield put(
      celanworksmithFunctionRetry(
        target.functionId,
        target.parameters,
        target.applicationId,
      ),
    );
  } else if (target.kind === "action") {
    yield put(
      celanworksmithActionRetry(
        target.actionId,
        target.request,
        target.applicationId,
      ),
    );
  } else if (target.definition.kind === "OBJECT_SET") {
    yield put(
      celanworksmithObjectQueryRequested(
        getCelanworksmithObjectSetVariableRequest(target.definition),
      ),
    );
  } else if (target.definition.kind === "FUNCTION") {
    yield put(
      celanworksmithFunctionRetry(
        target.definition.config.functionId,
        target.definition.config.parameters,
        target.applicationId,
      ),
    );
  }
}

export default function* celanworksmithLoadRetrySaga() {
  yield all([
    takeEvery(
      ReduxActionTypes.CELANWORKSMITH_LOAD_RETRY,
      routeCelanworksmithLoadRetry,
    ),
    takeEvery(
      ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEAR_REQUEST,
      clearCelanworksmithRuntimeCache,
    ),
  ]);
}
