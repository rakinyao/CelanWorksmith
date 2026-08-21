import { PluginType } from "entities/Plugin";
import type { ActionData } from "ee/reducers/entityReducers/actionsReducer";
import { generateDataTreeAction } from "./dataTreeAction";

describe("generateDataTreeAction", () => {
  it("keeps pagination but excludes the inactive builder definition mirror from run dependencies", () => {
    const action = {
      isLoading: false,
      config: {
        id: "query-id",
        name: "Query_PurchaseOrder",
        pluginId: "ontology-plugin",
        pluginType: PluginType.DB,
        runBehaviour: "MANUAL",
        actionConfiguration: {
          formData: {
            queryMode: { data: "BUILDER" },
          },
        },
        dynamicBindingPathList: [
          { key: "formData.page.data" },
          { key: "formData.definition.data" },
        ],
      },
    } as ActionData;

    const { configEntity } = generateDataTreeAction(action, []);

    expect(configEntity.dependencyMap.run).toEqual([
      "config.formData.page.data",
    ]);
  });
});
