import { inferObjectTypeId } from "./objectBindingSelectors";

const dataTree = {
  $objects: {
    ENTITY_TYPE: "CELANWORKSMITH_OBJECTS",
    PurchaseOrder: { _meta: { status: "ready" }, all: [] },
  },
  ObjectQuery1: {
    ENTITY_TYPE: "CELANWORKSMITH_OBJECT_QUERY",
    data: {
      items: [],
      limit: 100,
      offset: 0,
      total: 0,
      typeId: "PurchaseOrder",
    },
  },
  Table1: {
    ENTITY_TYPE: "WIDGET",
    selectedObject: {
      id: "po-1",
      properties: {},
      typeId: "PurchaseOrder",
    },
    type: "TABLE_WIDGET",
  },
};

describe("inferObjectTypeId", () => {
  it("infers a type from a recognized $objects expression", () => {
    expect(inferObjectTypeId("{{$objects.PurchaseOrder.all}}", dataTree)).toBe(
      "PurchaseOrder",
    );
  });

  it("infers a type from an Object Query result expression", () => {
    expect(inferObjectTypeId("{{ObjectQuery1.data}}", dataTree)).toBe(
      "PurchaseOrder",
    );
  });

  it("infers a type from a Widget meta object output", () => {
    expect(inferObjectTypeId("{{Table1.selectedObject}}", dataTree)).toBe(
      "PurchaseOrder",
    );
  });

  it("does not infer from an arbitrary expression", () => {
    expect(inferObjectTypeId("{{GetOrders.data}}", dataTree)).toBeUndefined();
  });

  it("does not infer from a pseudo $objects subpath", () => {
    expect(
      inferObjectTypeId("{{$objects.PurchaseOrder._meta}}", dataTree),
    ).toBeUndefined();
  });

  it("does not infer from a normal Query data value with a type ID", () => {
    expect(
      inferObjectTypeId("{{GetOrders.data}}", {
        GetOrders: {
          ENTITY_TYPE: "ACTION",
          data: { typeId: "PurchaseOrder" },
        },
      }),
    ).toBeUndefined();
  });

  it("does not infer selectedObject from a non-Widget entity", () => {
    expect(
      inferObjectTypeId("{{Action1.selectedObject}}", {
        Action1: {
          ENTITY_TYPE: "ACTION",
          selectedObject: {
            id: "po-1",
            properties: {},
            typeId: "PurchaseOrder",
          },
        },
      }),
    ).toBeUndefined();
  });
});
