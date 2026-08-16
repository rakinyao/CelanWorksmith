import ButtonWidget from ".";

describe("ButtonWidget native path", () => {
  it("keeps the standard click property as the only action entry point", () => {
    const properties = ButtonWidget.getPropertyPaneContentConfig()
      .flatMap((section) => section.children)
      .map((property) => property.propertyName);

    expect(properties).toContain("onClick");
    expect(properties).not.toEqual(
      expect.arrayContaining(["actionId", "objectData", "parameters"]),
    );
    expect(ButtonWidget.getDefaults()).not.toHaveProperty("actionId");
  });
});
