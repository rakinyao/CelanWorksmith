import { hashCelanworksmithParameters } from "actions/celanworksmithExecutionActions";
import type { CelanworksmithObjectQueryState } from "reducers/celanworksmithObjectQueryReducer";
import type { CelanworksmithExecutionState } from "reducers/celanworksmithExecutionReducer";
import type { CelanworksmithObjectsState } from "reducers/celanworksmithObjectsReducer";
import type { CelanworksmithOntologyState } from "reducers/celanworksmithOntologyReducer";
import type { VariableDefinition } from "./types";
import { getCelanworksmithVariableLoadPlan } from "./variableLoaderUtils";

const objectSet: VariableDefinition = {
  id: "orders",
  name: "orders",
  kind: "OBJECT_SET",
  version: 1,
  updatedAt: 1,
  dependencies: [],
  config: { typeId: "PurchaseOrder", limit: 10 },
};

const functionVariable: VariableDefinition = {
  id: "delay",
  name: "delay",
  kind: "FUNCTION",
  version: 1,
  updatedAt: 1,
  dependencies: [],
  config: { functionId: "CalculateDelayDays", parameters: { poId: "PO001" } },
};

const objects: CelanworksmithObjectsState = {
  status: "ready",
  types: {
    PurchaseOrder: {
      metadata: {
        id: "PurchaseOrder",
        displayName: "Purchase Order",
        properties: [],
      },
      items: [],
      total: 0,
      offset: 0,
      limit: 100,
      status: "ready",
    },
  },
};

const ontology: CelanworksmithOntologyState = {
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
};

const execution: CelanworksmithExecutionState = {
  functions: {},
  actions: {},
  requests: {},
  functionCache: {},
  inputs: {},
};

const queries: CelanworksmithObjectQueryState = { entries: {} };

test("plans referenced object and function work", () => {
  const plan = getCelanworksmithVariableLoadPlan({
    definitions: [objectSet, functionVariable],
    objects,
    ontology,
    execution,
    queries,
  });

  expect(plan.objectQueries).toEqual([
    {
      widgetId: "$variable/orders",
      typeId: "PurchaseOrder",
      query: { offset: 0, limit: 10 },
    },
  ]);
  expect(plan.functionRuns).toEqual([
    { functionId: "CalculateDelayDays", parameters: { poId: "PO001" } },
  ]);
});

test("does not re-plan completed or in-flight work for the same input", () => {
  const plan = getCelanworksmithVariableLoadPlan({
    definitions: [objectSet, functionVariable],
    objects,
    ontology,
    execution: {
      ...execution,
      functions: {
        CalculateDelayDays: {
          data: 3,
          meta: {
            status: "succeeded",
            requestId: "request-1",
            parametersHash: hashCelanworksmithParameters({ poId: "PO001" }),
          },
        },
      },
    },
    queries: {
      entries: {
        ['$variable/orders/PurchaseOrder/{"limit":10,"offset":0}']: {
          request: {
            widgetId: "$variable/orders",
            typeId: "PurchaseOrder",
            query: { offset: 0, limit: 10 },
          },
          status: "ready",
        },
      },
    },
  });

  expect(plan).toEqual({ objectQueries: [], functionRuns: [] });
});
