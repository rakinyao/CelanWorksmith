import WidgetQueryGeneratorRegistry from "./WidgetQueryGeneratorRegistry";
import "WidgetQueryGenerators";

const ONTOLOGY_PLUGIN_PACKAGE = "celanworksmith-ontology-plugin";

describe("WidgetQueryGeneratorRegistry", () => {
  const somepluginId = "somePluginId";

  it("should be able to register a QueryGenerator", () => {
    const someQueryGenerator = {};

    WidgetQueryGeneratorRegistry.register(somepluginId, someQueryGenerator);
    expect(WidgetQueryGeneratorRegistry.get(somepluginId)).toBeTruthy();
  });

  it("should return a falsey value when searching for an non existing generator", () => {
    const nonExistingQueryGeneratopr = "someId";

    expect(
      WidgetQueryGeneratorRegistry.get(nonExistingQueryGeneratopr),
    ).toBeFalsy();
  });

  it("should return the same adaptor reference when querying the same pluginId", () => {
    const adaptor = WidgetQueryGeneratorRegistry.get(somepluginId);

    expect(adaptor).toBe(WidgetQueryGeneratorRegistry.get(somepluginId));
  });
  it("discovers the ontology generator through the shared registry", () => {
    expect(WidgetQueryGeneratorRegistry.has(ONTOLOGY_PLUGIN_PACKAGE)).toBe(true);
  });

  it("builds a structured PurchaseOrder query through the registry", () => {
    const generator = WidgetQueryGeneratorRegistry.get(ONTOLOGY_PLUGIN_PACKAGE);

    expect(generator).toBeDefined();
    if (!generator) return;

    const [query] = generator.build(
      {
        select: {
          limit: "Table1.pageSize",
          offset: "Table1.pageOffset",
          where: "Table1.searchText",
        },
        totalRecord: true,
      },
      {
        tableName: "PurchaseOrder",
        datasourceId: "ontology-datasource",
        aliases: [],
        widgetId: "table1",
        searchableColumn: "status",
        columns: [{ name: "id", type: "string", isSelected: true }],
        primaryColumn: "id",
        connectionMode: "READ_ONLY",
      },
      { actionConfiguration: { formData: {} } },
    );

    expect(query).toMatchObject({
      type: "select",
      payload: {
        formData: {
          operation: { data: "OBJECT_QUERY" },
          objectTypeId: { data: "PurchaseOrder" },
          page: {
            data: {
              offset: "{{Table1.pageOffset}}",
              limit: "{{Table1.pageSize}}",
            },
          },
        },
      },
    });
    expect(query.payload.formData).not.toHaveProperty("$objects");
    expect(query.payload.formData).not.toHaveProperty("objectProperties");
  });

  it("should not find the registered plugin after clearing the registry", () => {
    WidgetQueryGeneratorRegistry.clear();
    expect(WidgetQueryGeneratorRegistry.get(somepluginId)).toBeFalsy();
  });

  afterAll(() => {
    WidgetQueryGeneratorRegistry.clear();
  });
});
