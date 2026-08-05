import {
  createCelanworksmithObjectDependency,
  parseCelanworksmithObjectBinding,
} from "./celanworksmithObjectBindings";

describe("parseCelanworksmithObjectBinding", () => {
  it("parses object sets, instances and properties", () => {
    expect(parseCelanworksmithObjectBinding("$objects.Supplier.all")).toEqual({
      kind: "objectSet",
      objectTypeId: "Supplier",
      propertyPath: "",
      path: "$objects.Supplier.all",
    });
    expect(
      parseCelanworksmithObjectBinding("$objects.Supplier.S001.name"),
    ).toEqual({
      kind: "property",
      objectTypeId: "Supplier",
      instanceId: "S001",
      propertyPath: "name",
      path: "$objects.Supplier.S001.name",
    });
  });

  it("supports quoted keys and rejects malformed paths", () => {
    expect(
      parseCelanworksmithObjectBinding('$objects["Supplier"]["S001"]'),
    ).toMatchObject({ kind: "instance", objectTypeId: "Supplier" });
    expect(parseCelanworksmithObjectBinding("objects.Supplier.all")).toBeNull();
    expect(parseCelanworksmithObjectBinding("$objects.Supplier[]")).toBeNull();
    expect(
      parseCelanworksmithObjectBinding("$objects.Supplier.all.foo"),
    ).toEqual(
      expect.objectContaining({ kind: "objectSet", propertyPath: "foo" }),
    );
  });

  it("creates dependency metadata without changing the binding path", () => {
    const binding = parseCelanworksmithObjectBinding(
      "$objects.Supplier.S001.name",
    );

    expect(binding).not.toBeNull();
    expect(
      createCelanworksmithObjectDependency(
        binding!,
        "ready",
        {
          offset: 0,
          limit: 100,
        },
        10,
      ),
    ).toMatchObject({
      objectTypeId: "Supplier",
      instanceId: "S001",
      propertyPath: "name",
      query: { offset: 0, limit: 100 },
      status: "ready",
      updatedAt: 10,
    });
  });
});
