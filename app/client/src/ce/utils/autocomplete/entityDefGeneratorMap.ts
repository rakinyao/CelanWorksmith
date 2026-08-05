import {
  type WidgetEntityConfig,
  type JSActionEntityConfig,
  type WidgetEntity,
  type ActionEntity,
  type AppsmithEntity,
  type JSActionEntity,
  type CelanworksmithActionEntity,
  type CelanworksmithActionsEntity,
  type CelanworksmithFunctionEntity,
  type CelanworksmithFunctionsEntity,
  type CelanworksmithObjectsEntity,
  ENTITY_TYPE,
} from "ee/entities/DataTree/types";
import type {
  ConfigTree,
  DataTreeEntity,
} from "entities/DataTree/dataTreeTypes";
import { isFunction } from "lodash";
import { entityDefinitions } from "ee/utils/autocomplete/EntityDefinitions";
import type { Def } from "tern";
import type { DataTreeDefEntityInformation } from "utils/autocomplete/CodemirrorTernService";
import WidgetFactory from "WidgetProvider/factory";
import {
  addSettersToDefinitions,
  generateJSFunctionTypeDef,
  generateTypeDef,
  flattenDef,
} from "utils/autocomplete/defCreatorUtils";

export type EntityMap = Map<string, DataTreeDefEntityInformation>;

interface DefGeneratorProps {
  entity: DataTreeEntity;
  configTree: ConfigTree;
  entityName: string;
  extraDefsToDefine: Def;
  entityMap: EntityMap;
  def: Def;
  jsData: Record<string, unknown>;
}

export type EntityDefGeneratorMap = Record<
  string,
  (props: DefGeneratorProps) => void
>;

const getTernTypeForCelanworksmithDataType = (dataType: string) => {
  switch (dataType) {
    case "INTEGER":
    case "DECIMAL":
      return "number";
    case "BOOLEAN":
      return "bool";
    case "STRING":
    case "ENUM":
    case "REFERENCE":
    case "DATETIME":
      return "string";
    default:
      return "?";
  }
};

const getObjectTypeDef = (
  properties: Array<{
    id: string;
    dataType: string;
  }>,
) => {
  const entries = properties.map(
    ({ dataType, id }) =>
      `${id}: ${getTernTypeForCelanworksmithDataType(dataType)}`,
  );

  return entries.length ? `{${entries.join(", ")}}` : "{}";
};

const getExecutionMetaDef = (): Def => ({
  status: "string",
  requestId: "string",
  executionId: "string",
  startedAt: "number",
  completedAt: "number",
  error: {
    code: "string",
    message: "string",
  },
});

const getFunctionDef = (entity: CelanworksmithFunctionEntity): Def => {
  const metadata = entity.__metadata;
  const parameterType = getObjectTypeDef(metadata?.parameters || []);
  const returnType = metadata
    ? getTernTypeForCelanworksmithDataType(metadata.returnType)
    : "?";

  return {
    run: {
      "!type": `fn(parameters?: ${parameterType}) -> string`,
    },
    data: returnType,
    _meta: getExecutionMetaDef(),
  };
};

const getActionDef = (entity: CelanworksmithActionEntity): Def => {
  const metadata = entity.__metadata;
  const parameterType = getObjectTypeDef(metadata?.parameters || []);
  const objectTypeId = metadata?.objectTypeId || "string";
  const requestType = `{objectTypeId: string, objectId: string, parameters: ${parameterType}}`;

  return {
    run: {
      "!type": `fn(request: ${requestType}) -> string`,
    },
    data: {
      success: "bool",
      message: "string",
      executionId: "string",
      changedObjects: "[?]",
      sideEffects: "[?]",
    },
    changedObjects: "[?]",
    sideEffects: "[?]",
    _meta: {
      ...getExecutionMetaDef(),
      objectTypeId,
    },
  };
};

export const entityDefGeneratorMap: EntityDefGeneratorMap = {
  [ENTITY_TYPE.ACTION]: (props) => {
    const { def, entity, entityMap, entityName, extraDefsToDefine } = props;

    def[entityName] = entityDefinitions.ACTION(
      entity as ActionEntity,
      extraDefsToDefine,
    );
    flattenDef(def, entityName);
    entityMap.set(entityName, {
      type: ENTITY_TYPE.ACTION,
      subType: "ACTION",
    });
  },
  [ENTITY_TYPE.APPSMITH]: (props) => {
    const { def, entity, entityMap, extraDefsToDefine } = props;

    def.appsmith = entityDefinitions.APPSMITH(
      entity as AppsmithEntity,
      extraDefsToDefine,
    );
    flattenDef(def, "appsmith");
    entityMap.set("appsmith", {
      type: ENTITY_TYPE.APPSMITH,
      subType: ENTITY_TYPE.APPSMITH,
    });
  },
  [ENTITY_TYPE.JSACTION]: (props) => {
    const {
      configTree,
      def,
      entity,
      entityMap,
      entityName,
      extraDefsToDefine,
      jsData,
    } = props;
    const entityConfig = configTree[entityName] as JSActionEntityConfig;
    const metaObj = entityConfig.meta;
    const jsPropertiesDef: Def = {};

    for (const funcName in metaObj) {
      const funcTypeDef = generateJSFunctionTypeDef(
        jsData,
        `${entityName}.${funcName}`,
        extraDefsToDefine,
      );

      jsPropertiesDef[funcName] = funcTypeDef;
      // To also show funcName.data in autocompletion hint, we explictly add it here
      jsPropertiesDef[`${funcName}.data`] = funcTypeDef.data;
    }

    if (entityConfig.variables) {
      for (let i = 0; i < entityConfig?.variables?.length; i++) {
        const varKey = entityConfig?.variables[i];
        const varValue = (entity as JSActionEntity)[varKey];

        jsPropertiesDef[varKey] = generateTypeDef(varValue, extraDefsToDefine);
      }
    }

    def[entityName] = jsPropertiesDef;
    entityMap.set(entityName, {
      type: ENTITY_TYPE.JSACTION,
      subType: "JSACTION",
    });
  },
  [ENTITY_TYPE.WIDGET]: (props) => {
    const {
      configTree,
      def,
      entity,
      entityMap,
      entityName,
      extraDefsToDefine,
    } = props;
    const widgetType = (entity as WidgetEntity).type;
    const autocompleteDefinitions =
      WidgetFactory.getAutocompleteDefinitions(widgetType);

    if (autocompleteDefinitions) {
      const entityConfig = configTree[entityName] as WidgetEntityConfig;

      if (isFunction(autocompleteDefinitions)) {
        def[entityName] = autocompleteDefinitions(
          entity as WidgetEntity,
          extraDefsToDefine,
          entityConfig,
        );
      } else {
        def[entityName] = autocompleteDefinitions;
      }

      addSettersToDefinitions(def[entityName] as Def, entity, entityConfig);

      flattenDef(def, entityName);

      entityMap.set(entityName, {
        type: ENTITY_TYPE.WIDGET,
        subType: widgetType,
      });
    }
  },
  [ENTITY_TYPE.CELANWORKSMITH_OBJECTS]: (props) => {
    const { def, entity, entityMap, entityName, extraDefsToDefine } = props;
    const objectsEntity = entity as CelanworksmithObjectsEntity;
    const objectsDef: Def = {};

    Object.entries(objectsEntity).forEach(([objectTypeId, objectType]) => {
      if (objectTypeId === "ENTITY_TYPE" || objectTypeId === "_meta") return;

      if (!objectType || typeof objectType !== "object") return;

      const objectTypeDef: Def = {};

      Object.entries(objectType).forEach(([key, value]) => {
        if (key === "_meta") return;

        objectTypeDef[key] = generateTypeDef(value, extraDefsToDefine);
      });

      objectsDef[objectTypeId] = objectTypeDef;
      flattenDef(objectsDef, objectTypeId);
    });

    def[entityName] = objectsDef;
    flattenDef(def, entityName);
    entityMap.set(entityName, {
      type: ENTITY_TYPE.CELANWORKSMITH_OBJECTS,
      subType: ENTITY_TYPE.CELANWORKSMITH_OBJECTS,
    });
  },
  [ENTITY_TYPE.CELANWORKSMITH_FUNCTION]: (props) => {
    const { def, entity, entityMap, entityName } = props;
    const functionsEntity = entity as CelanworksmithFunctionsEntity;
    const functionsDef: Def = {};

    Object.entries(functionsEntity).forEach(([functionId, functionEntity]) => {
      if (functionId === "ENTITY_TYPE") return;

      if (!functionEntity || typeof functionEntity !== "object") return;

      functionsDef[functionId] = getFunctionDef(
        functionEntity as CelanworksmithFunctionEntity,
      );
      flattenDef(functionsDef, functionId);
    });

    def[entityName] = functionsDef;
    flattenDef(def, entityName);
    entityMap.set(entityName, {
      type: ENTITY_TYPE.CELANWORKSMITH_FUNCTION,
      subType: ENTITY_TYPE.CELANWORKSMITH_FUNCTION,
    });
  },
  [ENTITY_TYPE.CELANWORKSMITH_ACTION]: (props) => {
    const { def, entity, entityMap, entityName } = props;
    const actionsEntity = entity as CelanworksmithActionsEntity;
    const actionsDef: Def = {};

    Object.entries(actionsEntity).forEach(([actionId, actionEntity]) => {
      if (actionId === "ENTITY_TYPE") return;

      if (!actionEntity || typeof actionEntity !== "object") return;

      actionsDef[actionId] = getActionDef(
        actionEntity as CelanworksmithActionEntity,
      );
      flattenDef(actionsDef, actionId);
    });

    def[entityName] = actionsDef;
    flattenDef(def, entityName);
    entityMap.set(entityName, {
      type: ENTITY_TYPE.CELANWORKSMITH_ACTION,
      subType: ENTITY_TYPE.CELANWORKSMITH_ACTION,
    });
  },
};
