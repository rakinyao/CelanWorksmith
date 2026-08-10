import type { DefaultRootState } from "react-redux";

interface CelanworksmithApplicationBindingState {
  status: "idle" | "loading" | "ready" | "unbound" | "error";
  applicationId?: string;
  binding: unknown;
  projects: unknown[];
  versions: unknown[];
  error?: unknown;
}

const initialState: CelanworksmithApplicationBindingState = {
  status: "idle",
  binding: null,
  projects: [],
  versions: [],
};

export const getCelanworksmithApplicationBindingState = (
  state: DefaultRootState,
): CelanworksmithApplicationBindingState =>
  (
    state as DefaultRootState & {
      celanworksmithApplicationBinding?: CelanworksmithApplicationBindingState;
    }
  ).celanworksmithApplicationBinding || initialState;

export const getCelanworksmithApplicationId = (state: DefaultRootState) =>
  getCelanworksmithApplicationBindingState(state).applicationId;

export const getCelanworksmithCurrentApplicationId = (
  state: DefaultRootState,
) =>
  (
    state as DefaultRootState & {
      entities?: { pageList?: { applicationId?: string } };
    }
  ).entities?.pageList?.applicationId || "";

export const isCelanworksmithApplicationBindingReady = (
  state: DefaultRootState,
) => getCelanworksmithApplicationBindingState(state).status === "ready";
