import { ENTITY_TYPE } from "ee/entities/DataTree/types";
import { dataTreeTypeDefCreator } from "./dataTreeTypeDefCreator";

describe("CelanWorksmith autocomplete definitions", () => {
  it("defines object types, instances and properties", () => {
    const { def, entityInfo } = dataTreeTypeDefCreator(
      {
        $objects: {
          ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_OBJECTS,
          Supplier: {
            all: [{ name: "Supplier 1", riskLevel: "HIGH" }],
            S001: { name: "Supplier 1", riskLevel: "HIGH" },
            _meta: { status: "ready", total: 1 },
          },
        },
      },
      {},
      {},
    );

    expect(def).toHaveProperty("$objects.Supplier");
    expect(def).toHaveProperty("$objects.Supplier.all");
    expect(def).toHaveProperty("$objects.Supplier.S001");
    expect(def).toHaveProperty("$objects.Supplier.S001.name", "string");
    expect(entityInfo.get("$objects")).toEqual({
      type: ENTITY_TYPE.CELANWORKSMITH_OBJECTS,
      subType: ENTITY_TYPE.CELANWORKSMITH_OBJECTS,
    });
  });
});
