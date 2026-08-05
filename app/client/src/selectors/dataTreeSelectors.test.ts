import { ENTITY_TYPE } from "ee/entities/DataTree/types";
import {
  buildDataTreeForAutocomplete,
  getDataTreeForAutocomplete,
} from "selectors/dataTreeSelectors";

describe("getDataTreeForAutocomplete", () => {
  it("uses the latest CelanWorksmith objects when the evaluated tree is stale", () => {
    const dataTree = getDataTreeForAutocomplete({
      evaluations: { tree: {} },
      celanworksmithObjects: {
        status: "ready",
        types: {
          PurchaseOrder: {
            items: [
              {
                id: "PO001",
                typeId: "PurchaseOrder",
                properties: { orderNumber: "PO-001" },
              },
            ],
            total: 1,
            offset: 0,
            limit: 100,
            status: "ready",
          },
        },
      },
    } as never);

    expect(dataTree).toHaveProperty(
      "$objects.PurchaseOrder.all[0].orderNumber",
      "PO-001",
    );
    expect(dataTree.$objects).toHaveProperty(
      "ENTITY_TYPE",
      ENTITY_TYPE.CELANWORKSMITH_OBJECTS,
    );
  });

  it("includes execution namespaces from ontology-backed DataTree nodes", () => {
    const dataTree = getDataTreeForAutocomplete({
      evaluations: { tree: {} },
      celanworksmithObjects: { status: "idle", types: {} },
      celanworksmithOntology: {
        status: "ready",
        functions: [
          {
            id: "CalculateDelayDays",
            displayName: "Calculate delay days",
            returnType: "INTEGER",
            parameters: [],
            sideEffectFree: true,
          },
        ],
        actions: [],
      },
      celanworksmithExecution: {
        functions: {},
        actions: {},
        requests: {},
        functionCache: {},
        inputs: {},
      },
    } as never);

    expect(dataTree).toHaveProperty(
      "$functions.CalculateDelayDays._meta.status",
      "idle",
    );
    expect(dataTree).toHaveProperty(
      "$functions.CalculateDelayDays.ENTITY_TYPE",
      ENTITY_TYPE.CELANWORKSMITH_FUNCTION,
    );
  });

  it("builds autocomplete data from a plain DataTree without Redux state", () => {
    const dataTree = buildDataTreeForAutocomplete(
      { Input1: { data: "value" } } as never,
      { PurchaseOrder: { all: [] } } as never,
      { $functions: { CalculateDelayDays: { data: 3 } } } as never,
    );

    expect(dataTree).toEqual({
      Input1: { data: "value" },
      $objects: { PurchaseOrder: { all: [] } },
      $functions: { CalculateDelayDays: { data: 3 } },
    });
  });

  it("does not treat a selector path argument as an execution dispatch", () => {
    const dataTree = getDataTreeForAutocomplete(
      {
        evaluations: { tree: {} },
        celanworksmithObjects: { status: "idle", types: {} },
        celanworksmithOntology: {
          status: "ready",
          functions: [
            {
              id: "CalculateDelayDays",
              displayName: "Calculate delay days",
              returnType: "INTEGER",
              parameters: [],
              sideEffectFree: true,
            },
          ],
          actions: [],
        },
        celanworksmithExecution: {
          functions: {},
          actions: {},
          requests: {},
          functionCache: {},
          inputs: {},
        },
      } as never,
      "Input1.text",
    );

    expect(() => dataTree.$functions.CalculateDelayDays.run()).not.toThrow();
  });
});
