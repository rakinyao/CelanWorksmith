import {
  buildWidgetTargetBinding,
  buildWidgetTargetBindings,
} from "./ontologyTargetWidgetAdapters";

describe("buildWidgetTargetBinding", () => {
  it("builds a single Table target", () => {
    expect(
      buildWidgetTargetBinding(
        { widgetId: "table-id", type: "TABLE_WIDGET", widgetName: "Table1" },
        "contract_id",
        1,
      ),
    ).toEqual({
      widgetId: "table-id",
      cardinality: "ONE",
      expression: '{{Table1.selectedRow["contract_id"]}}',
    });
  });

  it.each(["TABLE_WIDGET_V2", "WDS_TABLE_WIDGET"])(
    "builds a single target for current Table type %s",
    (type) => {
      expect(
        buildWidgetTargetBinding(
          { widgetId: "table-id", type, widgetName: "Table1" },
          "contract_id",
          1,
        ),
      ).toEqual({
        widgetId: "table-id",
        cardinality: "ONE",
        expression: '{{Table1.selectedRow["contract_id"]}}',
      });
    },
  );

  it("builds a many-target Table binding", () => {
    expect(
      buildWidgetTargetBinding(
        { widgetId: "table-id", type: "TABLE_WIDGET", widgetName: "Table1" },
        "contract_id",
        2,
      ),
    ).toEqual({
      widgetId: "table-id",
      cardinality: "MANY",
      expression: '{{Table1.selectedRows.map((row) => row["contract_id"])}}',
    });
  });

  it("offers both single and many Table bindings when the bound allows many", () => {
    expect(
      buildWidgetTargetBindings(
        { widgetId: "table-id", type: "TABLE_WIDGET", widgetName: "Table1" },
        "contract_id",
        2,
      ),
    ).toEqual([
      {
        widgetId: "table-id",
        cardinality: "ONE",
        expression: '{{Table1.selectedRow["contract_id"]}}',
      },
      {
        widgetId: "table-id",
        cardinality: "MANY",
        expression: '{{Table1.selectedRows.map((row) => row["contract_id"])}}',
      },
    ]);
  });

  it("uses bracket notation for arbitrary canonical keys", () => {
    expect(
      buildWidgetTargetBindings(
        { widgetId: "table-id", type: "TABLE_WIDGET", widgetName: "Table1" },
        "contract-id",
        2,
      ).map(({ expression }) => expression),
    ).toEqual([
      '{{Table1.selectedRow["contract-id"]}}',
      '{{Table1.selectedRows.map((row) => row["contract-id"])}}',
    ]);
  });

  it("builds a single Select target", () => {
    expect(
      buildWidgetTargetBinding(
        {
          widgetId: "select-id",
          type: "SELECT_WIDGET",
          widgetName: "CustomerSelect",
        },
        "customer_id",
        1,
      ),
    ).toEqual({
      widgetId: "select-id",
      cardinality: "ONE",
      expression: "{{CustomerSelect.selectedOptionValue}}",
    });
  });

  it("keeps Select available for a many-target bound as a one-target source", () => {
    expect(
      buildWidgetTargetBinding(
        {
          widgetId: "select-id",
          type: "SELECT_WIDGET",
          widgetName: "CustomerSelect",
        },
        "customer_id",
        2,
      ),
    ).toEqual({
      widgetId: "select-id",
      cardinality: "ONE",
      expression: "{{CustomerSelect.selectedOptionValue}}",
    });
  });

  it("builds a many-target MultiSelect binding", () => {
    expect(
      buildWidgetTargetBinding(
        {
          widgetId: "multi-id",
          type: "MULTI_SELECT_WIDGET",
          widgetName: "Customers",
        },
        "customer_id",
        2,
      ),
    ).toEqual({
      widgetId: "multi-id",
      cardinality: "MANY",
      expression: "{{Customers.selectedOptionValues}}",
    });
  });

  it("does not build a Table binding without a canonical key", () => {
    expect(
      buildWidgetTargetBinding(
        { widgetId: "table-id", type: "TABLE_WIDGET", widgetName: "Table1" },
        undefined,
        1,
      ),
    ).toBeUndefined();
  });

  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])(
    "does not build any adapter binding for invalid maxItems=%s",
    (maxItems) => {
      expect(
        buildWidgetTargetBinding(
          { widgetId: "table-id", type: "TABLE_WIDGET", widgetName: "Table1" },
          "contract_id",
          maxItems,
        ),
      ).toBeUndefined();
      expect(
        buildWidgetTargetBinding(
          {
            widgetId: "select-id",
            type: "SELECT_WIDGET",
            widgetName: "CustomerSelect",
          },
          "customer_id",
          maxItems,
        ),
      ).toBeUndefined();
      expect(
        buildWidgetTargetBinding(
          {
            widgetId: "multi-id",
            type: "MULTI_SELECT_WIDGET",
            widgetName: "Customers",
          },
          "customer_id",
          maxItems,
        ),
      ).toBeUndefined();
    },
  );
});
