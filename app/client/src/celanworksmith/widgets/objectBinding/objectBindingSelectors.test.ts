import { inferObjectTypeId } from "./objectBindingSelectors";

const dataTree = {
  $objects: {
    PurchaseOrder: { _meta: { status: "ready" }, all: [] },
  },
  ObjectQuery1: {
    data: { items: [], typeId: "PurchaseOrder" },
  },
  Table1: {
    selectedObject: { id: "po-1", typeId: "PurchaseOrder" },
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
});
