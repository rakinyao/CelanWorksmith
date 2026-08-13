import CelanworksmithAPI, {
  normalizeCelanworksmithError,
  type CelanworksmithApplicationBinding,
  type CelanworksmithOntologyProjectSummary,
} from "api/CelanworksmithAPI";
import type { ApiResponse } from "api/ApiResponses";
import {
  celanworksmithApplicationBindingLoadError,
  celanworksmithApplicationBindingLoadSuccess,
} from "actions/celanworksmithApplicationBindingActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { all, call, put, takeLatest } from "redux-saga/effects";
import type { ReduxAction } from "actions/ReduxActionTypes";

const assertSuccess = <T>(response: ApiResponse<T>): T => {
  if (!response?.responseMeta?.success) throw response?.responseMeta?.error;

  return response.data;
};

export function* loadCelanworksmithApplicationBinding(
  action: ReduxAction<{ applicationId: string }>,
) {
  const { applicationId } = action.payload;

  try {
    const [projectsResponse, bindingResponse]: [
      ApiResponse<CelanworksmithOntologyProjectSummary[]>,
      ApiResponse<CelanworksmithApplicationBinding | null>,
    ] = yield all([
      call([CelanworksmithAPI, CelanworksmithAPI.listOntologyProjects]),
      call(
        [CelanworksmithAPI, CelanworksmithAPI.getApplicationOntologyBinding],
        applicationId,
      ),
    ]);

    yield put(
      celanworksmithApplicationBindingLoadSuccess(
        applicationId,
        assertSuccess(bindingResponse),
        assertSuccess(projectsResponse),
      ),
    );
  } catch (error) {
    yield put(
      celanworksmithApplicationBindingLoadError(
        applicationId,
        normalizeCelanworksmithError(error),
      ),
    );
  }
}

export function* saveCelanworksmithApplicationBinding(
  action: ReduxAction<{
    applicationId: string;
    request: Parameters<
      typeof CelanworksmithAPI.saveApplicationOntologyBinding
    >[1];
  }>,
) {
  try {
    const response: ApiResponse<CelanworksmithApplicationBinding> = yield call(
      [CelanworksmithAPI, CelanworksmithAPI.saveApplicationOntologyBinding],
      action.payload.applicationId,
      action.payload.request,
    );

    yield put({
      type: ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_SAVE_SUCCESS,
      payload: {
        applicationId: action.payload.applicationId,
        binding: assertSuccess(response),
      },
    });
  } catch (error) {
    yield put({
      type: ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_SAVE_ERROR,
      payload: {
        ...normalizeCelanworksmithError(error),
        applicationId: action.payload.applicationId,
      },
    });
  }
}

export default function* celanworksmithApplicationBindingSaga() {
  yield takeLatest(
    ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST,
    loadCelanworksmithApplicationBinding,
  );
  yield takeLatest(
    ReduxActionTypes.CELANWORKSMITH_APPLICATION_BINDING_SAVE_REQUEST,
    saveCelanworksmithApplicationBinding,
  );
}
