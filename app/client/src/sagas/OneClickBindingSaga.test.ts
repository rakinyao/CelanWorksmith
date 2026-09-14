import {
  getOntologyInjectedPrimaryKeyVisibilityUpdates,
  getPaginationBindingMode,
} from "./OneClickBindingSaga";

describe("getPaginationBindingMode", () => {
  it("forwards the select action's explicit client pagination mode", () => {
    expect(
      getPaginationBindingMode([
        { type: "select", paginationBindingMode: "CLIENT_SIDE" },
      ]),
    ).toBe("CLIENT_SIDE");
  });

  it("leaves existing generator bindings unchanged when no mode is supplied", () => {
    expect(getPaginationBindingMode([{ type: "select" }])).toBeUndefined();
  });

  it("hides an injected ontology primary key when it was not a selected Table column", () => {
    expect(
      getOntologyInjectedPrimaryKeyVisibilityUpdates(
        "celanworksmith-ontology-plugin",
        { primaryColumns: {} },
        {
          primaryColumn: "customer_id",
          columns: [
            { name: "customer_name", type: "string", isSelected: true },
          ],
        },
      ),
    ).toEqual({ "primaryColumns.customer_id.isVisible": false });
  });

  it("does not change visibility when the primary key was explicitly selected", () => {
    expect(
      getOntologyInjectedPrimaryKeyVisibilityUpdates(
        "celanworksmith-ontology-plugin",
        { primaryColumns: {} },
        {
          primaryColumn: "customer_id",
          columns: [{ name: "customer_id", type: "string", isSelected: true }],
        },
      ),
    ).toEqual({});
  });

  it("hides an ontology primary key when it is present but not selected", () => {
    expect(
      getOntologyInjectedPrimaryKeyVisibilityUpdates(
        "celanworksmith-ontology-plugin",
        { primaryColumns: {} },
        {
          primaryColumn: "customer_id",
          columns: [
            { name: "customer_id", type: "string", isSelected: false },
            { name: "customer_name", type: "string", isSelected: true },
          ],
        },
      ),
    ).toEqual({ "primaryColumns.customer_id.isVisible": false });
  });
});
