import { celanworksmithActionRun } from "./celanworksmithExecutionActions";

test("includes application context in an Action execution request", () => {
  const action = celanworksmithActionRun(
    "update_supplier",
    {
      objectTypeId: "Supplier",
      objectId: "S001",
      parameters: { name: "Acme" },
    },
    "request-1",
    "app-1",
  );

  expect(action).toMatchObject({
    type: "CELANWORKSMITH_ACTION_RUN",
    payload: {
      actionId: "update_supplier",
      applicationId: "app-1",
      requestId: "request-1",
    },
  });
});
