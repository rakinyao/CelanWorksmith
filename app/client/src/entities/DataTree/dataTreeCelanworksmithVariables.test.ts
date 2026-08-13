import { getObjectQueryKey } from "reducers/celanworksmithObjectQueryReducer";
import { buildCelanworksmithVariablesDataTree } from "./dataTreeCelanworksmithVariables";
import type { VariableDefinition } from "celanworksmith/variables/types";

const definitions: VariableDefinition[] = [
  {
    id: "orders",
    name: "orders",
    kind: "OBJECT_SET",
    version: 1,
    updatedAt: 1,
    dependencies: [],
    config: { typeId: "PurchaseOrder", limit: 100 },
  },
  {
    id: "delayCount",
    name: "delayCount",
    kind: "AGGREGATION",
    version: 1,
    updatedAt: 1,
    dependencies: ["orders"],
    config: { sourceVariableId: "orders", operation: "count" },
  },
  {
    id: "delayDays",
    name: "delayDays",
    kind: "OBJECT_PROPERTY",
    version: 1,
    updatedAt: 1,
    dependencies: [],
    config: {
      objectTypeId: "PurchaseOrder",
      objectId: "PO001",
      propertyId: "delayDays",
    },
  },
];

const objectSetRequest = {
  widgetId: "$variable/orders",
  typeId: "PurchaseOrder",
  query: { offset: 0, limit: 100 },
};

test("builds direct variable values and aggregation results", () => {
  const tree = buildCelanworksmithVariablesDataTree({
    definitions,
    objects: {
      status: "ready",
      types: {
        PurchaseOrder: {
          items: [
            {
              id: "PO001",
              typeId: "PurchaseOrder",
              properties: { delayDays: 3 },
            },
          ],
          total: 1,
          offset: 0,
          limit: 100,
          status: "ready",
        },
      },
    },
    queries: {
      entries: {
        [getObjectQueryKey(objectSetRequest)]: {
          request: objectSetRequest,
          status: "ready",
          result: {
            typeId: "PurchaseOrder",
            items: [
              {
                id: "PO001",
                typeId: "PurchaseOrder",
                properties: { delayDays: 3 },
              },
            ],
            offset: 0,
            limit: 100,
            total: 1,
          },
        },
      },
    },
    execution: {
      functions: {},
      actions: {},
      requests: {},
      functionCache: {},
      inputs: {},
    },
  });

  expect(tree.orders).toEqual([
    { id: "PO001", typeId: "PurchaseOrder", delayDays: 3 },
  ]);
  expect(tree.delayCount).toBe(1);
  expect(tree.delayDays).toBe(3);
  expect(tree._meta).toMatchObject({
    orders: {
      path: "$variables.orders",
      returnType: "ObjectSet<PurchaseOrder>",
      stableId: "orders",
      status: "ready",
    },
    delayCount: { status: "ready" },
  });
});

test("reports unavailable query data without throwing", () => {
  const tree = buildCelanworksmithVariablesDataTree({
    definitions: [definitions[0]],
    objects: { status: "ready", types: {} },
    queries: { entries: {} },
    execution: {
      functions: {},
      actions: {},
      requests: {},
      functionCache: {},
      inputs: {},
    },
  });

  expect(tree.orders).toBeUndefined();
  expect(tree._meta.orders).toMatchObject({ status: "idle" });
});
