import { all, call, put, select, takeLeading } from "redux-saga/effects";
import type { ReduxAction } from "actions/ReduxActionTypes";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { snipingModeBindToSelector } from "selectors/editorSelectors";
import type { ActionData } from "ee/reducers/entityReducers/actionsReducer";
import { getCanvasWidgets } from "ee/selectors/entitiesSelector";
import {
  batchUpdateWidgetDynamicProperty,
  batchUpdateWidgetProperty,
} from "actions/controlActions";
import AnalyticsUtil from "ee/utils/AnalyticsUtil";

import {
  SNIPING_NOT_SUPPORTED,
  SNIPING_SELECT_WIDGET_AGAIN,
} from "ee/constants/messages";

import WidgetFactory from "WidgetProvider/factory";
import type { CanvasWidgetsReduxState } from "ee/reducers/entityReducers/canvasWidgetsReducer";
import { setSnipingMode } from "actions/propertyPaneActions";
import { selectWidgetInitAction } from "actions/widgetSelectionActions";
import { SelectionRequestType } from "sagas/WidgetSelectUtils";
import { toast } from "@appsmith/ads";
import type { PropertyUpdates } from "WidgetProvider/types";
import type { ModuleInstance } from "ee/constants/ModuleInstanceConstants";
import { getModuleInstanceById } from "ee/selectors/moduleInstanceSelectors";
import { objectKeys } from "@appsmith/utils";
import { getOntologyColumnLabels } from "./ontologyColumnLabels";

const TABLE_WIDGET_TYPES = new Set([
  "TABLE_WIDGET",
  "TABLE_WIDGET_V2",
  "WDS_TABLE_WIDGET",
]);

interface TableColumn {
  alias?: string;
  label?: string;
  originalId?: string;
}

const getDefaultTableColumnLabelUpdates = (
  primaryColumns: Record<string, TableColumn> | undefined,
  columnNameMap: Record<string, string>,
): Record<string, string> => {
  if (!primaryColumns) return {};

  return Object.fromEntries(
    Object.entries(primaryColumns).flatMap(([columnId, column]) => {
      const fieldName = column.originalId || column.alias || columnId;
      const label = columnNameMap[fieldName];

      return label && column.label === fieldName
        ? [[`primaryColumns.${columnId}.label`, label]]
        : [];
    }),
  );
};

export function* bindDataToWidgetSaga(
  action: ReduxAction<{
    widgetId: string;
    bindingQuery?: string;
  }>,
) {
  const queryId: string = yield select(snipingModeBindToSelector);
  const currentAction: ActionData | undefined = yield select((state) =>
    state.entities.actions.find(
      (action: ActionData) => action.config.id === queryId,
    ),
  );
  const currentModuleInstance: ModuleInstance | undefined = yield select(
    getModuleInstanceById,
    queryId,
  );

  const actionName =
    currentAction?.config.name || currentModuleInstance?.name || "";

  const widgetState: CanvasWidgetsReduxState = yield select(getCanvasWidgets);
  const selectedWidget = widgetState[action.payload.widgetId];

  if (!selectedWidget || !selectedWidget.type) {
    toast.show(SNIPING_SELECT_WIDGET_AGAIN(), {
      kind: "warning",
    });

    return;
  }

  const { widgetId } = action.payload;

  let isValidProperty = true;

  // Pranav has an Open PR for this file so just returning for now
  if (!actionName) return;

  const { getSnipingModeUpdates } = WidgetFactory.getWidgetMethods(
    selectedWidget.type,
  );

  let updates: Array<PropertyUpdates> = [];

  const oneClickBindingQuery = `{{${actionName}.data}}`;

  const bindingQuery = action.payload.bindingQuery
    ? `{{${actionName}.${action.payload.bindingQuery}}}`
    : oneClickBindingQuery;
  let isDynamicPropertyPath = true;

  if (
    bindingQuery === oneClickBindingQuery &&
    selectedWidget.type !== "TABLE_WIDGET_V2" &&
    selectedWidget.type !== "SELECT_WIDGET"
  ) {
    isDynamicPropertyPath = false;
  }

  if (getSnipingModeUpdates) {
    updates = getSnipingModeUpdates?.({
      data: bindingQuery,
      run: `{{${actionName}.run()}}`,
      isDynamicPropertyPath,
    });

    AnalyticsUtil.logEvent("WIDGET_SELECTED_VIA_SNIPING_MODE", {
      widgetType: selectedWidget.type,
      actionName: actionName,
      apiId: queryId,
      propertyPath: updates?.map((update) => update.propertyPath).toString(),
      propertyValue: updates?.map((update) => update.propertyPath).toString(),
    });
  } else {
    isValidProperty = false;
  }

  if (queryId && isValidProperty && updates.length > 0) {
    const updatesMap: Record<string, unknown> = updates?.reduce(
      (acc: Record<string, unknown>, update) => {
        acc[update.propertyPath] = update.propertyValue as string;

        return acc;
      },
      {},
    );

    const columnNameMap = getOntologyColumnLabels(currentAction?.data?.headers);

    if (
      TABLE_WIDGET_TYPES.has(selectedWidget.type) &&
      objectKeys(columnNameMap).length > 0
    ) {
      updatesMap.columnNameMap = columnNameMap;
      Object.assign(
        updatesMap,
        getDefaultTableColumnLabelUpdates(
          (selectedWidget as { primaryColumns?: Record<string, TableColumn> })
            .primaryColumns,
          columnNameMap,
        ),
      );
    }

    const batchUpdateArray = updates.map((update) => {
      return {
        propertyPath: update.propertyPath,
        isDynamic: !!update.isDynamicPropertyPath,
        skipValidation: true, // Since we are coming up with the dynamic string, we can skip validation
      };
    });

    // set the property path to dynamic, i.e. enable JS mode
    yield put(batchUpdateWidgetDynamicProperty(widgetId, batchUpdateArray));
    yield put(batchUpdateWidgetProperty(widgetId, { modify: updatesMap }));
    yield call(resetSnipingModeSaga);
    yield put(selectWidgetInitAction(SelectionRequestType.One, [widgetId]));
  } else {
    queryId &&
      toast.show(SNIPING_NOT_SUPPORTED(), {
        kind: "warning",
      });
  }
}

function* resetSnipingModeSaga() {
  yield put(
    setSnipingMode({
      isActive: false,
      bindTo: undefined,
    }),
  );
}

export default function* snipingModeSagas() {
  yield all([
    takeLeading(ReduxActionTypes.BIND_DATA_TO_WIDGET, bindDataToWidgetSaga),
    takeLeading(ReduxActionTypes.RESET_SNIPING_MODE, resetSnipingModeSaga),
  ]);
}
