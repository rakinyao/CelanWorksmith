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
  type CelanworksmithVariablesEntity,
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
import { filterSemanticMetadata } from "celanworksmith/semanticMetadata";

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

interface CelanworksmithObjectTypeMetadata {
  description?: string | Record<string, string>;
  properties?: Array<{
    id: string;
    dataType: string;
  }>;
}

interface CelanworksmithAutocompleteObjectType {
  _meta?: {
    metadata?: CelanworksmithObjectTypeMetadata;
    properties?: CelanworksmithObjectTypeMetadata["properties"];
    status?: string;
    [key: string]: unknown;
  };
  __metadata?: CelanworksmithObjectTypeMetadata;
  [key: string]: unknown;
}

const getObjectTypeMetadata = (
  objectType: CelanworksmithAutocompleteObjectType,
) =>
  objectType.__metadata ||
  objectType._meta?.metadata ||
  (objectType._meta?.properties
    ? { properties: objectType._meta.properties }
    : undefined);

const getSafeSemanticDescription = (
  metadata?: CelanworksmithObjectTypeMetadata,
) => {
  const description = filterSemanticMetadata(metadata, {
    authorized: true,
  }).description;

  return typeof description === "string"
    ? description
    : description
      ? Object.values(description).join(" / ")
      : undefined;
};

const getObjectPropertyDefs = (
  properties: NonNullable<CelanworksmithObjectTypeMetadata["properties"]>,
): Def =>
  Object.fromEntries(
    properties.map(({ dataType, id }) => [
      id,
      getTernTypeForCelanworksmithDataType(dataType),
    ]),
  );

const getExecutionMetaDef = (): Def => ({
  path: "string",
  returnType: "string",
  status: "string",
  stableId: "string",
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
    "!doc": "CelanWorksmith Function; use .run() and read .data.",
    run: {
      "!type": `fn(parameters: ${parameterType}) -> string`,
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
    "!doc": "CelanWorksmith Action; use .run() with a typed request.",
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

      const autocompleteObjectType =
        objectType as CelanworksmithAutocompleteObjectType;
      const metadata = getObjectTypeMetadata(autocompleteObjectType);
      const status = autocompleteObjectType._meta?.status;

      if (status && status !== "ready" && status !== "empty") return;

      const properties = metadata?.properties || [];
      const semanticDescription = getSafeSemanticDescription(metadata);
      const propertyDefs = getObjectPropertyDefs(properties);
      const objectTypeDef = {
        "!doc": `Ontology Object Type ${objectTypeId}${semanticDescription ? `: ${semanticDescription}` : ""}; collection path is $objects.${objectTypeId}.all.`,
        _meta: {
          ...generateTypeDef(autocompleteObjectType._meta, extraDefsToDefine),
          path: "string",
          returnType: "string",
          stableId: "string",
        },
      } as Def;

      Object.entries(autocompleteObjectType).forEach(([key, value]) => {
        if (key === "_meta" || key === "__metadata") return;

        if (key === "all" && properties.length) {
          objectTypeDef[key] = `[${getObjectTypeDef(properties)}]`;

          return;
        }

        const runtimeDef = generateTypeDef(value, extraDefsToDefine);

        objectTypeDef[key] =
          properties.length &&
          runtimeDef &&
          typeof runtimeDef === "object" &&
          !Array.isArray(runtimeDef)
            ? { ...runtimeDef, ...propertyDefs }
            : runtimeDef;
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
  [ENTITY_TYPE.CELANWORKSMITH_VARIABLES]: (props) => {
    const { def, entity, entityMap, entityName, extraDefsToDefine } = props;
    const variablesEntity = entity as CelanworksmithVariablesEntity;
    const variablesDef: Def = {};
    const variableNames = new Set([
      ...Object.keys(variablesEntity).filter(
        (variableName) =>
          variableName !== "ENTITY_TYPE" && variableName !== "_meta",
      ),
      ...Object.keys(variablesEntity._meta || {}),
    ]);

    variableNames.forEach((variableName) => {
      const meta = variablesEntity._meta?.[variableName];
      const status =
        meta && typeof meta === "object" && "status" in meta
          ? meta.status
          : undefined;

      if (status && status !== "ready" && status !== "empty") return;

      variablesDef[variableName] = generateTypeDef(
        variablesEntity[variableName],
        extraDefsToDefine,
      );
      flattenDef(variablesDef, variableName);
    });

    variablesDef._meta = generateTypeDef(
      variablesEntity._meta,
      extraDefsToDefine,
    );

    def[entityName] = variablesDef;
    flattenDef(def, entityName);
    entityMap.set(entityName, {
      type: ENTITY_TYPE.CELANWORKSMITH_VARIABLES,
      subType: ENTITY_TYPE.CELANWORKSMITH_VARIABLES,
    });
  },
};
