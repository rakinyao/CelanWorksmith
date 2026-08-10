import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithApplicationId,
  isCelanworksmithApplicationBindingReady,
} from "./celanworksmithApplicationBindingSelectors";

describe("celanworksmithApplicationBindingSelectors", () => {
  it("returns a safe idle state when the reducer is not mounted", () => {
    const state = {} as never;

    expect(getCelanworksmithApplicationBindingState(state).status).toBe("idle");
    expect(getCelanworksmithApplicationId(state)).toBeUndefined();
    expect(isCelanworksmithApplicationBindingReady(state)).toBe(false);
  });
});
