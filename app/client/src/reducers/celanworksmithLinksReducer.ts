import type {
  CelanworksmithLinkType,
  CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";
import type { ReduxAction } from "actions/ReduxActionTypes";
import type { CelanworksmithLinkRequest } from "actions/celanworksmithLinkActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type { CelanworksmithExecutionError } from "api/CelanworksmithAPI";
import { createReducer } from "utils/ReducerUtils";
import type { CelanworksmithLinkMetadataRequestMeta } from "actions/celanworksmithLinkActions";

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
  applicationId,
  linkTypeId,
  objectId,
  typeId,
}: CelanworksmithLinkRequest) =>
  `${applicationId || "legacy"}/${typeId}/${objectId}/${linkTypeId}`;

export const getCelanworksmithLinkMetadataKey = (
  typeId: string,
  applicationId?: string,
) => `${applicationId || "legacy"}/${typeId}`;

const initialState: CelanworksmithLinksState = { metadata: {}, entries: {} };

const initialMetadataState = (): CelanworksmithLinkMetadataState => ({
  links: [],
  status: "idle",
});

const initialEntryState = (): CelanworksmithLinkEntryState => ({
  status: "idle",
});

const celanworksmithLinksReducer = createReducer(initialState, {
  [ReduxActionTypes.CELANWORKSMITH_RUNTIME_CACHE_CLEARED]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<{ applicationId?: string } | undefined>,
  ) => {
    const applicationId = action.payload?.applicationId;

    if (!applicationId) return { ...state, entries: {} };

    const prefix = `${applicationId}/`;

    return {
      ...state,
      entries: Object.fromEntries(
        Object.entries(state.entries).filter(
          ([key]) => !key.startsWith(prefix),
        ),
      ),
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_REFRESH_START]: (
    state: CelanworksmithLinksState,
  ) => state,
  [ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_REQUESTED]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<string> & {
      meta?: CelanworksmithLinkMetadataRequestMeta;
    },
  ) => {
    const key = getCelanworksmithLinkMetadataKey(
      action.payload,
      action.meta?.applicationId,
    );
    const current = state.metadata[key] || initialMetadataState();

    return {
      ...state,
      metadata: {
        ...state.metadata,
        [key]: { ...current, status: "loading", error: undefined },
      },
    };
  },
  [ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_SUCCESS]: (
    state: CelanworksmithLinksState,
    action: ReduxAction<{
      typeId: string;
      links: CelanworksmithLinkType[];
      applicationId?: string;
    }>,
  ) => {
    const { applicationId, links, typeId } = action.payload;
    const key = getCelanworksmithLinkMetadataKey(typeId, applicationId);
    const updatedAt = Date.now();

    return {
      ...state,
      metadata: {
        ...state.metadata,
        [key]: {
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
    action: ReduxAction<{
      typeId: string;
      error: CelanworksmithLinkError;
      applicationId?: string;
    }>,
  ) => {
    const { applicationId, error, typeId } = action.payload;
    const key = getCelanworksmithLinkMetadataKey(typeId, applicationId);
    const current = state.metadata[key] || initialMetadataState();

    return {
      ...state,
      metadata: {
        ...state.metadata,
        [key]: { ...current, status: "error", error },
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
