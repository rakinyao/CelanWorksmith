import type { DefaultRootState } from "react-redux";
import type { CanvasWidgetsReduxState } from "ee/reducers/entityReducers/canvasWidgetsReducer";
import type { VariableDefinition } from "celanworksmith/variables/types";

export const CELANWORKSMITH_VARIABLES_PROPERTY =
  "celanworksmithVariables" as const;

interface VariableDefinitionsWidget {
  widgetId: string;
  type?: string;
  celanworksmithVariables?: unknown;
}

const getRootWidget = (
  widgets: CanvasWidgetsReduxState,
): VariableDefinitionsWidget | undefined =>
  Object.values(widgets).find(
    (widget) => widget.type === "CANVAS_WIDGET" && !widget.parentId,
  ) as VariableDefinitionsWidget | undefined;

export const getCelanworksmithVariableRootWidgetId = (
  widgets: CanvasWidgetsReduxState,
): string | undefined => getRootWidget(widgets)?.widgetId;

export const getCelanworksmithVariableDefinitionsFromWidgets = (
  widgets: CanvasWidgetsReduxState,
): VariableDefinition[] => {
  const value = getRootWidget(widgets)?.celanworksmithVariables;

  return Array.isArray(value) ? (value as VariableDefinition[]) : [];
};

export const getCelanworksmithVariableDefinitions = (
  state: DefaultRootState,
): VariableDefinition[] =>
  getCelanworksmithVariableDefinitionsFromWidgets(
    state.entities?.canvasWidgets || {},
  );

export const getCelanworksmithVariableRootWidgetIdFromState = (
  state: DefaultRootState,
): string | undefined =>
  getCelanworksmithVariableRootWidgetId(state.entities?.canvasWidgets || {});
