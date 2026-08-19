import {
  oneClickBindingFailureMessage,
  oneClickBindingSuccessMessage,
} from "./OneClickBindingMessages";

describe("one-click binding messages", () => {
  it("describes the created query action", () => {
    expect(oneClickBindingSuccessMessage(["Query_PurchaseOrder"])).toBe(
      "Successfully created action: Query_PurchaseOrder",
    );
  });

  it("reports binding failures instead of implying success", () => {
    expect(oneClickBindingFailureMessage("Unable to run action")).toBe(
      "Failed to bind widget: Unable to run action",
    );
  });
});
