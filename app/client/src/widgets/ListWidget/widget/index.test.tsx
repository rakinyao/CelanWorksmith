import type { AutocompletionDefinitions } from "WidgetProvider/types";
import ListWidget from ".";
import type { WidgetProps } from "widgets/BaseWidget";

describe("Autocomplete suggestions test", () => {
  it("lists the right autocomplete suggestions", () => {
    const listWidgetProps: WidgetProps = {
      widgetId: "yolo",
      widgetName: "List1",
      parentId: "123",
      renderMode: "CANVAS",
      text: "yo",
      type: "INPUT_WIDGET_V2",
      parentColumnSpace: 1,
      parentRowSpace: 2,
      leftColumn: 2,
      rightColumn: 3,
      topRow: 1,
      bottomRow: 2,
      isLoading: false,
      version: 1,
      selectedItem: {
        id: 1,
        name: "Some random name",
      },
    };

    const output = {
      "!doc":
        "Containers are used to group widgets together to form logical higher order widgets. Containers let you organize your page better and move all the widgets inside them together.",
      "!url": "https://docs.appsmith.com/widget-reference/list",
      backgroundColor: {
        "!type": "string",
        "!url": "https://docs.appsmith.com/widget-reference/how-to-use-widgets",
      },
      isVisible: {
        "!type": "bool",
        "!doc": "Boolean value indicating if the widget is in visible state",
      },
      selectedItem: { id: "number", name: "string" },
      gridGap: "number",
      items: "?",
      listData: "?",
      pageNo: "?",
      pageSize: "?",
    };

    const autocompleteDefinitions: AutocompletionDefinitions =
      ListWidget.getAutocompleteDefinitions();

    if (typeof autocompleteDefinitions === "function") {
      expect(autocompleteDefinitions(listWidgetProps)).toStrictEqual(output);
    }
  });
});

describe("native Query result path", () => {
  it("keeps array list data as the native pagination input", () => {
    const listWidget = new ListWidget({
      listData: [{ id: "PO001" }, { id: "PO002" }],
      pageSize: 1,
      serverSidePaginationEnabled: false,
    } as never);

    expect(listWidget.props.listData).toEqual([
      { id: "PO001" },
      { id: "PO002" },
    ]);
    expect(listWidget.shouldPaginate()).toEqual({
      shouldPaginate: true,
      perPage: 1,
    });
  });
});
