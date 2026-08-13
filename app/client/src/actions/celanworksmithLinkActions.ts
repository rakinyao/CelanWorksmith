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
  applicationId?: string;
  prefetch?: boolean;
  force?: boolean;
}

export interface CelanworksmithLinkMetadataRequestMeta {
  force?: boolean;
  applicationId?: string;
}

export const celanworksmithLinkMetadataLoadRequested = (
  typeId: string,
  force = false,
  applicationId?: string,
) => {
  const normalizedApplicationId = applicationId?.trim() || undefined;

  return {
    type: ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_REQUESTED,
    payload: typeId,
    ...(force || normalizedApplicationId
      ? {
          meta: {
            ...(force ? { force: true } : {}),
            ...(normalizedApplicationId
              ? { applicationId: normalizedApplicationId }
              : {}),
          },
        }
      : {}),
  };
};

export const celanworksmithLinkMetadataRequested =
  celanworksmithLinkMetadataLoadRequested;

export const celanworksmithLinkMetadataLoadSuccess = (
  typeId: string,
  links: CelanworksmithLinkType[],
  applicationId?: string,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_SUCCESS,
  payload: { typeId, links, applicationId },
});

export const celanworksmithLinkMetadataLoadError = (
  typeId: string,
  error: CelanworksmithLinkError,
  applicationId?: string,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_LINK_METADATA_LOAD_ERROR,
  payload: { typeId, error, applicationId },
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
  | { typeId: string; links: CelanworksmithLinkType[]; applicationId?: string }
  | { typeId: string; error: CelanworksmithLinkError; applicationId?: string }
  | (CelanworksmithLinkRequest & { result: CelanworksmithObjectSet })
  | (CelanworksmithLinkRequest & { error: CelanworksmithLinkError })
>;
