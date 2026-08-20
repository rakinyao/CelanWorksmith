import {
  getActionByBaseId,
  getEditorConfig,
} from "ee/selectors/entitiesSelector";
import { call, select } from "redux-saga/effects";
import { checkAndGetPluginFormConfigsSaga } from "sagas/PluginSagas";
import { changeQuerySaga } from "sagas/QueryPaneSagas";

describe("changeQuerySaga", () => {
  it("loads the query plugin form before selecting its editor config", () => {
    const saga = changeQuerySaga({
      type: "QUERY_PANE_CHANGE",
      payload: {
        applicationId: "app-id",
        basePageId: "page-id",
        baseQueryId: "query-id",
      },
    } as never);

    expect(saga.next().value).toEqual(select(getActionByBaseId, "query-id"));
    expect(
      saga.next({ id: "query-id", pluginId: "ontology-plugin-id" }).value,
    ).toEqual(call(checkAndGetPluginFormConfigsSaga, "ontology-plugin-id"));
    expect(saga.next().value).toEqual(
      select(getEditorConfig, "ontology-plugin-id"),
    );
  });
});
