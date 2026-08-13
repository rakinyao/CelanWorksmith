import { ENTITY_TYPE } from "ee/entities/DataTree/types";
import {
  celanworksmithActionRun,
  celanworksmithFunctionRun,
} from "actions/celanworksmithExecutionActions";
import { generateCelanworksmithExecutionDataTree } from "./dataTreeCelanworksmithExecution";

const functionMetadata = {
  id: "CalculateDelayDays",
  displayName: "Calculate delay days",
  returnType: "INTEGER",
  parameters: [
    {
      id: "poId",
      displayName: "Purchase order",
      dataType: "REFERENCE",
      required: true,
      readOnly: false,
      derived: false,
    },
  ],
  sideEffectFree: true,
};

const actionMetadata = {
  id: "UpdateProductionSchedule",
  displayName: "Update production schedule",
  objectTypeId: "PurchaseOrder",
  parameters: [],
  requiresConfirmation: false,
};

const state = {
  ontology: {
    status: "ready" as const,
    functions: [functionMetadata],
    actions: [actionMetadata],
  },
  execution: {
    functions: {},
    actions: {},
    requests: {},
    functionCache: {},
    inputs: {},
  },
};

describe("generateCelanworksmithExecutionDataTree", () => {
  it("exposes default execution nodes only for known ontology metadata", () => {
    const dispatch = jest.fn();
    const tree = generateCelanworksmithExecutionDataTree(state, dispatch);

    expect(tree.$functions.CalculateDelayDays).toMatchObject({
      data: undefined,
      _meta: {
        status: "idle",
        requestId: "",
        parametersHash: "",
        path: "$functions.CalculateDelayDays",
        returnType: "INTEGER",
        stableId: "CalculateDelayDays",
      },
      ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_FUNCTION,
    });
    expect(tree.$actions.UpdateProductionSchedule).toMatchObject({
      data: undefined,
      changedObjects: [],
      sideEffects: [],
      _meta: {
        status: "idle",
        requestId: "",
        parametersHash: "",
        path: "$actions.UpdateProductionSchedule",
        returnType: "ActionResult",
        stableId: "UpdateProductionSchedule",
      },
      ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_ACTION,
    });
    expect(tree.$functions.UnknownFunction).toBeUndefined();
    expect(tree.$actions.UnknownAction).toBeUndefined();
  });

  it("dispatches a Function request from run and returns its request ID", () => {
    const dispatch = jest.fn();
    const tree = generateCelanworksmithExecutionDataTree(state, dispatch);

    const requestId = tree.$functions.CalculateDelayDays.run({ poId: "PO001" });

    expect(requestId).toMatch(/^celanworksmith-/);
    expect(dispatch).toHaveBeenCalledWith(
      celanworksmithFunctionRun(
        "CalculateDelayDays",
        { poId: "PO001" },
        requestId,
      ),
    );
  });

  it("dispatches an Action request from run and returns its request ID", () => {
    const dispatch = jest.fn();
    const tree = generateCelanworksmithExecutionDataTree(state, dispatch);
    const request = {
      objectTypeId: "PurchaseOrder",
      objectId: "PO001",
      parameters: { newScheduleDate: "2026-03-15" },
    };

    const requestId = tree.$actions.UpdateProductionSchedule.run(request);

    expect(dispatch).toHaveBeenCalledWith(
      celanworksmithActionRun("UpdateProductionSchedule", request, requestId),
    );
  });

  it("uses a no-op dispatch when no dispatch is provided", () => {
    const tree = generateCelanworksmithExecutionDataTree(state);

    expect(() => tree.$functions.CalculateDelayDays.run()).not.toThrow();
    expect(() =>
      tree.$actions.UpdateProductionSchedule.run({
        objectTypeId: "PurchaseOrder",
        objectId: "PO001",
        parameters: {},
      }),
    ).not.toThrow();
  });
});
