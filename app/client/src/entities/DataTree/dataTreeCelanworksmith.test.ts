import {
  ENTITY_TYPE,
  type CelanworksmithObjectTypeEntity,
} from "ee/entities/DataTree/types";
import { generateCelanworksmithObjectsDataTree } from "./dataTreeCelanworksmith";

describe("generateCelanworksmithObjectsDataTree", () => {
  it("exposes object sets, instances and direct properties", () => {
    const tree = generateCelanworksmithObjectsDataTree({
      status: "ready",
      types: {
        Supplier: {
          metadata: undefined,
          items: [
            {
              id: "S001",
              typeId: "Supplier",
              properties: { name: "Supplier 1", riskLevel: "HIGH" },
            },
          ],
          total: 1,
          offset: 0,
          limit: 100,
          status: "ready",
          updatedAt: 10,
        },
      },
    });

    const supplier = tree.Supplier as CelanworksmithObjectTypeEntity;

    expect(tree.ENTITY_TYPE).toBe(ENTITY_TYPE.CELANWORKSMITH_OBJECTS);
    expect(supplier.all).toEqual([
      { name: "Supplier 1", riskLevel: "HIGH", id: "S001", typeId: "Supplier" },
    ]);
    expect(supplier.S001).toEqual(supplier.all[0]);
    expect(supplier._meta).toMatchObject({ status: "ready", total: 1 });
  });

  it("preserves loading, empty and error states in metadata", () => {
    const tree = generateCelanworksmithObjectsDataTree({
      status: "error",
      error: { code: "FORBIDDEN", message: "Access denied" },
      types: {
        Supplier: {
          items: [],
          total: 0,
          offset: 0,
          limit: 100,
          status: "error",
          error: { code: "FORBIDDEN", message: "Access denied" },
        },
      },
    });

    const supplier = tree.Supplier as CelanworksmithObjectTypeEntity;

    expect(supplier.all).toEqual([]);
    expect(supplier._meta).toMatchObject({
      status: "error",
      error: { code: "FORBIDDEN" },
    });
  });
});
