import {
  celanworksmithActionRetry,
  celanworksmithFunctionRetry,
} from "actions/celanworksmithExecutionActions";
import {
  celanworksmithLinkLoadRequested,
  celanworksmithLinkMetadataLoadRequested,
} from "actions/celanworksmithLinkActions";
import type { CelanworksmithLoadRetryTarget } from "actions/celanworksmithLoadStateActions";
import {
  celanworksmithObjectTypesRefreshRequested,
  celanworksmithObjectsLoadRequest,
} from "actions/celanworksmithObjectActions";
import { celanworksmithObjectQueryRequested } from "actions/celanworksmithObjectQueryActions";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";
import { getCelanworksmithObjectSetVariableRequest } from "entities/DataTree/dataTreeCelanworksmithVariables";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { all, put, takeEvery } from "redux-saga/effects";

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
    yield put(celanworksmithLinkMetadataLoadRequested(target.typeId, true));
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
  ]);
}
