export type WidgetTargetCardinality = "ONE" | "MANY";

export interface WidgetTargetBinding {
  widgetId: string;
  cardinality: WidgetTargetCardinality;
  expression: string;
}

export interface TargetBindingWidget {
  widgetId: string;
  type: string;
  widgetName: string;
}

type WidgetTargetAdapter = (
  widget: TargetBindingWidget,
  canonicalKey: string | undefined,
  maxItems: number,
) => WidgetTargetBinding | undefined;

const widgetTargetAdapters: Record<string, WidgetTargetAdapter> = {
  TABLE_WIDGET: (widget, canonicalKey, maxItems) => {
    if (!canonicalKey) {
      return undefined;
    }

    if (maxItems > 1) {
      return {
        widgetId: widget.widgetId,
        cardinality: "MANY",
        expression: `{{${widget.widgetName}.selectedRows.map((row) => row.${canonicalKey})}}`,
      };
    }

    return {
      widgetId: widget.widgetId,
      cardinality: "ONE",
      expression: `{{${widget.widgetName}.selectedRow.${canonicalKey}}}`,
    };
  },
  SELECT_WIDGET: (widget) => {
    return {
      widgetId: widget.widgetId,
      cardinality: "ONE",
      expression: `{{${widget.widgetName}.selectedOptionValue}}`,
    };
  },
  MULTI_SELECT_WIDGET: (widget, _canonicalKey, maxItems) => {
    if (maxItems <= 1) {
      return undefined;
    }

    return {
      widgetId: widget.widgetId,
      cardinality: "MANY",
      expression: `{{${widget.widgetName}.selectedOptionValues}}`,
    };
  },
};

export function buildWidgetTargetBinding(
  widget: TargetBindingWidget,
  canonicalKey: string | undefined,
  maxItems: number,
): WidgetTargetBinding | undefined {
  if (!Number.isFinite(maxItems) || maxItems <= 0) {
    return undefined;
  }

  return widgetTargetAdapters[widget.type]?.(widget, canonicalKey, maxItems);
}
