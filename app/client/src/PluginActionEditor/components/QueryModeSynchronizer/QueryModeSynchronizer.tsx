import React, { useEffect, useRef } from "react";
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

export const ONTOLOGY_QUERY_MODE_CONFIG_PROPERTY =
  "actionConfiguration.formData.queryMode.data";

type QueryMode = "BUILDER" | "ADVANCED";

export interface OntologyQuerySynchronizerInput {
  pluginPackageName?: string;
  formData: Record<string, unknown>;
  previousQueryMode?: unknown;
}

export interface OntologyQueryDefinitionUpdate {
  field: "actionConfiguration.formData.definition.data";
  value: string;
}

export type OntologyAdvancedToBuilderResult =
  | {
      updates: Record<string, unknown>;
      definition: OntologyObjectQueryDefinition;
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

type DynamicMetadataEntry = {
  value?: unknown;
  operators?: Array<{ value: string; requiresValue?: boolean }>;
};

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
    operation !== "OBJECT_QUERY" ||
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
    value = serializeBuilderForm(input.formData, true);
  } catch {
    return undefined;
  }

  if (value === readControlData(input.formData.definition)) {
    return undefined;
  }

  return { field: "actionConfiguration.formData.definition.data", value };
}

interface OntologyQueryModeSynchronizerProps {
  formName: string;
  enabled: boolean;
  metadata?: OntologyQueryMetadata;
}

export function OntologyQueryModeSynchronizer({
  formName,
  enabled,
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
  const previousQueryMode = useRef<unknown>();
  const lastValidAdvancedDefinition = useRef<string>();
  const formData = get(formValues, "actionConfiguration.formData") as
    | Record<string, unknown>
    | undefined;
  const currentQueryMode = readControlData(formData?.queryMode);

  useEffect(() => {
    if (!enabled || !formData) {
      return;
    }

    const definitionText = readControlData(formData.definition);
    const metadata =
      metadataOverride || buildRuntimeMetadata(formData, evaluationState);

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

    const update = getOntologyQueryDefinitionUpdate({
      formData,
      pluginPackageName,
      previousQueryMode: previousQueryMode.current,
    });

    previousQueryMode.current = currentQueryMode;

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
  ]);

  return null;
}

export type { OntologyObjectQueryDefinition };
