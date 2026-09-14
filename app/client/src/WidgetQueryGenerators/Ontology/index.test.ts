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

  it("generates a client-paginated object query without Table-size bindings", () => {
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

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      type: "select",
      paginationBindingMode: "CLIENT_SIDE",
      payload: {
        formData: {
          operation: { data: "OBJECT_QUERY" },
          queryMode: { data: "BUILDER" },
          objectTypeId: { data: "PurchaseOrder" },
          page: { data: { mode: "LIMITED", offset: 0, limit: 100 } },
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

    expect(actions[0].dynamicBindingPathList).not.toContainEqual({
      key: "formData.page.data",
    });
  });

  it("seeds the generated query with stable ordering and ontology column labels", () => {
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
          {
            name: "id",
            type: "string",
            isSelected: true,
            displayName: "订单编号",
          },
          {
            name: "supplierId",
            type: "string",
            isSelected: true,
            displayName: "供应商",
          },
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
    expect(definition.sort).toEqual([{ propertyId: "id", direction: "ASC" }]);
    expect(definition.page).toEqual(builderFormData.page.data);
    expect(selectAction.columnNameMap).toEqual({
      id: "订单编号",
      supplierId: "供应商",
    });
    expect(selectAction.dynamicBindingPathList).toContainEqual({
      key: "formData.filter.data",
    });
    expect(selectAction.dynamicBindingPathList).not.toContainEqual({
      key: "formData.sort.data",
    });
    expect(selectAction.dynamicBindingPathList).not.toContainEqual({
      key: "formData.page.data",
    });
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
          sort: [{ propertyId: "id", direction: "ASC" }],
          page: { mode: "LIMITED", offset: 0, limit: 100 },
        },
        null,
        2,
      ),
    });
  });
});
