import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { change, getFormValues } from "redux-form";
import { get, isEqual } from "lodash";
import { toast } from "@appsmith/ads";
import type { DefaultRootState } from "react-redux";
import type { Action } from "entities/Action";
import { PluginPackageName } from "entities/Plugin";
import { getPlugin } from "ee/selectors/entitiesSelector";
import {
  hydrateBuilderForm as hydrateDefinitionBuilderForm,
  parseAdvancedDefinition,
  serializeBuilderForm,
  validateDefinition,
  type OntologyObjectQueryDefinition,
  type OntologyQueryMetadata,
} from "./ontologyObjectQueryDefinition";
import {
  hydrateBuilderForm as hydrateFunctionBuilderForm,
  parseAdvancedDefinition as parseFunctionAdvancedDefinition,
  serializeFunctionBuilderForm,
  validateDefinition as validateFunctionDefinition,
  type OntologyFunctionMetadata,
  type OntologyFunctionQueryDefinition,
} from "./ontologyFunctionQueryDefinition";

export const ONTOLOGY_QUERY_MODE_CONFIG_PROPERTY =
  "actionConfiguration.formData.queryMode.data";

type QueryMode = "BUILDER" | "ADVANCED";

export interface OntologyQuerySynchronizerInput {
  pluginPackageName?: string;
  formData: Record<string, unknown>;
  previousQueryMode?: unknown;
  functionMetadata?: OntologyFunctionMetadata;
}

export interface OntologyQueryDefinitionUpdate {
  field: "actionConfiguration.formData.definition.data";
  value: string;
}

export interface OntologyFullPageUpdate {
  field: "actionConfiguration.formData.page.data";
  value: { mode: "FULL" };
}

export type OntologyAdvancedToBuilderResult =
  | {
      updates: Record<string, unknown>;
      definition: OntologyObjectQueryDefinition;
    }
  | { error: string };

export type OntologyFunctionAdvancedToBuilderResult =
  | {
      updates: Record<string, unknown>;
      definition: OntologyFunctionQueryDefinition;
    }
  | { error: string };

export function hydrateBuilderForm(
  definition: OntologyObjectQueryDefinition,
): Record<string, unknown> {
  return hydrateDefinitionBuilderForm(definition);
}

export function getAdvancedToBuilderUpdates(
  text: string,
  metadata: OntologyQueryMetadata,
): OntologyAdvancedToBuilderResult {
  try {
    const parsedDefinition = parseAdvancedDefinition(text);
    const validation = validateDefinition(parsedDefinition, metadata);

    if (!validation.valid) {
      return { error: validation.message };
    }

    return {
      definition: validation.definition,
      updates: hydrateBuilderForm(validation.definition),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Advanced JSON definition could not be parsed",
    };
  }
}

export function getFunctionAdvancedToBuilderUpdates(
  text: string,
  metadata: OntologyFunctionMetadata,
): OntologyFunctionAdvancedToBuilderResult {
  try {
    const parsedDefinition = parseFunctionAdvancedDefinition(text);
    const validation = validateFunctionDefinition(parsedDefinition, metadata);

    if (!validation.valid) {
      return { error: validation.message };
    }

    return {
      definition: validation.definition,
      updates: hydrateFunctionBuilderForm(validation.definition),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Advanced JSON definition could not be parsed",
    };
  }
}

interface DynamicMetadataEntry {
  value?: unknown;
  operators?: Array<{ value: string; requiresValue?: boolean }>;
  required?: boolean;
  readOnly?: boolean;
  derived?: boolean;
}

function dynamicMetadata(
  evaluationState: Record<string, unknown>,
  key: string,
): DynamicMetadataEntry[] | undefined {
  const data = get(evaluationState, `${key}.fetchDynamicValues.data`);

  if (Array.isArray(data)) {
    return data as DynamicMetadataEntry[];
  }

  return Array.isArray(get(data, "content"))
    ? (get(data, "content") as DynamicMetadataEntry[])
    : undefined;
}

function buildRuntimeMetadata(
  formData: Record<string, unknown>,
  evaluationState: Record<string, unknown>,
): OntologyQueryMetadata | undefined {
  const objectTypeId = readControlData(formData.objectTypeId);

  if (typeof objectTypeId !== "string" || !objectTypeId) {
    return undefined;
  }

  const propertyEntries =
    dynamicMetadata(evaluationState, "ONTOLOGY_FILTER_PROPERTY") ||
    dynamicMetadata(evaluationState, "ONTOLOGY_SORT_PROPERTY");

  if (!propertyEntries) {
    return undefined;
  }

  return {
    objectTypes: [
      {
        id: objectTypeId,
        properties: propertyEntries.flatMap((entry) =>
          typeof entry.value === "string"
            ? [{ id: entry.value, operators: entry.operators || [] }]
            : [],
        ),
      },
    ],
  };
}

function buildFunctionRuntimeMetadata(
  formData: Record<string, unknown>,
  evaluationState: Record<string, unknown>,
): OntologyFunctionMetadata | undefined {
  const functionId = readControlData(formData.functionId);

  if (typeof functionId !== "string" || !functionId) {
    return undefined;
  }

  const parameterEntries = dynamicMetadata(
    evaluationState,
    "ONTOLOGY_FUNCTION_PARAMETERS",
  );

  if (!parameterEntries) {
    return undefined;
  }

  return {
    functions: [
      {
        id: functionId,
        parameters: parameterEntries.flatMap((entry) =>
          typeof entry.value === "string"
            ? [
                {
                  id: entry.value,
                  required: entry.required,
                  readOnly: entry.readOnly,
                  derived: entry.derived,
                },
              ]
            : [],
        ),
      },
    ],
  };
}

function readControlData(value: unknown): unknown {
  if (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, "data")
  ) {
    return (value as { data: unknown }).data;
  }

  return value;
}

function shouldSynchronize(
  queryMode: unknown,
  previousQueryMode: unknown,
  currentDefinition: unknown,
): boolean {
  if (queryMode === "BUILDER") {
    return true;
  }

  return (
    queryMode === "ADVANCED" &&
    (previousQueryMode === "BUILDER" ||
      currentDefinition === undefined ||
      currentDefinition === "")
  );
}

export function getOntologyQueryDefinitionUpdate(
  input: OntologyQuerySynchronizerInput,
): OntologyQueryDefinitionUpdate | undefined {
  if (input.pluginPackageName !== PluginPackageName.ONTOLOGY) {
    return undefined;
  }

  const operation = readControlData(input.formData.operation);
  const queryMode = readControlData(input.formData.queryMode) as QueryMode;

  if (
    (operation !== "OBJECT_QUERY" && operation !== "FUNCTION_QUERY") ||
    (queryMode !== "BUILDER" && queryMode !== "ADVANCED") ||
    !shouldSynchronize(
      queryMode,
      input.previousQueryMode,
      readControlData(input.formData.definition),
    )
  ) {
    return undefined;
  }

  let value: string;

  try {
    value =
      operation === "OBJECT_QUERY"
        ? serializeBuilderForm(input.formData, true)
        : input.functionMetadata
          ? serializeFunctionBuilderForm(input.formData, input.functionMetadata)
          : "";
  } catch {
    return undefined;
  }

  if (!value) {
    return undefined;
  }

  if (value === readControlData(input.formData.definition)) {
    return undefined;
  }

  return { field: "actionConfiguration.formData.definition.data", value };
}

export function getOntologyFullPageUpdate(
  input: OntologyQuerySynchronizerInput,
): OntologyFullPageUpdate | undefined {
  if (input.pluginPackageName !== PluginPackageName.ONTOLOGY) {
    return undefined;
  }

  if (
    readControlData(input.formData.operation) !== "OBJECT_QUERY" ||
    readControlData(input.formData.queryMode) !== "BUILDER"
  ) {
    return undefined;
  }

  const page = readControlData(input.formData.page);

  if (
    page === null ||
    typeof page !== "object" ||
    Array.isArray(page) ||
    (page as Record<string, unknown>).mode !== "FULL"
  ) {
    return undefined;
  }

  const pageData = page as Record<string, unknown>;

  if (!("offset" in pageData) && !("limit" in pageData)) {
    return undefined;
  }

  return {
    field: "actionConfiguration.formData.page.data",
    value: { mode: "FULL" },
  };
}

interface OntologyQueryModeSynchronizerProps {
  formName: string;
  enabled: boolean;
  metadata?: OntologyQueryMetadata;
  functionMetadata?: OntologyFunctionMetadata;
}

export function OntologyQueryModeSynchronizer({
  enabled,
  formName,
  functionMetadata: functionMetadataOverride,
  metadata: metadataOverride,
}: OntologyQueryModeSynchronizerProps) {
  const dispatch = useDispatch();
  const formValues = useSelector((state: DefaultRootState) =>
    getFormValues(formName)(state),
  ) as Partial<Action> | undefined;
  const pluginId = formValues?.pluginId || "";
  const pluginPackageName = useSelector(
    (state: DefaultRootState) => getPlugin(state, pluginId)?.packageName,
  );
  const evaluationState = useSelector(
    (state: DefaultRootState) =>
      get(state, "evaluations.formEvaluation", {})[formValues?.id || ""] || {},
  ) as Record<string, unknown>;
  const hydrationUpdates = useRef<Record<string, unknown>>();
  const functionHydrationUpdates = useRef<Record<string, unknown>>();
  const pendingFunctionMetadata = useRef<
    | {
        functionId: string;
        evaluationState: Record<string, unknown>;
      }
    | undefined
  >();
  const previousQueryMode = useRef<unknown>();
  const previousBuilderFunctionId = useRef<unknown>();
  const lastValidAdvancedDefinition = useRef<string>();
  const lastValidFunctionAdvancedDefinition = useRef<string>();
  const formData = get(formValues, "actionConfiguration.formData") as
    | Record<string, unknown>
    | undefined;
  const currentQueryMode = readControlData(formData?.queryMode);

  useEffect(() => {
    if (!enabled || !formData) {
      return;
    }

    const definitionText = readControlData(formData.definition);
    const operation = readControlData(formData.operation);
    const metadata =
      metadataOverride || buildRuntimeMetadata(formData, evaluationState);
    const functionMetadata =
      functionMetadataOverride ||
      buildFunctionRuntimeMetadata(formData, evaluationState);

    if (operation === "OBJECT_QUERY") {
      if (
        currentQueryMode === "ADVANCED" &&
        typeof definitionText === "string" &&
        metadata
      ) {
        const currentDefinition = getAdvancedToBuilderUpdates(
          definitionText,
          metadata,
        );

        if (!("error" in currentDefinition)) {
          lastValidAdvancedDefinition.current = JSON.stringify(
            currentDefinition.definition,
          );
        }
      } else if (
        currentQueryMode === "ADVANCED" &&
        typeof definitionText === "string" &&
        definitionText.trim() &&
        previousQueryMode.current !== "ADVANCED"
      ) {
        try {
          lastValidAdvancedDefinition.current = JSON.stringify(
            parseAdvancedDefinition(definitionText),
          );
        } catch {
          return;
        }
      }

      if (
        currentQueryMode === "BUILDER" &&
        previousQueryMode.current === "ADVANCED"
      ) {
        const result =
          typeof definitionText === "string" && metadata
            ? getAdvancedToBuilderUpdates(definitionText, metadata)
            : { error: "Ontology metadata is unavailable" };

        if ("error" in result) {
          previousQueryMode.current = "ADVANCED";

          if (
            lastValidAdvancedDefinition.current &&
            lastValidAdvancedDefinition.current !== definitionText
          ) {
            dispatch(
              change(
                formName,
                "actionConfiguration.formData.definition.data",
                lastValidAdvancedDefinition.current,
              ),
            );
          }

          toast.show(`Cannot switch to Builder: ${result.error}`, {
            kind: "error",
          });
          dispatch(
            change(formName, ONTOLOGY_QUERY_MODE_CONFIG_PROPERTY, "ADVANCED"),
          );

          return;
        }

        previousQueryMode.current = "BUILDER";
        hydrationUpdates.current = result.updates;
        Object.entries(result.updates).forEach(([field, value]) => {
          dispatch(change(formName, field, value));
        });

        return;
      }

      if (currentQueryMode === "BUILDER" && hydrationUpdates.current) {
        const isHydrationComplete = Object.entries(
          hydrationUpdates.current,
        ).every(([field, value]) => isEqual(get(formValues, field), value));

        if (!isHydrationComplete) {
          return;
        }

        hydrationUpdates.current = undefined;
      }
    }

    if (operation === "FUNCTION_QUERY") {
      if (
        currentQueryMode === "ADVANCED" &&
        typeof definitionText === "string" &&
        definitionText.trim()
      ) {
        try {
          const parsedDefinition =
            parseFunctionAdvancedDefinition(definitionText);
          const metadataForParsedFunction = functionMetadata?.functions.some(
            (candidate) => candidate.id === parsedDefinition.functionId,
          );
          const validation = metadataForParsedFunction
            ? validateFunctionDefinition(parsedDefinition, functionMetadata)
            : undefined;

          if (!validation || validation.valid) {
            const definition = validation?.definition || parsedDefinition;

            lastValidFunctionAdvancedDefinition.current =
              JSON.stringify(definition);
          }
        } catch {
          return;
        }
      }

      if (
        currentQueryMode === "BUILDER" &&
        previousQueryMode.current === "ADVANCED"
      ) {
        let parsedDefinition: OntologyFunctionQueryDefinition;

        try {
          parsedDefinition =
            typeof definitionText === "string"
              ? parseFunctionAdvancedDefinition(definitionText)
              : (() => {
                  throw new Error(
                    "Advanced JSON definition could not be parsed",
                  );
                })();
        } catch (error) {
          previousQueryMode.current = "ADVANCED";
          toast.show(
            `Cannot switch to Builder: ${
              error instanceof Error
                ? error.message
                : "Advanced JSON definition could not be parsed"
            }`,
            { kind: "error" },
          );
          dispatch(
            change(formName, ONTOLOGY_QUERY_MODE_CONFIG_PROPERTY, "ADVANCED"),
          );

          return;
        }

        const currentFunctionId = readControlData(formData.functionId);

        if (currentFunctionId !== parsedDefinition.functionId) {
          pendingFunctionMetadata.current = {
            functionId: parsedDefinition.functionId,
            evaluationState,
          };
          dispatch(
            change(
              formName,
              "actionConfiguration.formData.functionId.data",
              parsedDefinition.functionId,
            ),
          );

          return;
        }

        if (
          pendingFunctionMetadata.current?.functionId ===
            parsedDefinition.functionId &&
          pendingFunctionMetadata.current.evaluationState === evaluationState &&
          !functionMetadataOverride
        ) {
          return;
        }

        pendingFunctionMetadata.current = undefined;
        const metadataForParsedFunction = functionMetadata?.functions.some(
          (candidate) => candidate.id === parsedDefinition.functionId,
        );
        const result = metadataForParsedFunction
          ? getFunctionAdvancedToBuilderUpdates(
              JSON.stringify(parsedDefinition),
              functionMetadata as OntologyFunctionMetadata,
            )
          : { error: "Ontology Function metadata is unavailable" };

        if ("error" in result) {
          previousQueryMode.current = "ADVANCED";

          if (
            lastValidFunctionAdvancedDefinition.current &&
            lastValidFunctionAdvancedDefinition.current !== definitionText
          ) {
            dispatch(
              change(
                formName,
                "actionConfiguration.formData.definition.data",
                lastValidFunctionAdvancedDefinition.current,
              ),
            );
          }

          toast.show(`Cannot switch to Builder: ${result.error}`, {
            kind: "error",
          });
          dispatch(
            change(formName, ONTOLOGY_QUERY_MODE_CONFIG_PROPERTY, "ADVANCED"),
          );

          return;
        }

        previousQueryMode.current = "BUILDER";
        previousBuilderFunctionId.current = result.definition.functionId;
        functionHydrationUpdates.current = result.updates;
        Object.entries(result.updates).forEach(([field, value]) => {
          dispatch(change(formName, field, value));
        });

        return;
      }

      if (currentQueryMode === "BUILDER" && functionHydrationUpdates.current) {
        const isHydrationComplete = Object.entries(
          functionHydrationUpdates.current,
        ).every(([field, value]) => isEqual(get(formValues, field), value));

        if (!isHydrationComplete) {
          return;
        }

        functionHydrationUpdates.current = undefined;
      }

      if (
        currentQueryMode === "BUILDER" &&
        previousQueryMode.current === "BUILDER"
      ) {
        const currentFunctionId = readControlData(formData.functionId);

        if (previousBuilderFunctionId.current === undefined) {
          previousBuilderFunctionId.current = currentFunctionId;
        } else if (previousBuilderFunctionId.current !== currentFunctionId) {
          previousBuilderFunctionId.current = currentFunctionId;
          dispatch(
            change(
              formName,
              "actionConfiguration.formData.parameters.data",
              {},
            ),
          );

          return;
        }
      } else if (currentQueryMode === "BUILDER") {
        previousBuilderFunctionId.current = readControlData(
          formData.functionId,
        );
      }
    }

    const synchronizerInput = {
      formData,
      pluginPackageName,
      previousQueryMode: previousQueryMode.current,
      functionMetadata,
    };
    const fullPageUpdate = getOntologyFullPageUpdate(synchronizerInput);
    const update = getOntologyQueryDefinitionUpdate(synchronizerInput);

    previousQueryMode.current = currentQueryMode;

    if (fullPageUpdate) {
      dispatch(change(formName, fullPageUpdate.field, fullPageUpdate.value));
    }

    if (update) {
      dispatch(change(formName, update.field, update.value));
    }
  }, [
    currentQueryMode,
    dispatch,
    enabled,
    formData,
    formName,
    pluginPackageName,
    evaluationState,
    formValues,
    metadataOverride,
    functionMetadataOverride,
  ]);

  return null;
}

export type { OntologyObjectQueryDefinition };
