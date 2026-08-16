import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import type { ActionDescription } from "ee/workers/Evaluation/fns";
import { call } from "redux-saga/effects";
import executePluginActionTriggerSaga from "sagas/ActionExecution/PluginActionSaga";
import { executeActionTriggers } from "./ActionExecutionSagas";

const triggerMeta = { onPageLoad: false };

describe("executeActionTriggers", () => {
  it("preserves native plugin trigger response arrays", () => {
    const trigger = {
      type: "RUN_PLUGIN_ACTION",
      payload: {
        actionId: "nativeAction",
        params: {},
      },
    } as ActionDescription;
    const iterator = executeActionTriggers(
      trigger,
      EventType.ON_CLICK,
      triggerMeta,
    );

    expect(iterator.next().value).toEqual(
      call(executePluginActionTriggerSaga, trigger, EventType.ON_CLICK),
    );

    expect(iterator.next(["native-response"]).value).toEqual([
      "native-response",
    ]);
  });
});
