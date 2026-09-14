import type { ModuleInstance } from "ee/constants/ModuleInstanceConstants";
import { keyBy } from "lodash";
import { testStore } from "store";
import { PostgresFactory } from "test/factories/Actions/Postgres";
import type { Saga } from "redux-saga";
import { runSaga } from "redux-saga";
import { bindDataToWidgetSaga } from "./SnipingModeSagas";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import { getModuleInstanceById } from "ee/selectors/moduleInstanceSelectors";
import WidgetFactory from "WidgetProvider/factory";
import TableWidget from "widgets/TableWidget/widget";
import TableWidgetV2 from "widgets/TableWidgetV2/widget";
import { InputFactory } from "test/factories/Widgets/InputFactory";

jest.mock("ee/selectors/moduleInstanceSelectors", () => ({
  ...jest.requireActual("ee/selectors/moduleInstanceSelectors"),
  getModuleInstanceById: jest.fn(),
}));

describe("SnipingModeSaga", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("should check for moduleInstance and use when action is missing", async () => {
    const widget = InputFactory.build();
    const action = PostgresFactory.build();
    const moduleInstance = {
      id: "module-instance-id",
      name: "ModuleInstance1",
    } as ModuleInstance;

    (getModuleInstanceById as jest.Mock).mockReturnValue(moduleInstance);
    const spy = jest
      .spyOn(WidgetFactory, "getWidgetMethods")
      .mockImplementation(TableWidget.getMethods);

    const store = testStore({
      entities: {
        // TODO: Fix this the next time the file is edited
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({} as any),
        actions: [
          {
            config: action,
          },
        ],
        canvasWidgets: keyBy([widget], "widgetId"),
      },
      ui: {
        // TODO: Fix this the next time the file is edited
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({} as any),
        editor: {
          snipModeBindTo: "module-instance-id",
        },
      },
    });
    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatched: any[] = [];

    await runSaga(
      {
        dispatch: (action) => dispatched.push(action),
        getState: () => store.getState(),
      },
      bindDataToWidgetSaga as Saga,
      { payload: { widgetId: widget.widgetId, bindingQuery: "data" } },
    ).toPromise();

    expect(dispatched).toEqual([
      {
        payload: {
          updates: [
            {
              isDynamic: true,
              propertyPath: "tableData",
              skipValidation: true,
            },
          ],
          widgetId: widget.widgetId,
        },
        type: ReduxActionTypes.BATCH_SET_WIDGET_DYNAMIC_PROPERTY,
      },
      {
        payload: {
          shouldReplay: true,
          updates: { modify: { tableData: `{{${moduleInstance.name}.data}}` } },
          widgetId: widget.widgetId,
        },
        type: ReduxActionTypes.BATCH_UPDATE_WIDGET_PROPERTY,
      },
      {
        payload: { bindTo: undefined, isActive: false },
        type: ReduxActionTypes.SET_SNIPING_MODE,
      },
      {
        payload: {
          invokedBy: undefined,
          pageId: undefined,
          payload: [widget.widgetId],
          selectionRequestType: "One",
        },
        type: ReduxActionTypes.SELECT_WIDGET_INIT,
      },
    ]);

    spy.mockRestore();
  });

  it("preserves ontology field labels when binding a query result to a table", async () => {
    const widget = {
      primaryColumns: {
        customer_name: {
          label: "customer_name",
          originalId: "customer_name",
        },
      },
      type: "TABLE_WIDGET_V2",
      widgetId: "table-1",
    };
    const action = PostgresFactory.build({ id: "query-1", name: "Query1" });
    const store = testStore({
      entities: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({} as any),
        actions: [
          {
            config: action,
            data: {
              customer_name: "沧澜工坊",
              headers: {
                "X-CELANWORKSHOP-COLUMN-LABELS": [
                  '{"customer_name":"客户名称"}',
                ],
              },
            },
          },
        ],
        canvasWidgets: { [widget.widgetId]: widget },
      },
      ui: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({} as any),
        editor: { snipModeBindTo: action.id },
      },
    });
    const dispatched: unknown[] = [];
    const spy = jest
      .spyOn(WidgetFactory, "getWidgetMethods")
      .mockImplementation(TableWidgetV2.getMethods);

    await runSaga(
      {
        dispatch: (dispatchedAction) => dispatched.push(dispatchedAction),
        getState: () => store.getState(),
      },
      bindDataToWidgetSaga as Saga,
      { payload: { widgetId: widget.widgetId } },
    ).toPromise();

    expect(dispatched).toContainEqual({
      payload: {
        shouldReplay: true,
        updates: {
          modify: {
            columnNameMap: { customer_name: "客户名称" },
            "primaryColumns.customer_name.label": "客户名称",
            tableData: "{{Query1.data}}",
          },
        },
        widgetId: widget.widgetId,
      },
      type: ReduxActionTypes.BATCH_UPDATE_WIDGET_PROPERTY,
    });

    spy.mockRestore();
  });
});
