import TableWidgetV2 from "..";
import type { TableWidgetProps } from "../../constants";

describe("TableWidgetV2 native Query bindings", () => {
  const widget = {
    primaryColumns: {},
    widgetName: "Table1",
  } as TableWidgetProps;

  it("maps native Query pagination and search fields", () => {
    const config = TableWidgetV2.getMethods().getQueryGenerationConfig(widget);

    expect(config.select.limit).toBe("Table1.pageSize");
    expect(config.select.offset).toBe("Table1.pageOffset");
    expect(config.select.where).toBe("Table1.searchText");
  });

  it("enables server pagination and binds native search and total results", () => {
    const updates =
      TableWidgetV2.getMethods().getPropertyUpdatesForQueryBinding(
        {
          select: {
            data: "{{ GetOrders.data }}",
            run: "{{ GetOrders.run() }}",
          },
          total_record: {
            data: "{{ GetOrdersTotal.data }}",
            run: "{{ GetOrdersTotal.run() }}",
          },
        },
        widget,
        {
          primaryColumn: "id",
          searchableColumn: "name",
        },
      );

    expect(updates.modify).toMatchObject({
      enableClientSideSearch: false,
      onSearchTextChanged: "{{ GetOrders.run() }}",
      serverSidePaginationEnabled: true,
      totalRecordsCount: "{{ GetOrdersTotal.data }}",
    });
  });
});
