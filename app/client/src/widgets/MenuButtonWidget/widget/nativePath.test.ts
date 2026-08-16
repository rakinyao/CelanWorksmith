import MenuButtonWidget from ".";

describe("MenuButtonWidget native path", () => {
  it("does not expose ontology action bindings", () => {
    const properties = MenuButtonWidget.getPropertyPaneContentConfig()
      .flatMap((section) => section.children)
      .map((property) => property.propertyName);

    expect(properties).not.toEqual(
      expect.arrayContaining(["actionId", "objectData", "parameters"]),
    );
    expect(MenuButtonWidget.getDefaults()).not.toHaveProperty("actionId");
  });
});
