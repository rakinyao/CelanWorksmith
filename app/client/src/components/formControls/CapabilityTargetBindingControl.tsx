import React, { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { change, formValueSelector } from "redux-form";
import {
  getCurrentActions,
  getCurrentPageWidgets,
} from "ee/selectors/entitiesSelector";
import i18n from "i18n";
import styled from "styled-components";
import type { ControlProps } from "./BaseControl";
import {
  buildWidgetTargetBindings,
  type TargetBindingWidget,
  type WidgetTargetCardinality,
} from "PluginActionEditor/components/CapabilityTargetBinding/ontologyTargetWidgetAdapters";
import {
  resolveOntologyTableTargetProvenance,
  isOntologyTargetTableWidgetType,
  type OntologyQueryCandidate,
} from "PluginActionEditor/components/CapabilityTargetBinding/ontologyTableTargetProvenance";

export type CapabilityTargetBindingMode = "WIDGET" | "MANUAL";

export interface CapabilityTargetBinding {
  mode: CapabilityTargetBindingMode;
  widgetId?: string;
  cardinality: WidgetTargetCardinality;
  expression: string;
}

export interface CapabilityTargetBindingWidget extends TargetBindingWidget {
  canonicalKey?: string;
  ontologyCanonicalKey?: string;
  primaryColumnId?: string;
  ownerObjectTypeId?: string;
  tableData?: string;
}

export interface CapabilityTargetBindingControlProps
  extends Omit<ControlProps, "controlType"> {
  controlType?: ControlProps["controlType"] | "ONTOLOGY_CAPABILITY_TARGET";
  canonicalKey?: string;
  primaryKey?: string;
  primaryKeyConfigProperty?: string;
  ownerObjectTypeId?: string;
  ownerObjectTypeConfigProperty?: string;
  functionMetadataConfigProperty?: string;
  tableCanonicalKey?: string;
  tableCanonicalKeys?: Record<string, string>;
  maxItems?: number;
  currentPageWidgets?: Record<string, Partial<CapabilityTargetBindingWidget>>;
  currentPageActions?: OntologyQueryCandidate[];
  value?: CapabilityTargetBinding | Record<string, unknown>;
  onBindingChange?: (value: CapabilityTargetBinding) => void;
}

const DEFAULT_BINDING: CapabilityTargetBinding = {
  mode: "MANUAL",
  cardinality: "ONE",
  expression: "",
};

const NO_WIDGETS: Record<string, Partial<CapabilityTargetBindingWidget>> = {};

const TargetControl = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--ads-v2-spaces-3);

  label {
    color: var(--ads-v2-color-fg);
    font-size: 12px;
    font-weight: 500;
  }

  select,
  input {
    width: 100%;
    min-height: 32px;
    border: 1px solid var(--ads-v2-color-border);
    border-radius: var(--ads-v2-border-radius);
    background-color: var(--ads-v2-color-bg);
    color: var(--ads-v2-color-fg);
    font-size: 14px;
    padding: 0 var(--ads-v2-spaces-4);
  }

  select:focus,
  input:focus {
    border-color: var(--ads-v2-color-border-emphasis);
    outline: none;
  }

  [role="status"] {
    color: var(--ads-v2-color-fg-muted);
    font-size: 12px;
  }
`;

interface FunctionDropdownEntry {
  value?: unknown;
  maxItems?: unknown;
}

function isFunctionDropdownEntry(
  value: unknown,
): value is FunctionDropdownEntry {
  return value !== null && typeof value === "object";
}

const targetMessages = {
  source: () =>
    i18n.t("ontologyCapabilityTarget.source", {
      defaultValue: "Target source",
    }),
  widget: () =>
    i18n.t("ontologyCapabilityTarget.widget", {
      defaultValue: "Target widget",
    }),
  widgetSelection: () =>
    i18n.t("ontologyCapabilityTarget.widgetSelection", {
      defaultValue: "Widget selection",
    }),
  manual: () =>
    i18n.t("ontologyCapabilityTarget.manual", {
      defaultValue: "Manual expression or ID",
    }),
  chooseWidget: () =>
    i18n.t("ontologyCapabilityTarget.chooseWidget", {
      defaultValue: "Choose a widget",
    }),
  removedWidget: (widgetId: string) =>
    i18n.t("ontologyCapabilityTarget.removedWidget", {
      defaultValue: "Removed widget ({{widgetId}})",
      widgetId,
    }),
  widgetUnavailable: () =>
    i18n.t("ontologyCapabilityTarget.widgetUnavailable", {
      defaultValue: "Selected widget is no longer available",
    }),
  incompatibleOwner: (
    widgetName: string,
    widgetOwner: string,
    targetOwner: string,
  ) =>
    i18n.t("ontologyCapabilityTarget.incompatibleOwner", {
      defaultValue:
        "{{widgetName}} is tied to {{widgetOwner}}, but this capability targets {{targetOwner}}",
      widgetName,
      widgetOwner,
      targetOwner,
    }),
  expression: () =>
    i18n.t("ontologyCapabilityTarget.expression", {
      defaultValue: "Target expression",
    }),
  cardinality: () =>
    i18n.t("ontologyCapabilityTarget.cardinality", {
      defaultValue: "Target cardinality",
    }),
  one: () =>
    i18n.t("ontologyCapabilityTarget.one", {
      defaultValue: "One",
    }),
  many: () =>
    i18n.t("ontologyCapabilityTarget.many", {
      defaultValue: "Many",
    }),
};

function positiveMaxItems(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : 1;
}

function functionDropdownEntries(value: unknown): FunctionDropdownEntry[] {
  if (Array.isArray(value)) {
    return value.filter(isFunctionDropdownEntry);
  }

  if (
    value !== null &&
    typeof value === "object" &&
    Array.isArray((value as { content?: unknown }).content)
  ) {
    return (value as { content: unknown[] }).content.filter(
      isFunctionDropdownEntry,
    );
  }

  return [];
}

function selectedFunctionMaxItems(
  functionId: unknown,
  metadata: unknown,
): number {
  if (typeof functionId !== "string" || functionId.trim() === "") {
    return 1;
  }

  const selectedFunction = functionDropdownEntries(metadata).find(
    (entry) => entry.value === functionId,
  );

  return positiveMaxItems(selectedFunction?.maxItems);
}

function getBinding(value: unknown, maxItems: number): CapabilityTargetBinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_BINDING;
  }

  const candidate = value as Partial<CapabilityTargetBinding> & {
    source?: unknown;
    objectId?: unknown;
    objectIds?: unknown;
  };

  if (
    candidate.source === "SINGLE_OBJECT" &&
    typeof candidate.objectId === "string"
  ) {
    return {
      mode: "MANUAL",
      cardinality: "ONE",
      expression: candidate.objectId,
    };
  }

  if (
    candidate.source === "OBJECT_SET" &&
    (typeof candidate.objectIds === "string" ||
      Array.isArray(candidate.objectIds))
  ) {
    const objectIds = candidate.objectIds as string | string[];

    return {
      mode: "MANUAL",
      cardinality: "MANY",
      expression: Array.isArray(objectIds)
        ? JSON.stringify(objectIds)
        : objectIds,
    };
  }

  const mode = candidate.mode === "WIDGET" ? "WIDGET" : "MANUAL";
  const cardinality =
    candidate.cardinality === "MANY" && maxItems > 1 ? "MANY" : "ONE";

  return {
    mode,
    ...(typeof candidate.widgetId === "string"
      ? { widgetId: candidate.widgetId }
      : {}),
    cardinality,
    expression:
      typeof candidate.expression === "string" ? candidate.expression : "",
  };
}

function getWidgetCanonicalKey(
  widgetId: string,
  widget: Partial<CapabilityTargetBindingWidget>,
  props: Pick<
    CapabilityTargetBindingControlProps,
    | "tableCanonicalKeys"
    | "tableCanonicalKey"
    | "canonicalKey"
    | "currentPageActions"
    | "ownerObjectTypeId"
    | "primaryKey"
  >,
): string | undefined {
  if (
    isOntologyTargetTableWidgetType(widget.type) &&
    props.currentPageActions !== undefined
  ) {
    if (props.ownerObjectTypeId === undefined) {
      return undefined;
    }

    const provenance = resolveOntologyTableTargetProvenance(
      widget,
      props.currentPageActions,
    );

    return provenance?.objectTypeId === props.ownerObjectTypeId &&
      (!provenance.projection ||
        provenance.projection.includes(props.primaryKey || ""))
      ? props.primaryKey
      : undefined;
  }

  return (
    widget.canonicalKey ||
    widget.ontologyCanonicalKey ||
    props.tableCanonicalKeys?.[widgetId] ||
    props.tableCanonicalKey ||
    props.canonicalKey
  );
}

interface ObjectPropertyDropdownEntry {
  value?: unknown;
  isPrimaryKey?: unknown;
}

function selectedPrimaryKey(metadata: unknown): string | undefined {
  const primaryKey = (
    functionDropdownEntries(metadata) as ObjectPropertyDropdownEntry[]
  ).find(
    (entry) =>
      entry.isPrimaryKey === true &&
      typeof entry.value === "string" &&
      entry.value.trim() !== "",
  )?.value;

  return typeof primaryKey === "string" ? primaryKey : undefined;
}

export function CapabilityTargetBindingControl(
  props: CapabilityTargetBindingControlProps,
): JSX.Element {
  const {
    canonicalKey,
    configProperty,
    currentPageWidgets,
    label,
    maxItems: configuredMaxItems = 1,
    onBindingChange,
    ownerObjectTypeId,
    primaryKey,
    tableCanonicalKey,
    tableCanonicalKeys,
    value: rawValue,
  } = props;
  const maxItems = positiveMaxItems(configuredMaxItems);
  const value = getBinding(rawValue, maxItems);
  const pageWidgets = currentPageWidgets ?? NO_WIDGETS;
  const [isPickingWidget, setIsPickingWidget] = useState(false);
  const displayedMode = isPickingWidget ? "WIDGET" : value.mode;
  const widgets = useMemo(() => {
    return Object.entries(pageWidgets).flatMap(([widgetId, widget]) => {
      if (!widget.type || !widget.widgetName) {
        return [];
      }

      const targetWidget: TargetBindingWidget = {
        widgetId,
        type: widget.type,
        widgetName: widget.widgetName,
      };
      const bindings = buildWidgetTargetBindings(
        targetWidget,
        getWidgetCanonicalKey(widgetId, widget, {
          canonicalKey,
          currentPageActions: props.currentPageActions,
          ownerObjectTypeId,
          primaryKey,
          tableCanonicalKey,
          tableCanonicalKeys,
        }),
        maxItems,
      );

      return bindings.map((binding) => ({ widgetId, widget, binding }));
    });
  }, [
    canonicalKey,
    maxItems,
    ownerObjectTypeId,
    pageWidgets,
    primaryKey,
    props.currentPageActions,
    tableCanonicalKey,
    tableCanonicalKeys,
  ]);

  const incompatibleTables = useMemo(
    () =>
      ownerObjectTypeId
        ? Object.values(pageWidgets).filter(
            (widget) =>
              isOntologyTargetTableWidgetType(widget.type) &&
              typeof widget.ownerObjectTypeId === "string" &&
              widget.ownerObjectTypeId !== ownerObjectTypeId,
          )
        : [],
    [ownerObjectTypeId, pageWidgets],
  );

  const selectedWidget = widgets.find(
    (widget) =>
      widget.widgetId === value.widgetId &&
      widget.binding.cardinality === value.cardinality,
  );
  const isRemovedWidget =
    displayedMode === "WIDGET" &&
    currentPageWidgets !== undefined &&
    Boolean(value.widgetId) &&
    !selectedWidget;

  const updateBinding = useCallback(
    (nextValue: CapabilityTargetBinding) => {
      onBindingChange?.(nextValue);
    },
    [onBindingChange],
  );

  const onModeChange = (nextMode: CapabilityTargetBindingMode) => {
    if (nextMode === "MANUAL") {
      setIsPickingWidget(false);
      updateBinding({
        mode: "MANUAL",
        cardinality: value.cardinality,
        expression: value.expression,
      });

      return;
    }

    if (selectedWidget) {
      setIsPickingWidget(false);
      updateBinding({
        mode: "WIDGET",
        widgetId: selectedWidget.widgetId,
        cardinality: selectedWidget.binding.cardinality,
        expression: selectedWidget.binding.expression,
      });

      return;
    }

    setIsPickingWidget(true);

    return;
  };

  const onWidgetChange = (optionValue: string) => {
    const nextWidget = widgets.find(
      (widget) =>
        `${widget.widgetId}:${widget.binding.cardinality}` === optionValue ||
        (widget.widgetId === optionValue &&
          widgets.filter((candidate) => candidate.widgetId === widget.widgetId)
            .length === 1),
    );

    if (!nextWidget) return;

    setIsPickingWidget(false);

    updateBinding({
      mode: "WIDGET",
      widgetId: nextWidget.widgetId,
      cardinality: nextWidget.binding.cardinality,
      expression: nextWidget.binding.expression,
    });
  };

  const onCardinalityChange = (cardinality: WidgetTargetCardinality) => {
    updateBinding({
      mode: "MANUAL",
      cardinality,
      expression: value.expression,
    });
  };

  useEffect(() => {
    if (value.mode !== "WIDGET" || !value.widgetId || !selectedWidget) {
      return;
    }

    if (
      value.cardinality === selectedWidget.binding.cardinality &&
      value.expression === selectedWidget.binding.expression
    ) {
      return;
    }

    updateBinding({
      mode: "WIDGET",
      widgetId: selectedWidget.widgetId,
      cardinality: selectedWidget.binding.cardinality,
      expression: selectedWidget.binding.expression,
    });
  }, [
    selectedWidget,
    updateBinding,
    value.cardinality,
    value.expression,
    value.mode,
    value.widgetId,
  ]);

  return (
    <TargetControl className={`t--${configProperty} uqi-capability-target`}>
      <label htmlFor={`${configProperty}-mode`}>
        {label || targetMessages.source()}
      </label>
      <select
        aria-label={targetMessages.source()}
        id={`${configProperty}-mode`}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
          onModeChange(event.target.value as CapabilityTargetBindingMode)
        }
        value={displayedMode}
      >
        <option value="WIDGET">{targetMessages.widgetSelection()}</option>
        <option value="MANUAL">{targetMessages.manual()}</option>
      </select>

      {displayedMode === "WIDGET" ? (
        <>
          {incompatibleTables.map((table) => (
            <span key={table.widgetName} role="status">
              {targetMessages.incompatibleOwner(
                table.widgetName || "Table",
                table.ownerObjectTypeId || "",
                ownerObjectTypeId || "",
              )}
            </span>
          ))}
          <label htmlFor={`${configProperty}-widget`}>
            {targetMessages.widget()}
          </label>
          <select
            aria-label={targetMessages.widget()}
            id={`${configProperty}-widget`}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              onWidgetChange(event.target.value)
            }
            value={
              selectedWidget
                ? widgets.filter(
                    (candidate) =>
                      candidate.widgetId === selectedWidget.widgetId,
                  ).length > 1
                  ? `${selectedWidget.widgetId}:${selectedWidget.binding.cardinality}`
                  : selectedWidget.widgetId
                : isRemovedWidget
                  ? value.widgetId
                  : ""
            }
          >
            <option value="">{targetMessages.chooseWidget()}</option>
            {isRemovedWidget && (
              <option disabled value={value.widgetId}>
                {targetMessages.removedWidget(value.widgetId || "")}
              </option>
            )}
            {widgets.map(({ binding, widget, widgetId }) => (
              <option
                key={`${widgetId}-${binding.cardinality}`}
                value={
                  widgets.filter((candidate) => candidate.widgetId === widgetId)
                    .length > 1
                    ? `${widgetId}:${binding.cardinality}`
                    : widgetId
                }
              >
                {widget.widgetName}
                {widgets.filter((candidate) => candidate.widgetId === widgetId)
                  .length > 1
                  ? ` (${binding.cardinality === "ONE" ? targetMessages.one() : targetMessages.many()})`
                  : ""}
              </option>
            ))}
          </select>
          {isRemovedWidget && (
            <span role="status">{targetMessages.widgetUnavailable()}</span>
          )}
        </>
      ) : (
        <>
          {maxItems > 1 && (
            <label htmlFor={`${configProperty}-cardinality`}>
              {targetMessages.cardinality()}
              <select
                aria-label={targetMessages.cardinality()}
                id={`${configProperty}-cardinality`}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  onCardinalityChange(
                    event.target.value as WidgetTargetCardinality,
                  )
                }
                value={value.cardinality}
              >
                <option value="ONE">{targetMessages.one()}</option>
                <option value="MANY">{targetMessages.many()}</option>
              </select>
            </label>
          )}
          <label>
            {targetMessages.expression()}
            <input
              aria-label={targetMessages.expression()}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                updateBinding({
                  mode: "MANUAL",
                  cardinality: value.cardinality,
                  expression: event.target.value,
                })
              }
              value={value.expression}
            />
          </label>
        </>
      )}
    </TargetControl>
  );
}

const mapStateToProps = (
  state: DefaultRootState,
  props: CapabilityTargetBindingControlProps,
) => {
  const valueSelector = formValueSelector(props.formName);
  const targetBindingValue = valueSelector(state, props.configProperty);
  const actionId = valueSelector(state, "id");
  const selectedFunctionId = props.functionMetadataConfigProperty
    ? valueSelector(state, props.functionMetadataConfigProperty)
    : undefined;
  const functionMetadata =
    typeof actionId === "string" && props.functionMetadataConfigProperty
      ? state.evaluations.triggers[actionId]?.[
          props.functionMetadataConfigProperty
        ]?.fetchDynamicValues?.data
      : undefined;
  const objectPropertyMetadata =
    typeof actionId === "string" && props.primaryKeyConfigProperty
      ? state.evaluations?.triggers?.[actionId]?.[
          props.primaryKeyConfigProperty
        ]?.fetchDynamicValues?.data
      : undefined;
  const selectedOwnerObjectTypeId = props.ownerObjectTypeConfigProperty
    ? valueSelector(state, props.ownerObjectTypeConfigProperty)
    : undefined;
  const legacyTargetProperty = props.configProperty.replace(
    "targetBinding.data",
    "target.data",
  );
  const currentPageId = state.entities?.pageList?.currentPageId;
  const currentPageWidgetState = currentPageId
    ? state.ui?.pageWidgets?.[currentPageId]
    : undefined;

  return {
    currentPageWidgets:
      props.currentPageWidgets ??
      (currentPageWidgetState
        ? getCurrentPageWidgets(state)
        : props.currentPageWidgets === undefined && !state.entities?.pageList
          ? getCurrentPageWidgets(state)
          : undefined),
    currentPageActions:
      props.currentPageActions ??
      (state.entities?.pageList ? getCurrentActions(state) : undefined),
    value:
      props.value ??
      targetBindingValue ??
      valueSelector(state, legacyTargetProperty),
    maxItems: props.functionMetadataConfigProperty
      ? selectedFunctionMaxItems(selectedFunctionId, functionMetadata)
      : positiveMaxItems(props.maxItems),
    ownerObjectTypeId:
      props.ownerObjectTypeId ??
      (typeof selectedOwnerObjectTypeId === "string"
        ? selectedOwnerObjectTypeId
        : undefined),
    primaryKey: props.primaryKey ?? selectedPrimaryKey(objectPropertyMetadata),
  };
};

const mapDispatchToProps = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any,
  props: CapabilityTargetBindingControlProps,
) => ({
  onBindingChange: (value: CapabilityTargetBinding) =>
    dispatch(change(props.formName, props.configProperty, value)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CapabilityTargetBindingControl);
