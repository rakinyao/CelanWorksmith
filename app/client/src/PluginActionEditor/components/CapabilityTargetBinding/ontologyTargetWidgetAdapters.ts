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
) => WidgetTargetBinding[];

function tableProperty(canonicalKey: string): string {
  return `[${JSON.stringify(canonicalKey)}]`;
}

const widgetTargetAdapters: Record<string, WidgetTargetAdapter> = {
  TABLE_WIDGET: (widget, canonicalKey, maxItems) => {
    if (!canonicalKey) {
      return [];
    }

    const property = tableProperty(canonicalKey);
    const bindings: WidgetTargetBinding[] = [
      {
        widgetId: widget.widgetId,
        cardinality: "ONE",
        expression: `{{${widget.widgetName}.selectedRow${property}}}`,
      },
    ];

    if (maxItems > 1) {
      bindings.push({
        widgetId: widget.widgetId,
        cardinality: "MANY",
        expression: `{{${widget.widgetName}.selectedRows.map((row) => row${property})}}`,
      });
    }

    return bindings;
  },
  SELECT_WIDGET: (widget) => {
    return [
      {
        widgetId: widget.widgetId,
        cardinality: "ONE",
        expression: `{{${widget.widgetName}.selectedOptionValue}}`,
      },
    ];
  },
  MULTI_SELECT_WIDGET: (widget, _canonicalKey, maxItems) => {
    if (maxItems <= 1) {
      return [];
    }

    return [
      {
        widgetId: widget.widgetId,
        cardinality: "MANY",
        expression: `{{${widget.widgetName}.selectedOptionValues}}`,
      },
    ];
  },
};

export function buildWidgetTargetBindings(
  widget: TargetBindingWidget,
  canonicalKey: string | undefined,
  maxItems: number,
): WidgetTargetBinding[] {
  if (!Number.isFinite(maxItems) || maxItems <= 0) {
    return [];
  }

  return (
    widgetTargetAdapters[widget.type]?.(widget, canonicalKey, maxItems) ?? []
  );
}

export function buildWidgetTargetBinding(
  widget: TargetBindingWidget,
  canonicalKey: string | undefined,
  maxItems: number,
  cardinality?: WidgetTargetCardinality,
): WidgetTargetBinding | undefined {
  const bindings = buildWidgetTargetBindings(widget, canonicalKey, maxItems);

  return (
    bindings.find(
      (binding) =>
        binding.cardinality ===
        (cardinality ?? (maxItems > 1 ? "MANY" : "ONE")),
    ) ?? bindings[0]
  );
}
