import GlobalHotKeys from "pages/Editor/GlobalHotKeys";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import * as utilities from "selectors/editorSelectors";
import * as useCanvasWidthAutoResize from "pages/hooks";

import * as useCanvasDraggingHook from "layoutSystems/fixedlayout/editor/FixedLayoutCanvasArenas/hooks/useCanvasDragging";
import store from "store";
import {
  buildChildren,
  widgetCanvasFactory,
} from "test/factories/WidgetFactoryUtils";
import { sagasToRunForTests } from "test/sagas";
import { MockApplication } from "test/testCommon";
import { UpdateAppViewer, UpdatedEditor } from "test/testMockedWidgets";
import { render, waitFor } from "test/testUtils";
import { generateReactKey } from "widgets/WidgetUtils";
import i18n from "i18n";
import ContainerWidget from ".";

const pageId = "0123456789abcdef00000000";

describe("ContainerWidget tests", () => {
  const mockGetIsFetchingPage = jest.spyOn(utilities, "getIsFetchingPage");

  jest
    .spyOn(useCanvasWidthAutoResize, "useCanvasWidthAutoResize")
    .mockImplementation(() => true);

  const pushState = jest.spyOn(window.history, "pushState");

  afterEach(async () => {
    await i18n.changeLanguage("en-US");
  });

  it("localizes the Container property pane while preserving technical values", async () => {
    await i18n.changeLanguage("zh-CN");

    const contentConfig = ContainerWidget.getPropertyPaneContentConfig();
    const styleConfig = ContainerWidget.getPropertyPaneStyleConfig();
    const contentSection = contentConfig.find(
      (section) => section.sectionName === "常规",
    );
    const styleSection = styleConfig.find(
      (section) => section.sectionName === "颜色",
    );
    const scrollContents = contentSection?.children?.find(
      (child) => child.propertyName === "shouldScrollContents",
    );
    const backgroundColor = styleSection?.children?.find(
      (child) => child.propertyName === "backgroundColor",
    );

    expect(contentSection).toBeDefined();
    expect(scrollContents?.label).toBe("滚动内容");
    expect(scrollContents?.propertyName).toBe("shouldScrollContents");
    expect(styleSection).toBeDefined();
    expect(backgroundColor?.label).toBe("背景颜色");
    expect(backgroundColor?.propertyName).toBe("backgroundColor");
    expect(backgroundColor?.placeholderText).toBe(
      "#FFFFFF / Gray / rgb(255, 99, 71)",
    );

    await i18n.changeLanguage("en-US");
    expect(ContainerWidget.getPropertyPaneContentConfig()[0].sectionName).toBe(
      "General",
    );
  });

  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pushState.mockImplementation((state: any, title: any, url: any) => {
    window.document.title = title;
    window.location.pathname = url;
  });
  it("Container widget should not invoke dragging and selection features in View mode", async () => {
    const containerId = generateReactKey();
    const canvasId = generateReactKey();
    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any = buildChildren([
      {
        type: "CHECKBOX_WIDGET",
        parentId: canvasId,
      },
      {
        type: "SWITCH_WIDGET",
        parentId: canvasId,
      },
      {
        type: "BUTTON_WIDGET",
        parentId: canvasId,
      },
    ]);
    const canvasWidget = buildChildren([
      {
        type: "CANVAS_WIDGET",
        parentId: containerId,
        children,
        widgetId: canvasId,
      },
    ]);
    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const containerChildren: any = buildChildren([
      {
        type: "CONTAINER_WIDGET",
        children: canvasWidget,
        widgetId: containerId,
        parentId: "0",
      },
    ]);
    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dsl: any = widgetCanvasFactory.build({
      children: containerChildren,
    });

    mockGetIsFetchingPage.mockImplementation(() => false);
    const spyUseCanvasDragging = jest
      .spyOn(useCanvasDraggingHook, "useCanvasDragging")
      .mockImplementation(() => ({
        showCanvas: true,
      }));
    const appState = store.getState();

    render(
      <MemoryRouter
        initialEntries={[`/app/applicationSlug/pageSlug-${pageId}/`]}
      >
        <MockApplication>
          <GlobalHotKeys>
            <UpdateAppViewer dsl={dsl} />
          </GlobalHotKeys>
        </MockApplication>
      </MemoryRouter>,
      { initialState: appState, sagasToRun: sagasToRunForTests },
    );

    expect(spyUseCanvasDragging).not.toHaveBeenCalled();
    render(
      <MemoryRouter
        initialEntries={[`/app/applicationSlug/pageSlug-${pageId}/edit`]}
      >
        <MockApplication>
          <GlobalHotKeys>
            <UpdatedEditor dsl={dsl} />
          </GlobalHotKeys>
        </MockApplication>
      </MemoryRouter>,
      { initialState: appState, sagasToRun: sagasToRunForTests },
    );
    await waitFor(() => {
      expect(spyUseCanvasDragging).toHaveBeenCalled();
    });
  });
});
