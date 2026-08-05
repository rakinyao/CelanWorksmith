import CelanworksmithAPI, {
  normalizeCelanworksmithError,
  type CelanworksmithAction,
  type CelanworksmithFunction,
} from "api/CelanworksmithAPI";
import type { ApiResponse } from "api/ApiResponses";
import {
  celanworksmithOntologyLoadError,
  celanworksmithOntologyLoadSuccess,
} from "actions/celanworksmithOntologyActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { all, call, put, takeLeading } from "redux-saga/effects";

const assertApiSuccess = <T>(response: ApiResponse<T>): T => {
  if (!response?.responseMeta?.success) throw response;

  return response.data;
};

export function* loadCelanworksmithOntology() {
  try {
    const [functionsResponse, actionsResponse]: [
      ApiResponse<CelanworksmithFunction[]>,
      ApiResponse<CelanworksmithAction[]>,
    ] = yield all([
      call([CelanworksmithAPI, CelanworksmithAPI.getFunctions]),
      call([CelanworksmithAPI, CelanworksmithAPI.getActions]),
    ]);

    yield put(
      celanworksmithOntologyLoadSuccess(
        assertApiSuccess(functionsResponse),
        assertApiSuccess(actionsResponse),
      ),
    );
  } catch (error) {
    yield put(
      celanworksmithOntologyLoadError(normalizeCelanworksmithError(error)),
    );
  }

  yield put({ type: ReduxActionTypes.TRIGGER_EVAL });
}

export default function* celanworksmithOntologySaga() {
  yield all([
    takeLeading(
      ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST,
      loadCelanworksmithOntology,
    ),
  ]);
}
