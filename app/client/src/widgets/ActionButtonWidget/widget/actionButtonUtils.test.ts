import type { CelanworksmithAction } from "api/CelanworksmithAPI";
import {
  createActionRequest,
  getActionValidationFeedback,
  validateActionBinding,
  validateObjectBinding,
} from "./actionButtonUtils";

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
      createActionRequest(undefined, {
        objectData: { id: "PO001", typeId: "PurchaseOrder" },
      }),
    ).toBeUndefined();
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

  test("maps named Action parameters from the selected Object before explicit input", () => {
    const actionWithParameters: CelanworksmithAction = {
      ...action,
      parameters: [
        {
          id: "priority",
          displayName: "Priority",
          dataType: "STRING",
          required: true,
          readOnly: false,
          derived: false,
        },
        {
          id: "approved",
          displayName: "Approved",
          dataType: "BOOLEAN",
          required: true,
          readOnly: false,
          derived: false,
        },
      ],
    };

    expect(
      createActionRequest(actionWithParameters, {
        objectData: {
          id: "PO001",
          typeId: "PurchaseOrder",
          properties: { priority: "HIGH", approved: false },
        },
        parameters: { priority: "LOW" },
      }),
    ).toEqual({
      objectTypeId: "PurchaseOrder",
      objectId: "PO001",
      parameters: { priority: "LOW", approved: false },
    });
  });

  test("returns shared object and parameter validation errors before dispatch", () => {
    expect(
      validateObjectBinding(
        { id: "S001", typeId: "Supplier" },
        "PurchaseOrder",
      ),
    ).toMatchObject({ valid: false, error: expect.any(String) });
    expect(
      validateActionBinding(action, {
        objectData: { id: "PO001", typeId: "PurchaseOrder" },
        parameters: { newScheduleDate: 7 },
      }),
    ).toMatchObject({ valid: true });

    const typedAction: CelanworksmithAction = {
      ...action,
      parameters: [
        {
          id: "quantity",
          displayName: "Quantity",
          dataType: "INTEGER",
          required: true,
          readOnly: false,
          derived: false,
        },
      ],
    };

    expect(
      validateActionBinding(typedAction, {
        objectData: { id: "PO001", typeId: "PurchaseOrder" },
        parameters: { quantity: "not-an-integer" },
      }),
    ).toEqual({
      valid: false,
      error:
        "PurchaseOrder.quantity must be an INTEGER value; received string.",
      errorPath: "parameters.quantity",
      firstIssue: expect.objectContaining({
        code: "TYPE_MISMATCH",
        path: "parameters.quantity",
      }),
      issues: [
        expect.objectContaining({
          code: "TYPE_MISMATCH",
          path: "parameters.quantity",
        }),
      ],
      object: {
        id: "PO001",
        properties: {},
        typeId: "PurchaseOrder",
      },
      summary: expect.stringContaining("parameters.quantity"),
    });
  });

  test("exposes the first repairable field and summary for Button entry points", () => {
    const result = validateActionBinding(
      {
        ...action,
        parameters: [
          {
            dataType: "STRING",
            derived: false,
            displayName: "Comment",
            id: "comment",
            readOnly: false,
            required: true,
          },
        ],
      },
      {
        objectData: { id: "PO001", typeId: "PurchaseOrder" },
        parameters: { comment: "" },
      },
    );

    expect(getActionValidationFeedback(result)).toEqual({
      error: "PurchaseOrder.parameters.comment is required.",
      path: "parameters.comment",
      summary: expect.stringContaining("parameters.comment"),
    });
  });
});
