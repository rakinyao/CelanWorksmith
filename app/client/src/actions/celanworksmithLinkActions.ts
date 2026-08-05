import type {
  CelanworksmithLinkType,
  CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";
import type { ReduxAction } from "actions/ReduxActionTypes";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type { CelanworksmithLinkError } from "reducers/celanworksmithLinksReducer";

export interface CelanworksmithLinkRequest {
  typeId: string;
  objectId: string;
  linkTypeId: string;
  prefetch?: boolean;
  force?: boolean;
}

export const celanworksmithLinkMetadataLoadRequested = (
  typeId: string,
  force = false,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_REQUESTED,
  payload: typeId,
  ...(force ? { meta: { force: true } } : {}),
});

export const celanworksmithLinkMetadataRequested =
  celanworksmithLinkMetadataLoadRequested;

export const celanworksmithLinkMetadataLoadSuccess = (
  typeId: string,
  links: CelanworksmithLinkType[],
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_SUCCESS,
  payload: { typeId, links },
});

export const celanworksmithLinkMetadataLoadError = (
  typeId: string,
  error: CelanworksmithLinkError,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_ERROR,
  payload: { typeId, error },
});

export const celanworksmithLinkLoadRequested = (
  request: CelanworksmithLinkRequest,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_REQUESTED,
  payload: request,
});

export const celanworksmithLinkLoadStart = (
  request: CelanworksmithLinkRequest,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_START,
  payload: request,
});

export const celanworksmithLinkLoadSuccess = (
  request: CelanworksmithLinkRequest,
  result: CelanworksmithObjectSet,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_SUCCESS,
  payload: { ...request, result },
});

export const celanworksmithLinkLoadError = (
  request: CelanworksmithLinkRequest,
  error: CelanworksmithLinkError,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_LINK_LOAD_ERROR,
  payload: { ...request, error },
});

export type CelanworksmithLinkAction = ReduxAction<
  | string
  | CelanworksmithLinkRequest
  | { typeId: string; links: CelanworksmithLinkType[] }
  | { typeId: string; error: CelanworksmithLinkError }
  | (CelanworksmithLinkRequest & { result: CelanworksmithObjectSet })
  | (CelanworksmithLinkRequest & { error: CelanworksmithLinkError })
>;
