import { celanworksmithObjectsLoadRequest } from "actions/celanworksmithObjectActions";
import type { CelanworksmithObjectMetadataState } from "selectors/celanworksmithObjectMetadataSelectors";

const CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST =
  "CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST";

export const getCelanworksmithObjectMetadataRetryAction = (
  metadataState: CelanworksmithObjectMetadataState,
) =>
  metadataState.isBound
    ? celanworksmithObjectsLoadRequest()
    : {
        type: CELANWORKSMITH_APPLICATION_BINDING_LOAD_REQUEST,
        payload: { applicationId: metadataState.applicationId },
      };
