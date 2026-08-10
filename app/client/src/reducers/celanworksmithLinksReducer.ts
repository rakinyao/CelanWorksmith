import type {
  CelanworksmithLinkType,
  CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";
import type { ReduxAction } from "actions/ReduxActionTypes";
import type { CelanworksmithLinkRequest } from "actions/celanworksmithLinkActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type { CelanworksmithExecutionError } from "api/CelanworksmithAPI";
import { createReducer } from "utils/ReducerUtils";

export type CelanworksmithLinkLoadStatus =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error";

export type CelanworksmithLinkError = CelanworksmithExecutionError;

export interface CelanworksmithLinkMetadataState {
  links: CelanworksmithLinkType[];
  status: CelanworksmithLinkLoadStatus;
  updatedAt?: number;
  error?: CelanworksmithLinkError;
}

export interface CelanworksmithLinkEntryState {
  request?: CelanworksmithLinkRequest;
  status: CelanworksmithLinkLoadStatus;
  result?: CelanworksmithObjectSet;
  updatedAt?: number;
  error?: CelanworksmithLinkError;
}

export interface CelanworksmithLinksState {
  metadata: Record<string, CelanworksmithLinkMetadataState>;
  entries: Record<string, CelanworksmithLinkEntryState>;
}

export const getCelanworksmithLinkKey = ({
  linkTypeId,
  objectId,
  typeId,
}: CelanworksmithLinkRequest) => `${typeId}/${objectId}/${linkTypeId}`;

const initialState: CelanworksmithLinksState = { metadata: {}, entries: {} };

const initialMetadataState = (): CelanworksmithLinkMetadataState => ({
  links: [],
  status: "idle",
});

const initialEntryState = (): CelanworksmithLinkEntryState => ({
  status: "idle",
});

const invalidateEntriesForObjectType = (
  entries: Record<string, CelanworksmithLinkEntryState>,
  typeId: string,
) =>
  Object.fromEntries(
    Object.entries(entries).filter(
      ([key, entry]) =>
        !key.startsWith(`${typeId}/`) && entry.result?.typeId !== typeId,
    ),
  );

const celanworksmithLinksReducer = createReducer(initialState, {
  [ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_REFRESH_START]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<string>,
  ) => ({
    ...state,
    entries: invalidateEntriesForObjectType(state.entries, action.payload),
  }),
  [ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_REQUESTED]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<string>,
  ) => {
    const current = state.metadata[action.payload] || initialMetadataState();

    return {
      ...state,
      metadata: {
        ...state.metadata,
        [action.payload]: { ...current, status: "loading", error: undefined },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_SUCCESS]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<{ typeId: string; links: CelanworksmithLinkType[] }>,
  ) => {
    const { links, typeId } = action.payload;
    const updatedAt = Date.now();

    return {
      ...state,
      metadata: {
        ...state.metadata,
        [typeId]: {
          links,
          status: links.length ? "ready" : "empty",
          updatedAt,
          error: undefined,
        },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_ERROR]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<{ typeId: string; error: CelanworksmithLinkError }>,
  ) => {
    const { error, typeId } = action.payload;
    const current = state.metadata[typeId] || initialMetadataState();

    return {
      ...state,
      metadata: {
        ...state.metadata,
        [typeId]: { ...current, status: "error", error },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_REQUESTED]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<CelanworksmithLinkRequest>,
  ) => {
    const key = getCelanworksmithLinkKey(action.payload);

    if (state.entries[key]) return state;

    return {
      ...state,
      entries: {
        ...state.entries,
        [key]: { ...initialEntryState(), request: action.payload },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_START]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<CelanworksmithLinkRequest>,
  ) => {
    const key = getCelanworksmithLinkKey(action.payload);
    const current = state.entries[key] || initialEntryState();

    return {
      ...state,
      entries: {
        ...state.entries,
        [key]: {
          ...current,
          request: action.payload,
          status: "loading",
          error: undefined,
        },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_SUCCESS]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<
      CelanworksmithLinkRequest & { result: CelanworksmithObjectSet }
    >,
  ) => {
    const { result, ...request } = action.payload;
    const key = getCelanworksmithLinkKey(request);
    const updatedAt = Date.now();

    return {
      ...state,
      entries: {
        ...state.entries,
        [key]: {
          request,
          status: result.items.length ? "ready" : "empty",
          result,
          updatedAt,
          error: undefined,
        },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_ERROR]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<
      CelanworksmithLinkRequest & { error: CelanworksmithLinkError }
    >,
  ) => {
    const { error, ...request } = action.payload;
    const key = getCelanworksmithLinkKey(request);
    const current = state.entries[key] || initialEntryState();

    return {
      ...state,
      entries: {
        ...state.entries,
        [key]: { ...current, request, status: "error", error },
      },
    };
  },
});

export default celanworksmithLinksReducer;
