import { all, debounce, takeLatest } from "redux-saga/effects";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import PostEvaluationSagas, {
  refreshCelanworksmithTernDefinitions,
} from "./PostEvaluationSagas";

describe("PostEvaluationSagas", () => {
  it("refreshes Tern definitions after ontology metadata succeeds", () => {
    const iterator = PostEvaluationSagas();

    expect(iterator.next().value).toEqual(
      all([
        debounce(
          1000,
          ReduxActionTypes.EXECUTE_REACTIVE_QUERIES,
          expect.any(Function),
        ),
        takeLatest(
          ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_SUCCESS,
          refreshCelanworksmithTernDefinitions,
        ),
        takeLatest(
          ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_SUCCESS,
          refreshCelanworksmithTernDefinitions,
        ),
      ]),
    );
  });
});
