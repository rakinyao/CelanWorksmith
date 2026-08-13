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
import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithCurrentApplicationId,
} from "selectors/celanworksmithApplicationBindingSelectors";
import { all, call, put, select, takeLeading } from "redux-saga/effects";

const assertApiSuccess = <T>(response: ApiResponse<T>): T => {
  if (!response?.responseMeta?.success) {
    const apiError = response?.responseMeta?.error;
    const error = new Error(
      apiError?.message || "CelanWorksmith ontology request failed",
    );

    if (apiError?.code)
      (error as Error & { code: string }).code = apiError.code;
    throw error;
  }

  return response.data;
};

export function* loadCelanworksmithOntology(action?: { payload?: { applicationId?: string } }) {
  const requestedApplicationId = action?.payload?.applicationId;
  const currentApplicationId: string | undefined = yield select(
    getCelanworksmithCurrentApplicationId,
  );
  const bindingState = yield select(getCelanworksmithApplicationBindingState);
  const applicationId = requestedApplicationId || currentApplicationId;

  if (
    !applicationId ||
    requestedApplicationId !== applicationId ||
    bindingState.applicationId !== applicationId ||
    bindingState.status !== "ready"
  ) {
    yield put({ type: ReduxActionTypes.TRIGGER_EVAL });

    return;
  }

  try {
    const [functionsResponse, actionsResponse]: [
      ApiResponse<CelanworksmithFunction[]>,
      ApiResponse<CelanworksmithAction[]>,
    ] = yield all([
      call([CelanworksmithAPI, CelanworksmithAPI.getFunctions], applicationId),
      call([CelanworksmithAPI, CelanworksmithAPI.getActions], undefined, applicationId),
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
