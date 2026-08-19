import { DatasourceConnectionMode } from "entities/Datasource";
import { QUERY_TYPE } from "WidgetQueryGenerators/types";
import Ontology from ".";

describe("Ontology WidgetQueryGenerator", () => {
  const formConfig = {
    tableName: "PurchaseOrder",
    datasourceId: "ontology-datasource",
    aliases: [],
    widgetId: "Table1",
    searchableColumn: "supplierId",
    columns: [],
    primaryColumn: "id",
    connectionMode: DatasourceConnectionMode.READ_ONLY,
  };

  it("generates a total-record query alongside a paged object query", () => {
    const actions = Ontology.build(
      {
        select: {
          limit: "Table1.pageSize",
          offset: "Table1.pageOffset",
          where: "Table1.searchText",
        },
        totalRecord: true,
      },
      formConfig,
      {},
    );

    expect(actions).toHaveLength(2);
    expect(actions[1]).toMatchObject({
      type: "total_record",
      name: "Total_record_PurchaseOrder",
      payload: {
        formData: {
          operation: { data: "OBJECT_QUERY" },
          queryMode: { data: "BUILDER" },
          objectTypeId: { data: "PurchaseOrder" },
          resultMode: { data: "TOTAL" },
          page: { data: { offset: 0, limit: 1 } },
          filter: {
            data: {
              conditions: [
                {
                  propertyId: "supplierId",
                  operator: "contains",
                  value: "{{Table1.searchText}}",
                },
              ],
            },
          },
        },
      },
    });

    expect(
      JSON.parse(actions[1].payload.formData.definition.data),
    ).toMatchObject({
      objectTypeId: "PurchaseOrder",
      resultMode: "TOTAL",
    });
  });

  it("exposes the native total-record binding shape", () => {
    expect(
      Ontology.getTotalRecordExpression("Total_record_PurchaseOrder.data"),
    ).toBe("Total_record_PurchaseOrder.data.n");
  });

  it("seeds the generated builder query with its canonical definition", () => {
    const actions = Ontology.build(
      {
        select: {
          limit: "Table1.pageSize",
          offset: "Table1.pageOffset",
          where: "Table1.searchText",
          orderBy: "Table1.sortColumn",
          sortOrder: "Table1.isAscending",
        },
      },
      {
        ...formConfig,
        columns: [
          { name: "id", type: "string", isSelected: true },
          { name: "supplierId", type: "string", isSelected: true },
        ],
      },
      {},
    );

    const selectAction = actions[0];
    const builderFormData = selectAction.payload.formData;
    const definition = JSON.parse(builderFormData.definition.data);

    expect(selectAction.type).toBe(QUERY_TYPE.SELECT);
    expect(definition.objectTypeId).toBe(builderFormData.objectTypeId.data);
    expect(definition.projection).toEqual(builderFormData.projection.data);
    expect(definition.filter).toEqual(builderFormData.filter.data);
    expect(definition.sort).toEqual(builderFormData.sort.data);
    expect(definition.page).toEqual(builderFormData.page.data);
    expect(selectAction.dynamicBindingPathList).toEqual(
      expect.arrayContaining([
        { key: "formData.page.data" },
        { key: "formData.filter.data" },
        { key: "formData.sort.data" },
      ]),
    );
  });

  it("builds the canonical definition after merging initial form values", () => {
    const [action] = Ontology.build(
      { select: { tableName: "PurchaseOrder" } },
      {
        ...formConfig,
        columns: [{ name: "id" }, { name: "delayDays" }],
      },
      {
        actionConfiguration: {
          formData: {
            projection: { data: ["supplierId"] },
          },
        },
      },
    );

    expect(action.payload.formData.definition).toEqual({
      data: JSON.stringify(
        {
          objectTypeId: "PurchaseOrder",
          projection: ["id", "delayDays"],
          page: { offset: 0, limit: 50 },
        },
        null,
        2,
      ),
    });
  });
});
