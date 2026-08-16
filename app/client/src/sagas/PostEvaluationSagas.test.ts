import { all, debounce } from "redux-saga/effects";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import PostEvaluationSagas, {
  updateTernDefinitions,
} from "./PostEvaluationSagas";
import { DataTreeDiffEvent } from "ee/workers/Evaluation/evaluationUtils";

describe("PostEvaluationSagas", () => {
  it("keeps the native reactive query scheduler registered", () => {
    const iterator = PostEvaluationSagas();

    expect(iterator.next().value).toEqual(
      all([
        debounce(
          1000,
          ReduxActionTypes.EXECUTE_REACTIVE_QUERIES,
          expect.any(Function),
        ),
      ]),
    );
  });

  it("does not rebuild Tern definitions for an ordinary widget change", () => {
    const iterator = updateTernDefinitions(
      {} as never,
      {},
      [
        {
          event: DataTreeDiffEvent.EDIT,
          payload: { propertyPath: "Widget1.text" },
        },
      ],
      false,
    );

    expect(iterator.next().done).toBe(true);
  });
});
