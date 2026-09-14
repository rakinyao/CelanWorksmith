import { changeDatasource } from "actions/datasourceActions";
import { getDatasource } from "ee/selectors/entitiesSelector";
import type { Datasource } from "entities/Datasource";
import { call, put, select } from "redux-saga/effects";
import { checkAndGetPluginFormConfigsSaga } from "sagas/PluginSagas";
import { switchDatasourceSaga } from "./DatasourcesSagas";

describe("switchDatasourceSaga", () => {
  it("loads a datasource plugin form before selecting the datasource", () => {
    const datasource = {
      id: "datasource-1",
      pluginId: "ontology-plugin-1",
    } as Datasource;
    const action = {
      type: "SWITCH_DATASOURCE",
      payload: {
        datasourceId: datasource.id,
        shouldNotRedirect: false,
      },
    } as never;
    const saga = switchDatasourceSaga(action);

    expect(saga.next().value).toEqual(select(getDatasource, datasource.id));
    expect(saga.next(datasource).value).toEqual(
      call(checkAndGetPluginFormConfigsSaga, datasource.pluginId),
    );
    expect(saga.next().value).toEqual(
      put(changeDatasource({ datasource, shouldNotRedirect: false })),
    );
  });
});
