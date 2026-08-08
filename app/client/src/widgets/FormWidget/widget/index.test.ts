import FormWidget from ".";

test("exposes stable Object binding controls without changing native form defaults", () => {
  const controls = FormWidget.getPropertyPaneConfig()
    .flatMap((section) => section.children || [])
    .filter((control) =>
      ["objectTypeId", "objectData", "objectActionId"].includes(
        control.propertyName,
      ),
    );

  expect(FormWidget.getDefaults().formMode).toBe("OBJECT");
  expect(controls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        propertyName: "objectTypeId",
        controlType: "CELANWORKSMITH_OBJECT_TYPE",
      }),
      expect.objectContaining({
        propertyName: "objectData",
        validation: { type: "OBJECT" },
      }),
    ]),
  );
});

test("exposes an Object runtime binding for child controls", () => {
  expect(FormWidget.getMetaPropertiesMap()).toMatchObject({
    objectBinding: undefined,
  });
  expect(
    FormWidget.getAutocompleteDefinitions()({
      data: {},
      formMode: "OBJECT",
      name: "Form1",
    } as never),
  ).toMatchObject({
    objectBinding: "?",
  });
});

test("normalizes a flattened PurchaseOrder PO001 path for Object-mode children", () => {
  const form = new FormWidget({
    formMode: "OBJECT",
    objectData: {
      id: "PO001",
      supplierName: "Acme Corp",
      typeId: "PurchaseOrder",
    },
    objectTypeId: "PurchaseOrder",
  } as never);

  expect(form.getObjectBinding()).toEqual({
    instance: {
      id: "PO001",
      properties: { supplierName: "Acme Corp" },
      typeId: "PurchaseOrder",
    },
    objectTypeId: "PurchaseOrder",
  });
});
