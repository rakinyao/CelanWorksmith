import type { CelanworksmithAction } from "api/CelanworksmithAPI";
import { createActionRequest } from "./actionButtonUtils";

const action: CelanworksmithAction = {
  id: "update_schedule",
  displayName: "Update schedule",
  objectTypeId: "PurchaseOrder",
  parameters: [],
  requiresConfirmation: false,
};

describe("ActionButton input mapping", () => {
  test("maps a bound object and parameters to the T5 request shape", () => {
    expect(
      createActionRequest(action, {
        objectData: { id: "PO001", typeId: "PurchaseOrder", properties: {} },
        parameters: { newScheduleDate: "2026-08-05" },
      }),
    ).toEqual({
      objectTypeId: "PurchaseOrder",
      objectId: "PO001",
      parameters: { newScheduleDate: "2026-08-05" },
    });
  });

  test("rejects missing identity, type mismatch, and non-object parameters", () => {
    expect(
      createActionRequest(action, { objectData: undefined }),
    ).toBeUndefined();
    expect(
      createActionRequest(action, {
        objectData: { id: "S001", typeId: "Supplier" },
      }),
    ).toBeUndefined();
    expect(
      createActionRequest(action, {
        objectData: { id: "PO001", typeId: "PurchaseOrder" },
        parameters: "invalid",
      }),
    ).toBeUndefined();
  });
});
