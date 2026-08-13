import MenuButtonWidget from ".";

test("registers meta support for ontology action validation feedback", () => {
  expect(MenuButtonWidget.getConfig().needsMeta).toBe(true);
  expect(MenuButtonWidget.getMetaPropertiesMap()).toMatchObject({
    ontologyActionError: undefined,
    ontologyActionErrorPath: undefined,
    ontologyActionValidationSummary: undefined,
  });
});
