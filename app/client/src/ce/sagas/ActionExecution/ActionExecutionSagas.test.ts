import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import type { ActionDescription } from "ee/workers/Evaluation/fns";
import { CELANWORKSMITH_FUNCTION_TRIGGER_PREFIX } from "ee/entities/DataTree/types";
import { runSaga } from "redux-saga";
import { call } from "redux-saga/effects";
import executePluginActionTriggerSaga from "sagas/ActionExecution/PluginActionSaga";
import { executeActionTriggers } from "./ActionExecutionSagas";

const triggerMeta = { onPageLoad: false };

describe("executeActionTriggers", () => {
  it("resolves a CelanWorksmith worker trigger as Promise<string>", async () => {
    const trigger = {
      type: "RUN_PLUGIN_ACTION",
      payload: {
        actionId: `${CELANWORKSMITH_FUNCTION_TRIGGER_PREFIX}CalculateDelayDays`,
        params: { parameters: { poId: "PO001" } },
      },
    } as ActionDescription;
    const task = runSaga(
      { dispatch: jest.fn() },
      executeActionTriggers,
      trigger,
      EventType.ON_CLICK,
      triggerMeta,
    );

    const result = task.toPromise();

    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual(
      expect.stringMatching(/^celanworksmith-/),
    );
  });

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
