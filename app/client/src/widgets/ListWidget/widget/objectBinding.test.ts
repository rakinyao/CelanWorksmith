import ObjectCollectionMode from "celanworksmith/widgets/objectBinding/ObjectCollectionMode";
import ListWidget, { type ListWidgetProps } from ".";

test("List defaults to Object mode and keeps a legacy Query list native", () => {
  const queryProps = {
    listData: [{ id: "legacy" }],
    updateWidgetMetaProperty: jest.fn(),
    widgetId: "List1",
    widgetName: "List1",
  };

  expect(ListWidget.getDefaults().dataMode).toBe("OBJECT");
  expect(
    new ListWidget(
      queryProps as unknown as ListWidgetProps<never>,
    ).getWidgetView().type,
  ).not.toBe(ObjectCollectionMode);
  expect(
    new ListWidget({
      ...queryProps,
      dataMode: "OBJECT",
    } as unknown as ListWidgetProps<never>).getWidgetView().type,
  ).toBe(ObjectCollectionMode);
});
