import React, { useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { change, formValueSelector } from "redux-form";
import { getCurrentPageWidgets } from "ee/selectors/entitiesSelector";
import i18n from "i18n";
import type { ControlProps } from "./BaseControl";
import {
  buildWidgetTargetBinding,
  type TargetBindingWidget,
  type WidgetTargetCardinality,
} from "PluginActionEditor/components/CapabilityTargetBinding/ontologyTargetWidgetAdapters";

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
}

export interface CapabilityTargetBindingControlProps
  extends Omit<ControlProps, "controlType"> {
  controlType?: ControlProps["controlType"] | "ONTOLOGY_CAPABILITY_TARGET";
  canonicalKey?: string;
  tableCanonicalKey?: string;
  tableCanonicalKeys?: Record<string, string>;
  maxItems?: number;
  currentPageWidgets?: Record<string, Partial<CapabilityTargetBindingWidget>>;
  value?: CapabilityTargetBinding;
  onBindingChange?: (value: CapabilityTargetBinding) => void;
}

const DEFAULT_BINDING: CapabilityTargetBinding = {
  mode: "MANUAL",
  cardinality: "ONE",
  expression: "",
};

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
  expression: () =>
    i18n.t("ontologyCapabilityTarget.expression", {
      defaultValue: "Target expression",
    }),
};

function getBinding(value: unknown): CapabilityTargetBinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_BINDING;
  }

  const candidate = value as Partial<CapabilityTargetBinding>;
  const mode = candidate.mode === "WIDGET" ? "WIDGET" : "MANUAL";
  const cardinality = candidate.cardinality === "MANY" ? "MANY" : "ONE";

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
    "tableCanonicalKeys" | "tableCanonicalKey" | "canonicalKey"
  >,
): string | undefined {
  return (
    widget.canonicalKey ||
    widget.ontologyCanonicalKey ||
    props.tableCanonicalKeys?.[widgetId] ||
    props.tableCanonicalKey ||
    props.canonicalKey ||
    widget.primaryColumnId
  );
}

export function CapabilityTargetBindingControl(
  props: CapabilityTargetBindingControlProps,
): JSX.Element {
  const {
    canonicalKey,
    configProperty,
    currentPageWidgets = {},
    label,
    maxItems = 1,
    onBindingChange,
    tableCanonicalKey,
    tableCanonicalKeys,
    value: rawValue,
  } = props;
  const value = getBinding(rawValue);
  const [isPickingWidget, setIsPickingWidget] = useState(false);
  const displayedMode = isPickingWidget ? "WIDGET" : value.mode;
  const widgets = useMemo(() => {
    return Object.entries(currentPageWidgets).flatMap(([widgetId, widget]) => {
      if (!widget.type || !widget.widgetName) {
        return [];
      }

      const targetWidget: TargetBindingWidget = {
        widgetId,
        type: widget.type,
        widgetName: widget.widgetName,
      };
      const binding = buildWidgetTargetBinding(
        targetWidget,
        getWidgetCanonicalKey(widgetId, widget, {
          canonicalKey,
          tableCanonicalKey,
          tableCanonicalKeys,
        }),
        maxItems,
      );

      return binding ? [{ widgetId, widget, binding }] : [];
    });
  }, [
    canonicalKey,
    currentPageWidgets,
    maxItems,
    tableCanonicalKey,
    tableCanonicalKeys,
  ]);

  const selectedWidget = widgets.find(
    (widget) => widget.widgetId === value.widgetId,
  );
  const isRemovedWidget =
    displayedMode === "WIDGET" && Boolean(value.widgetId) && !selectedWidget;

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

  const onWidgetChange = (widgetId: string) => {
    const nextWidget = widgets.find((widget) => widget.widgetId === widgetId);

    if (!nextWidget) return;

    setIsPickingWidget(false);

    updateBinding({
      mode: "WIDGET",
      widgetId: nextWidget.widgetId,
      cardinality: nextWidget.binding.cardinality,
      expression: nextWidget.binding.expression,
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
    <div className={`t--${configProperty} uqi-capability-target`}>
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
              selectedWidget?.widgetId ||
              (isRemovedWidget ? value.widgetId : "")
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
                value={widgetId}
              >
                {widget.widgetName}
              </option>
            ))}
          </select>
          {isRemovedWidget && (
            <span role="status">{targetMessages.widgetUnavailable()}</span>
          )}
        </>
      ) : (
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
      )}
    </div>
  );
}

const mapStateToProps = (
  state: DefaultRootState,
  props: CapabilityTargetBindingControlProps,
) => {
  const valueSelector = formValueSelector(props.formName);

  return {
    currentPageWidgets:
      props.currentPageWidgets || getCurrentPageWidgets(state),
    value: props.value || valueSelector(state, props.configProperty),
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
