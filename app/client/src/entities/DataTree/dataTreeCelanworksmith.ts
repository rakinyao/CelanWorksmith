import {
  ENTITY_TYPE,
  type CelanworksmithObjectTypeEntity,
  type CelanworksmithObjectsEntity,
} from "ee/entities/DataTree/types";
import type { CelanworksmithObjectsState } from "reducers/celanworksmithObjectsReducer";

const toDataTreeInstance = (instance: {
  id: string;
  typeId: string;
  properties: Record<string, unknown>;
}): Record<string, unknown> => ({
  ...instance.properties,
  id: instance.id,
  typeId: instance.typeId,
});

export const generateCelanworksmithObjectsDataTree = (
  state: CelanworksmithObjectsState,
): CelanworksmithObjectsEntity => {
  const dataTree = {
    ENTITY_TYPE: ENTITY_TYPE.CELANWORKSMITH_OBJECTS,
  } as CelanworksmithObjectsEntity;

  Object.entries(state.types).forEach(([typeId, typeState]) => {
    const items = typeState.items.map(toDataTreeInstance);
    const objectType: CelanworksmithObjectTypeEntity = {
      all: items,
      _meta: {
        path: `$objects.${typeId}`,
        returnType: `ObjectSet<${typeId}>`,
        status: typeState.status,
        stableId: typeId,
        total: typeState.total,
        updatedAt: typeState.updatedAt,
        error: typeState.error,
      },
    };

    if (typeState.metadata) {
      Object.defineProperty(objectType, "__metadata", {
        configurable: false,
        enumerable: false,
        value: typeState.metadata,
        writable: false,
      });
    }

    typeState.items.forEach((instance, index) => {
      objectType[instance.id] = items[index];
    });

    dataTree[typeId] = objectType;
  });

  return dataTree;
};
