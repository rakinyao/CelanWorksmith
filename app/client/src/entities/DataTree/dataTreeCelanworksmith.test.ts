import {
  ENTITY_TYPE,
  type CelanworksmithObjectTypeEntity,
} from "ee/entities/DataTree/types";
import { dataTreeTypeDefCreator } from "utils/autocomplete/dataTreeTypeDefCreator";
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
    expect(supplier._meta).toMatchObject({
      path: "$objects.Supplier",
      returnType: "ObjectSet<Supplier>",
      stableId: "Supplier",
      status: "ready",
      total: 1,
    });
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

  it("uses hidden Object Type metadata to define empty collections", () => {
    const metadata = {
      id: "PurchaseOrder",
      displayName: "Purchase order",
      properties: [
        {
          id: "orderNumber",
          displayName: "Order number",
          dataType: "STRING",
          required: true,
          readOnly: false,
          derived: false,
        },
        {
          id: "delayDays",
          displayName: "Delay days",
          dataType: "INTEGER",
          required: false,
          readOnly: false,
          derived: false,
        },
      ],
    };
    const tree = generateCelanworksmithObjectsDataTree({
      status: "empty",
      types: {
        PurchaseOrder: {
          metadata,
          items: [],
          total: 0,
          offset: 0,
          limit: 100,
          status: "empty",
        },
      },
    });
    const purchaseOrder = tree.PurchaseOrder as CelanworksmithObjectTypeEntity;
    const { def } = dataTreeTypeDefCreator({ $objects: tree } as never, {}, {});

    expect(Object.keys(purchaseOrder)).not.toContain("__metadata");
    expect(
      Object.getOwnPropertyDescriptor(purchaseOrder, "__metadata"),
    ).toMatchObject({
      configurable: false,
      enumerable: false,
      value: metadata,
      writable: false,
    });
    expect(def).toHaveProperty(
      "$objects.PurchaseOrder.all",
      "[{orderNumber: string, delayDays: number}]",
    );
  });

  it("keeps runtime values while schema defines null-valued properties", () => {
    const tree = generateCelanworksmithObjectsDataTree({
      status: "ready",
      types: {
        Supplier: {
          metadata: {
            id: "Supplier",
            displayName: "Supplier",
            properties: [
              {
                id: "name",
                displayName: "Name",
                dataType: "STRING",
                required: true,
                readOnly: false,
                derived: false,
              },
              {
                id: "riskLevel",
                displayName: "Risk level",
                dataType: "ENUM",
                required: false,
                readOnly: false,
                derived: false,
              },
            ],
          },
          items: [
            {
              id: "S001",
              typeId: "Supplier",
              properties: { name: null, riskLevel: null },
            },
          ],
          total: 1,
          offset: 0,
          limit: 100,
          status: "ready",
        },
      },
    });
    const supplier = tree.Supplier as CelanworksmithObjectTypeEntity;
    const { def } = dataTreeTypeDefCreator({ $objects: tree } as never, {}, {});

    expect(supplier.all).toEqual([
      { id: "S001", typeId: "Supplier", name: null, riskLevel: null },
    ]);
    expect(supplier.S001).toEqual(supplier.all[0]);
    expect(def).toHaveProperty("$objects.Supplier.S001.name", "string");
    expect(def).toHaveProperty("$objects.Supplier.S001.riskLevel", "string");
  });

  it("does not advertise loading or failed Object Types", () => {
    const metadata = {
      id: "Order",
      displayName: "Order",
      properties: [],
    };
    const tree = generateCelanworksmithObjectsDataTree({
      status: "loading",
      types: {
        LoadingOrder: {
          metadata: { ...metadata, id: "LoadingOrder" },
          items: [],
          total: 0,
          offset: 0,
          limit: 100,
          status: "loading",
        },
        FailedOrder: {
          metadata: { ...metadata, id: "FailedOrder" },
          items: [],
          total: 0,
          offset: 0,
          limit: 100,
          status: "error",
          error: { code: "FORBIDDEN", message: "Access denied" },
        },
      },
    });
    const { def } = dataTreeTypeDefCreator({ $objects: tree } as never, {}, {});

    expect(def).not.toHaveProperty("$objects.LoadingOrder");
    expect(def).not.toHaveProperty("$objects.FailedOrder");
  });
});
