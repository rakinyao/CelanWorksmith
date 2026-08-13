import { all, debounce, select, takeLatest } from "redux-saga/effects";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import PostEvaluationSagas, {
  refreshCelanworksmithTernDefinitions,
  updateTernDefinitions,
} from "./PostEvaluationSagas";
import { getCelanworksmithObjectsDataTree } from "selectors/dataTreeSelectors";
import { DataTreeDiffEvent } from "ee/workers/Evaluation/evaluationUtils";

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
          ReduxActionTypes.CELANWORKSMITH_OBJECTS_METADATA_SUCCESS,
          refreshCelanworksmithTernDefinitions,
        ),
        takeLatest(
          ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_START,
          refreshCelanworksmithTernDefinitions,
        ),
        takeLatest(
          ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_REFRESH_START,
          refreshCelanworksmithTernDefinitions,
        ),
        takeLatest(
          ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_SUCCESS,
          refreshCelanworksmithTernDefinitions,
        ),
        takeLatest(
          ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_ERROR,
          refreshCelanworksmithTernDefinitions,
        ),
        takeLatest(
          ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_SUCCESS,
          refreshCelanworksmithTernDefinitions,
        ),
      ]),
    );
  });

  it("rebuilds Tern definitions when CelanWorksmith variables change", () => {
    const iterator = updateTernDefinitions(
      {} as never,
      {},
      [
        {
          event: DataTreeDiffEvent.EDIT,
          payload: { propertyPath: "$variables.delayedOrderCount" },
        },
      ],
      false,
    );

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithObjectsDataTree),
    );
  });
});
