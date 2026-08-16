import SelectWidget from ".";

test("Select consumes native option objects without an ontology adapter", () => {
  const widget = new SelectWidget({
    options: [
      { label: "Purchase Order", value: "PO001" },
      { label: "Supplier", value: "S001" },
    ],
  } as never);
  const view = widget.getWidgetView();

  expect(view.props.options).toEqual([
    { label: "Purchase Order", value: "PO001" },
    { label: "Supplier", value: "S001" },
  ]);
});
