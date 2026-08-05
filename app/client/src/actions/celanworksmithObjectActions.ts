import type {
  CelanworksmithObjectInstance,
  CelanworksmithObjectType,
  CelanworksmithObjectSet,
} from "api/CelanworksmithAPI";
import type { ReduxAction } from "actions/ReduxActionTypes";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import type { CelanworksmithObjectError } from "reducers/celanworksmithObjectsReducer";

export const celanworksmithObjectsLoadInit = () => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECTS_LOAD_INIT,
  payload: undefined,
});

export const celanworksmithObjectsLoadRequest = () => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECTS_LOAD_REQUEST,
  payload: undefined,
});

export const celanworksmithObjectTypesRefreshRequested = (
  typeIds: string[],
  correlationId?: string,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPES_REFRESH_REQUESTED,
  payload: typeIds,
  ...(correlationId ? { meta: { correlationId } } : {}),
});

export const celanworksmithObjectsMetadataSuccess = (
  objectTypes: CelanworksmithObjectType[],
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECTS_METADATA_SUCCESS,
  payload: objectTypes,
});

export const celanworksmithObjectTypeLoadStart = (typeId: string) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_START,
  payload: typeId,
});

export const celanworksmithObjectTypeRefreshStart = (typeId: string) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_REFRESH_START,
  payload: typeId,
});

export const celanworksmithObjectTypeLoadSuccess = (
  typeId: string,
  result: CelanworksmithObjectSet,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_SUCCESS,
  payload: { typeId, result },
});

export const celanworksmithObjectTypeLoadError = (
  typeId: string,
  error: CelanworksmithObjectError,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPE_LOAD_ERROR,
  payload: { typeId, error },
});

export const celanworksmithObjectsLoadError = (
  error: CelanworksmithObjectError,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECTS_LOAD_ERROR,
  payload: error,
});

export const celanworksmithObjectTypesRefreshComplete = (
  typeIds: string[],
  correlationId?: string,
) => ({
  type: ReduxActionTypes.CELANWORKSMITH_OBJECT_TYPES_REFRESH_COMPLETE,
  payload: typeIds,
  ...(correlationId ? { meta: { correlationId } } : {}),
});

export const getChangedObjectTypeIds = (
  changedObjects: CelanworksmithObjectInstance[],
) => [...new Set(changedObjects.map((changedObject) => changedObject.typeId))];

export type CelanworksmithObjectAction = ReduxAction<
  | undefined
  | string
  | string[]
  | CelanworksmithObjectType[]
  | { typeId: string; result: CelanworksmithObjectSet }
  | { typeId: string; error: CelanworksmithObjectError }
  | CelanworksmithObjectError
  | CelanworksmithObjectInstance
>;
