import type { DefaultRootState } from "react-redux";
import type {
  CelanworksmithExecutionState,
  CelanworksmithFunctionExecutionState,
} from "reducers/celanworksmithExecutionReducer";
import type { CelanworksmithOntologyState } from "reducers/celanworksmithOntologyReducer";
import {
  getCelanworksmithLinkKey,
  type CelanworksmithLinkEntryState,
  type CelanworksmithLinkMetadataState,
  type CelanworksmithLinksState,
} from "reducers/celanworksmithLinksReducer";
import type { CelanworksmithLinkRequest } from "actions/celanworksmithLinkActions";

const initialOntologyState: CelanworksmithOntologyState = {
  status: "idle",
  functions: [],
  actions: [],
};

const initialExecutionState: CelanworksmithExecutionState = {
  functions: {},
  actions: {},
  requests: {},
  functionCache: {},
  inputs: {},
};

const initialLinksState: CelanworksmithLinksState = {
  metadata: {},
  entries: {},
};

export const getCelanworksmithOntologyState = (
  state: DefaultRootState,
): CelanworksmithOntologyState =>
  (state.celanworksmithOntology as CelanworksmithOntologyState | undefined) ||
  initialOntologyState;

export const getCelanworksmithExecutionState = (
  state: DefaultRootState,
): CelanworksmithExecutionState =>
  (state.celanworksmithExecution as CelanworksmithExecutionState | undefined) ||
  initialExecutionState;

export const getCelanworksmithLinksState = (
  state: DefaultRootState,
): CelanworksmithLinksState =>
  (state.celanworksmithLinks as CelanworksmithLinksState | undefined) ||
  initialLinksState;

export const getCelanworksmithLinkMetadata = (
  state: DefaultRootState,
  typeId: string,
): CelanworksmithLinkMetadataState | undefined =>
  getCelanworksmithLinksState(state).metadata[typeId];

export const getCelanworksmithLinkEntry = (
  state: DefaultRootState,
  request: CelanworksmithLinkRequest,
): CelanworksmithLinkEntryState | undefined =>
  getCelanworksmithLinksState(state).entries[getCelanworksmithLinkKey(request)];

export const getCelanworksmithFunctionExecutionState = (
  state: DefaultRootState,
  functionId: string,
): CelanworksmithFunctionExecutionState | undefined =>
  getCelanworksmithExecutionState(state).functions[functionId];
