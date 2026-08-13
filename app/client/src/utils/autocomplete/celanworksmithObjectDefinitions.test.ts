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
    expect(def).toHaveProperty("$objects.Supplier._meta.stableId", "string");
    expect(def).toHaveProperty("$objects.Supplier._meta.path", "string");
    expect(def).toHaveProperty("$objects.Supplier._meta.returnType", "string");
    expect(entityInfo.get("$objects")).toEqual({
      type: ENTITY_TYPE.CELANWORKSMITH_OBJECTS,
      subType: ENTITY_TYPE.CELANWORKSMITH_OBJECTS,
    });
  });

  it("uses Object Type metadata for empty collections and excludes unavailable types", () => {
    const { def } = dataTreeTypeDefCreator(
      {
        $objects: {
          ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_OBJECTS,
          PurchaseOrder: {
            all: [],
            _meta: { status: "empty", total: 0 },
            __metadata: {
              properties: [
                { id: "orderNumber", dataType: "STRING" },
                { id: "delayDays", dataType: "INTEGER" },
              ],
            },
          },
          LoadingOrder: {
            all: [],
            _meta: { status: "loading", total: 0 },
            __metadata: {
              properties: [{ id: "orderNumber", dataType: "STRING" }],
            },
          },
          FailedOrder: {
            all: [],
            _meta: { status: "error", total: 0 },
            __metadata: {
              properties: [{ id: "orderNumber", dataType: "STRING" }],
            },
          },
        },
      } as never,
      {},
      {},
    );

    expect(def).toHaveProperty(
      "$objects.PurchaseOrder.all",
      "[{orderNumber: string, delayDays: number}]",
    );
    expect(def).toHaveProperty("$objects.PurchaseOrder._meta.status", "string");
    expect(def).not.toHaveProperty("$objects.LoadingOrder");
    expect(def).not.toHaveProperty("$objects.FailedOrder");
  });

  it("defines variable names and values", () => {
    const { def, entityInfo } = dataTreeTypeDefCreator(
      {
        $variables: {
          ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_VARIABLES,
          delayedOrders: [{ id: "PO005", delayDays: 8 }],
          delayedOrderCount: 40,
          _meta: {},
        },
      },
      {},
      {},
    );

    expect(def).toHaveProperty("$variables.delayedOrders");
    expect(def).toHaveProperty("$variables.delayedOrderCount", "number");
    expect(entityInfo.get("$variables")).toEqual({
      type: ENTITY_TYPE.CELANWORKSMITH_VARIABLES,
      subType: ENTITY_TYPE.CELANWORKSMITH_VARIABLES,
    });
  });

  it("excludes unavailable variables while retaining ready empty collections", () => {
    const { def } = dataTreeTypeDefCreator(
      {
        $variables: {
          ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_VARIABLES,
          delayedOrders: [],
          loadingOrders: [],
          forbiddenOrders: [],
          _meta: {
            delayedOrders: { status: "empty" },
            loadingOrders: { status: "loading" },
            forbiddenOrders: { status: "permissionDenied" },
          },
        },
      },
      {},
      {},
    );

    expect(def).toHaveProperty("$variables.delayedOrders");
    expect(def).not.toHaveProperty("$variables.loadingOrders");
    expect(def).not.toHaveProperty("$variables.forbiddenOrders");
  });
});
