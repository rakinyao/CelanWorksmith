import { getActionExecutionErrorLabel } from "./actionExecutionFeedback";

describe("getActionExecutionErrorLabel", () => {
  it.each([
    ["INVALID_ARGUMENT", "Parameter error"],
    ["PERMISSION_DENIED", "Permission denied"],
    ["BUSINESS_REJECTED", "Action rejected"],
    ["NETWORK_ERROR", "Service error"],
  ] as const)("labels %s as %s", (code, expectedLabel) => {
    expect(getActionExecutionErrorLabel({ code, message: "details" })).toBe(
      expectedLabel,
    );
  });
});
