import type { CelanworksmithActionResult } from "api/CelanworksmithAPI";
import { getCelanworksmithActionRefreshPlan } from "./actionRefresh";

describe("getCelanworksmithActionRefreshPlan", () => {
  it("selects only cached queries, variable dependencies, links, and widget metadata affected by an Action", () => {
    const result: CelanworksmithActionResult = {
      success: true,
      message: "Action executed",
      executionId: "execution-123",
      changedObjects: [
        {
          id: "PR001",
          typeId: "ProductionOrder",
          properties: { scheduleDate: "2026-03-15" },
        },
      ],
      changedProperties: [
        {
          typeId: "PurchaseOrder",
          objectId: "PO001",
          propertyId: "status",
          value: "Scheduled",
        },
      ],
      links: [
        {
          typeId: "PurchaseOrder",
          objectId: "PO001",
          linkTypeId: "po_production",
        },
      ],
      sideEffects: [],
    };

    const plan = getCelanworksmithActionRefreshPlan(result, {
      objectQueries: {
        entries: {
          orders: {
            request: { widgetId: "OrdersTable", typeId: "PurchaseOrder" },
            status: "ready",
          },
          production: {
            request: {
              widgetId: "ProductionTable",
              typeId: "ProductionOrder",
            },
            status: "ready",
          },
          variableOrders: {
            request: {
              widgetId: "$variable/orders",
              typeId: "PurchaseOrder",
            },
            status: "ready",
          },
          deliveries: {
            request: { widgetId: "DeliveryTable", typeId: "DeliveryOrder" },
            status: "ready",
          },
        },
      },
      links: {
        metadata: {},
        entries: {
          changedSource: {
            request: {
              typeId: "PurchaseOrder",
              objectId: "PO001",
              linkTypeId: "po_production",
            },
            status: "ready",
          },
          changedTarget: {
            request: {
              typeId: "PurchaseOrder",
              objectId: "PO002",
              linkTypeId: "po_production",
            },
            result: {
              typeId: "ProductionOrder",
              items: [
                {
                  id: "PR001",
                  typeId: "ProductionOrder",
                  properties: {},
                },
              ],
              offset: 0,
              limit: 100,
              total: 1,
            },
            status: "ready",
          },
          unrelated: {
            request: {
              typeId: "PurchaseOrder",
              objectId: "PO003",
              linkTypeId: "po_delivery",
            },
            result: {
              typeId: "DeliveryOrder",
              items: [
                {
                  id: "DO001",
                  typeId: "DeliveryOrder",
                  properties: {},
                },
              ],
              offset: 0,
              limit: 100,
              total: 1,
            },
            status: "ready",
          },
        },
      },
    });

    expect(plan.objectTypeIds).toEqual(["ProductionOrder", "PurchaseOrder"]);
    expect(plan.objectQueries).toEqual([
      { widgetId: "OrdersTable", typeId: "PurchaseOrder" },
      { widgetId: "ProductionTable", typeId: "ProductionOrder" },
      { widgetId: "$variable/orders", typeId: "PurchaseOrder" },
    ]);
    expect(plan.variableIds).toEqual(["orders"]);
    expect(plan.widgetIds).toEqual(["OrdersTable", "ProductionTable"]);
    expect(plan.links).toEqual([
      {
        typeId: "PurchaseOrder",
        objectId: "PO001",
        linkTypeId: "po_production",
      },
      {
        typeId: "PurchaseOrder",
        objectId: "PO002",
        linkTypeId: "po_production",
      },
    ]);
  });

  it("does not schedule a refresh when a successful Action reports no changes", () => {
    const plan = getCelanworksmithActionRefreshPlan(
      {
        success: true,
        message: "Action executed",
        executionId: "execution-123",
        changedObjects: [],
        changedProperties: [],
        links: [],
        sideEffects: [],
      },
      { objectQueries: { entries: {} }, links: { metadata: {}, entries: {} } },
    );

    expect(plan).toEqual({
      objectTypeIds: [],
      objectQueries: [],
      links: [],
      variableIds: [],
      widgetIds: [],
    });
  });

  it("refreshes only matching links when an Action reports link changes", () => {
    const plan = getCelanworksmithActionRefreshPlan(
      {
        success: true,
        message: "Action executed",
        executionId: "execution-456",
        changedObjects: [],
        changedProperties: [],
        links: [
          {
            typeId: "PurchaseOrder",
            objectId: "PO001",
            linkTypeId: "po_production",
          },
        ],
        sideEffects: [],
      },
      {
        objectQueries: {
          entries: {
            orders: {
              request: { widgetId: "OrdersTable", typeId: "PurchaseOrder" },
              status: "ready",
            },
            production: {
              request: {
                widgetId: "ProductionTable",
                typeId: "ProductionOrder",
              },
              status: "ready",
            },
            variableOrders: {
              request: {
                widgetId: "$variable/orders",
                typeId: "PurchaseOrder",
              },
              status: "ready",
            },
          },
        },
        links: {
          metadata: {},
          entries: {
            changed: {
              request: {
                typeId: "PurchaseOrder",
                objectId: "PO001",
                linkTypeId: "po_production",
              },
              status: "ready",
            },
            unrelated: {
              request: {
                typeId: "PurchaseOrder",
                objectId: "PO002",
                linkTypeId: "po_production",
              },
              status: "ready",
            },
          },
        },
      },
    );

    expect(plan).toEqual({
      objectTypeIds: [],
      objectQueries: [],
      links: [
        {
          typeId: "PurchaseOrder",
          objectId: "PO001",
          linkTypeId: "po_production",
        },
      ],
      variableIds: [],
      widgetIds: [],
    });
  });
});
