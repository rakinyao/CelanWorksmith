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
