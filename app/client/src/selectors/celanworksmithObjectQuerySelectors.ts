import type { DefaultRootState } from "react-redux";
import type { CelanworksmithObjectQueryRequest } from "actions/celanworksmithObjectQueryActions";
import {
  getObjectQueryKey,
  type CelanworksmithObjectQueryEntry,
  type CelanworksmithObjectQueryState,
} from "reducers/celanworksmithObjectQueryReducer";

const getState = (state: DefaultRootState): CelanworksmithObjectQueryState =>
  (state.celanworksmithObjectQueries as CelanworksmithObjectQueryState) || {
    entries: {},
  };

export const getCelanworksmithObjectQuery = (
  state: DefaultRootState,
  request: CelanworksmithObjectQueryRequest,
): CelanworksmithObjectQueryEntry | undefined =>
  getState(state).entries[getObjectQueryKey(request)];
