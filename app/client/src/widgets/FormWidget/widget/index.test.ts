import FormWidget, { getObjectFormValidationFeedback } from ".";

const objectPropertyMetadata = {
  dataType: "INTEGER",
  derived: false,
  displayName: "Amount",
  id: "amount",
  readOnly: false,
  required: true,
} as const;

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

test("does not create an Object binding for Query-mode forms", () => {
  const form = new FormWidget({
    formMode: "QUERY",
    objectData: {
      id: "PO001",
      properties: { amount: 8 },
      typeId: "PurchaseOrder",
    },
    objectTypeId: "PurchaseOrder",
  } as never);

  expect(form.getObjectBinding()).toBeUndefined();
});

test("reports Object field issues, the first repairable path, and a form summary", () => {
  expect(
    getObjectFormValidationFeedback([
      {
        dataMode: "OBJECT",
        displayPropertyId: "amount",
        isDirty: true,
        objectBinding: {
          instance: {
            id: "PO001",
            properties: { amount: 5 },
            typeId: "PurchaseOrder",
          },
          objectTypeId: "PurchaseOrder",
        },
        objectData: {
          id: "PO001",
          properties: { amount: 5 },
          typeId: "PurchaseOrder",
        },
        objectPropertyMetadata,
        text: "not-a-number",
        type: "INPUT_WIDGET",
        widgetName: "AmountInput",
      } as never,
    ]),
  ).toMatchObject({
    errorPath: "AmountInput.amount",
    firstInvalidField: "AmountInput.amount",
    issues: [
      expect.objectContaining({
        code: "TYPE_MISMATCH",
        path: "AmountInput.amount",
        propertyId: "amount",
      }),
    ],
    summary: "1 form field validation error. Fix AmountInput.amount.",
  });
});

test.each([
  ["read-only", { readOnly: true }, "READ_ONLY"],
  ["derived", { derived: true }, "DERIVED"],
] as const)("rejects a user edit to a %s Object field", (_, flags, code) => {
  const feedback = getObjectFormValidationFeedback([
    {
      dataMode: "OBJECT",
      displayPropertyId: "amount",
      isDirty: true,
      objectData: {
        id: "PO001",
        properties: { amount: 5 },
        typeId: "PurchaseOrder",
      },
      objectPropertyMetadata: { ...objectPropertyMetadata, ...flags },
      text: "6",
      type: "INPUT_WIDGET",
      widgetName: "AmountInput",
    } as never,
  ]);

  expect(feedback).toMatchObject({
    errorPath: "AmountInput.amount",
    issues: [expect.objectContaining({ code })],
  });
});

test.each([
  ["read-only", { readOnly: true }],
  ["derived", { derived: true }],
] as const)(
  "keeps the unedited value of a %s Object field valid",
  (_, flags) => {
    const feedback = getObjectFormValidationFeedback([
      {
        dataMode: "OBJECT",
        displayPropertyId: "amount",
        isDirty: false,
        objectData: {
          id: "PO001",
          properties: { amount: 5 },
          typeId: "PurchaseOrder",
        },
        objectPropertyMetadata: { ...objectPropertyMetadata, ...flags },
        text: "5",
        type: "INPUT_WIDGET",
        widgetName: "AmountInput",
      } as never,
    ]);

    expect(feedback).toMatchObject({
      errorPath: undefined,
      issues: [],
      summary: undefined,
    });
  },
);
