import {
  getPaginationBindingMode,
} from "./OneClickBindingSaga";

describe("getPaginationBindingMode", () => {
  it("forwards the select action's explicit client pagination mode", () => {
    expect(
      getPaginationBindingMode([
        { type: "select", paginationBindingMode: "CLIENT_SIDE" },
      ]),
    ).toBe("CLIENT_SIDE");
  });

  it("leaves existing generator bindings unchanged when no mode is supplied", () => {
    expect(getPaginationBindingMode([{ type: "select" }])).toBeUndefined();
  });
});
