import "widgets";

import { setEvaluatedTree } from "actions/evaluationActions";
import { APP_MODE } from "entities/App";
import { renderAppsmithCanvas } from "layoutSystems/CanvasFactory";
import { BrowserRouter } from "react-router-dom";
import type { DefaultRootState } from "react-redux";
import { Provider, useSelector } from "react-redux";
import { getCanvasWidgetsStructure } from "ee/selectors/entitiesSelector";
import { getUnevaluatedDataTree } from "selectors/dataTreeSelectors";
import { getCurrentThemeDetails } from "selectors/themeSelectors";
import { render, act, waitFor } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import type { DSLWidget } from "WidgetProvider/types";
import WidgetFactory from "WidgetProvider/factory";
import type { WidgetProps } from "widgets/BaseWidget";
import { RenderModes } from "constants/WidgetConstants";
import EditorContextProvider from "components/editorComponents/EditorContextProvider";
import ConfigTreeActions from "utils/configTree";
import { editorInitializer } from "utils/editor/EditorUtils";
import { diff } from "deep-diff";
import { updateEvalProps } from "workers/Evaluation/helpers";
import DataTreeEvaluator from "workers/common/DataTreeEvaluator";
import { testStore } from "store";
import React, { useEffect } from "react";
import { useMockDsl } from "test/testCommon";
import {
  buildChildren,
  widgetCanvasFactory,
} from "test/factories/WidgetFactoryUtils";
import { ListFactory } from "test/factories/Widgets/ListFactory";
import { ListV2Factory } from "test/factories/Widgets/ListV2Factory";

const SUPPLIER_TYPE_ID = "Supplier";
const TEMPLATE_BUTTON_ID = "SupplierTemplateButton";
const TEMPLATE_BUTTON_NAME = "SupplierTemplateButton";
const TEMPLATE_CANVAS_ID = "SupplierTemplateCanvas";
const TEMPLATE_CONTAINER_ID = "SupplierTemplate";
const LIST_CANVAS_ID = "ListTemplateCanvas";

type ObjectListWidgetType = "LIST_WIDGET" | "LIST_WIDGET_V2";

export interface SupplierObject {
  id: string;
  properties: {
    supplierName: string;
  };
  typeId: typeof SUPPLIER_TYPE_ID;
}

export interface ObjectListPageFixture {
  dsl: DSLWidget;
  initialState: Partial<DefaultRootState>;
  objects: SupplierObject[];
  rows: Array<{
    id: string;
    supplierName: string;
    typeId: typeof SUPPLIER_TYPE_ID;
  }>;
}

interface CreateObjectListPageDslOptions {
  widgetId: string;
  widgetName: string;
  widgetType: ObjectListWidgetType;
}

interface RenderEvaluatedPageDslOptions {
  dsl: DSLWidget;
  initialState: Partial<DefaultRootState>;
  mode?: APP_MODE;
}

const createWidget = (props: Partial<WidgetProps>) => {
  const widgets = buildChildren([props]);

  if (!widgets?.[0]) {
    throw new Error(`Unable to build ${props.type || "widget"} test DSL`);
  }

  return widgets[0];
};

const createTemplateWidgets = () => {
  const templateButton = createWidget({
    bottomRow: 4,
    dynamicBindingPathList: [{ key: "text" }],
    isVisible: true,
    leftColumn: 0,
    parentColumnSpace: 10,
    parentId: TEMPLATE_CANVAS_ID,
    parentRowSpace: 10,
    rightColumn: 20,
    text: "{{currentItem.supplierName}}",
    topRow: 0,
    type: "BUTTON_WIDGET",
    validationPaths: { text: { type: "TEXT" } },
    widgetId: TEMPLATE_BUTTON_ID,
    widgetName: TEMPLATE_BUTTON_NAME,
  });
  const templateCanvas = createWidget({
    bottomRow: 10,
    canExtend: false,
    children: [templateButton],
    detachFromLayout: true,
    dropDisabled: true,
    isVisible: true,
    leftColumn: 0,
    noPad: true,
    openParentPropertyPane: true,
    parentColumnSpace: 1,
    parentId: TEMPLATE_CONTAINER_ID,
    parentRowSpace: 1,
    rightColumn: 64,
    topRow: 0,
    type: "CANVAS_WIDGET",
    widgetId: TEMPLATE_CANVAS_ID,
    widgetName: TEMPLATE_CANVAS_ID,
  });
  const templateContainer = createWidget({
    bottomRow: 10,
    children: [templateCanvas],
    isListItemContainer: true,
    isVisible: true,
    leftColumn: 0,
    parentColumnSpace: 10,
    parentId: LIST_CANVAS_ID,
    parentRowSpace: 10,
    rightColumn: 64,
    topRow: 0,
    type: "CONTAINER_WIDGET",
    widgetId: TEMPLATE_CONTAINER_ID,
    widgetName: TEMPLATE_CONTAINER_ID,
  });
  const listCanvas = createWidget({
    bottomRow: 18,
    canExtend: false,
    children: [templateContainer],
    detachFromLayout: true,
    dropDisabled: true,
    isVisible: true,
    leftColumn: 0,
    noPad: true,
    openParentPropertyPane: true,
    parentColumnSpace: 1,
    parentId: "ListParent",
    parentRowSpace: 1,
    rightColumn: 64,
    topRow: 0,
    type: "CANVAS_WIDGET",
    widgetId: LIST_CANVAS_ID,
    widgetName: LIST_CANVAS_ID,
  });

  return { listCanvas, templateButton };
};

const createListWidget = ({
  widgetId,
  widgetName,
  widgetType,
}: CreateObjectListPageDslOptions) => {
  const { listCanvas, templateButton } = createTemplateWidgets();
  const baseProps = {
    backgroundColor: "transparent",
    bottomRow: 18,
    children: [
      {
        ...listCanvas,
        parentId: widgetId,
      },
    ],
    dataMode: "OBJECT" as const,
    isVisible: true,
    leftColumn: 0,
    listData: [],
    objectTypeId: SUPPLIER_TYPE_ID,
    pageSize: 1,
    parentColumnSpace: 10,
    parentId: "0",
    parentRowSpace: 10,
    rightColumn: 64,
    topRow: 0,
    widgetId,
    widgetName,
  };

  if (widgetType === "LIST_WIDGET") {
    return ListFactory.build({
      ...baseProps,
      dynamicBindingPathList: [
        { key: `template.${TEMPLATE_BUTTON_NAME}.text` },
      ],
      renderMode: RenderModes.PAGE,
      template: {
        [TEMPLATE_BUTTON_NAME]: {
          ...templateButton,
          text: `{{${widgetName}.listData.map((currentItem) => currentItem.supplierName)}}`,
        },
      },
      type: widgetType,
    });
  }

  return ListV2Factory.build({
    ...baseProps,
    currentItemsView: "{{[]}}",
    dynamicBindingPathList: [
      { key: "currentItemsView" },
      { key: "selectedItemView" },
      { key: "triggeredItemView" },
      { key: "primaryKeys" },
    ],
    hasMetaWidgets: true,
    itemSpacing: 8,
    mainCanvasId: LIST_CANVAS_ID,
    mainContainerId: TEMPLATE_CONTAINER_ID,
    pageNo: 1,
    primaryKeys: `{{${widgetName}.listData.map((currentItem) => currentItem.id)}}`,
    renderMode: RenderModes.PAGE,
    requiresFlatWidgetChildren: true,
    selectedItemView: "{{{}}}",
    templateHeight: 100,
    triggeredItemView: "{{{}}}",
    type: widgetType,
  });
};

export const createObjectListPageDsl = ({
  widgetId,
  widgetName,
  widgetType,
}: CreateObjectListPageDslOptions): ObjectListPageFixture => {
  const objects: SupplierObject[] = [
    {
      id: "supplier-acme",
      properties: { supplierName: "Acme" },
      typeId: SUPPLIER_TYPE_ID,
    },
    {
      id: "supplier-globex",
      properties: { supplierName: "Globex" },
      typeId: SUPPLIER_TYPE_ID,
    },
  ];
  const rows = objects.map(({ id, properties, typeId }) => ({
    id,
    supplierName: properties.supplierName,
    typeId,
  }));
  const queryKey = `${widgetId}/${SUPPLIER_TYPE_ID}/${JSON.stringify({
    limit: 100,
    offset: 0,
  })}`;
  const listWidget = createListWidget({ widgetId, widgetName, widgetType });
  const dsl = widgetCanvasFactory.build({
    children: [listWidget],
    renderMode: RenderModes.PAGE,
  }) as unknown as DSLWidget;
  const initialState = {
    celanworksmithObjectQueries: {
      entries: {
        [queryKey]: {
          request: {
            query: { limit: 100, offset: 0 },
            typeId: SUPPLIER_TYPE_ID,
            widgetId,
          },
          result: {
            items: objects,
            limit: 100,
            offset: 0,
            total: objects.length,
            typeId: SUPPLIER_TYPE_ID,
          },
          status: "ready",
        },
      },
    },
    celanworksmithObjects: {
      status: "ready",
      types: {
        [SUPPLIER_TYPE_ID]: {
          items: objects,
          limit: 100,
          metadata: {
            displayName: SUPPLIER_TYPE_ID,
            id: SUPPLIER_TYPE_ID,
            properties: [],
          },
          offset: 0,
          status: "ready",
          total: objects.length,
        },
      },
    },
  } as Partial<DefaultRootState>;

  return { dsl, initialState, objects, rows };
};

interface EvaluatedPageCanvasProps {
  dsl: DSLWidget;
  mode: APP_MODE;
  onDslLoaded: () => void;
}

function EvaluatedPageCanvas({
  dsl,
  mode,
  onDslLoaded,
}: EvaluatedPageCanvasProps) {
  const hasLoaded = useMockDsl(dsl, mode);
  const widgetsStructure = useSelector(getCanvasWidgetsStructure);

  useEffect(() => {
    if (hasLoaded) onDslLoaded();
  }, [hasLoaded, onDslLoaded, widgetsStructure.widgetId]);

  if (!hasLoaded || !widgetsStructure.widgetId) return null;

  return renderAppsmithCanvas(widgetsStructure as WidgetProps);
}

export async function renderEvaluatedPageDsl({
  dsl,
  initialState,
  mode = APP_MODE.PUBLISHED,
}: RenderEvaluatedPageDslOptions) {
  await editorInitializer();
  ConfigTreeActions.setConfigTree({});

  const reduxStore = testStore(initialState);
  const defaultTheme = getCurrentThemeDetails(reduxStore.getState());
  let hasLoadedDsl = false;
  const renderResult = render(
    <BrowserRouter>
      <Provider store={reduxStore}>
        <ThemeProvider theme={defaultTheme}>
          <EditorContextProvider renderMode={RenderModes.PAGE}>
            <EvaluatedPageCanvas
              dsl={dsl}
              mode={mode}
              onDslLoaded={() => {
                hasLoadedDsl = true;
              }}
            />
          </EditorContextProvider>
        </ThemeProvider>
      </Provider>
    </BrowserRouter>,
  );

  await waitFor(
    () => {
      if (!hasLoadedDsl) {
        throw new Error(
          `Page DSL did not load (canvas widgets: ${
            Object.keys(reduxStore.getState().entities.canvasWidgets).length
          })`,
        );
      }
    },
    { timeout: 1_500 },
  );

  const evaluatePage = async () => {
    await act(async () => {
      const { configTree, unEvalTree } = getUnevaluatedDataTree(
        reduxStore.getState(),
      );
      const evaluator = new DataTreeEvaluator(
        WidgetFactory.getWidgetTypeConfigMap(),
      );

      evaluator.setConfigTree(configTree);
      evaluator.setOldUnevalTree(unEvalTree);
      await evaluator.setupFirstTree(
        unEvalTree,
        configTree,
        {},
        {
          appId: "task-5-object-list-page",
          appMode: mode,
          dslVersion: 1,
          instanceId: "task-5-object-list-page",
          pageId: "task-5-object-list-page",
          timestamp: "2026-08-08T00:00:00.000Z",
        },
      );
      evaluator.evalAndValidateFirstTree();

      const evaluatedTree =
        updateEvalProps(evaluator) || evaluator.getEvalTree();
      const updates = diff(
        reduxStore.getState().evaluations.tree,
        evaluatedTree,
      );

      ConfigTreeActions.setConfigTree(configTree);

      if (updates?.length) {
        reduxStore.dispatch(
          setEvaluatedTree(updates as Parameters<typeof setEvaluatedTree>[0]),
        );
      }
    });
  };

  const flushEvaluation = async () => {
    await act(async () => {
      await Promise.resolve();
    });
    await evaluatePage();
    await act(async () => {
      await Promise.resolve();
    });
  };

  await evaluatePage();

  return {
    ...renderResult,
    evaluatePage,
    getEvaluatedWidget: (widgetName: string) =>
      reduxStore.getState().evaluations.tree[widgetName],
    reevaluate: flushEvaluation,
    store: reduxStore,
  };
}
