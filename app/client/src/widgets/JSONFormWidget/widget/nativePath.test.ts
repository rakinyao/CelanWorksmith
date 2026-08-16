import JSONFormWidget from ".";

describe("JSONFormWidget native path", () => {
  it("defaults to the native query form path", () => {
    expect(JSONFormWidget.getDefaults()).not.toHaveProperty("formMode");
    expect(JSONFormWidget.getDefaults()).not.toHaveProperty("objectTypeId");
    expect(JSONFormWidget.getDefaults()).not.toHaveProperty("objectData");
    expect(JSONFormWidget.getDefaults()).not.toHaveProperty("objectActionId");
  });

  it("does not expose the retired object-form property pane", () => {
    const propertyNames = JSONFormWidget.getPropertyPaneContentConfig()
      .flatMap((section) => section.children ?? [])
      .map((property) => property.propertyName);

    expect(propertyNames).not.toEqual(
      expect.arrayContaining([
        "formMode",
        "objectTypeId",
        "objectData",
        "objectActionId",
      ]),
    );
  });
});
