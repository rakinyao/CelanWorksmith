import ObjectCollectionMode from "celanworksmith/widgets/objectBinding/ObjectCollectionMode";
import ListWidgetV2, { type ListWidgetProps } from ".";

test("ListV2 defaults to Object mode and keeps a legacy Query list native", () => {
  const queryProps = {
    listData: [{ id: "legacy" }],
    updateWidgetMetaProperty: jest.fn(),
    widgetId: "ListV21",
    widgetName: "ListV21",
  };

  expect(ListWidgetV2.getDefaults().dataMode).toBe("OBJECT");
  expect(
    new ListWidgetV2(queryProps as unknown as ListWidgetProps).getWidgetView()
      .type,
  ).not.toBe(ObjectCollectionMode);
  expect(
    new ListWidgetV2({
      ...queryProps,
      dataMode: "OBJECT",
    } as unknown as ListWidgetProps).getWidgetView().type,
  ).toBe(ObjectCollectionMode);
});
