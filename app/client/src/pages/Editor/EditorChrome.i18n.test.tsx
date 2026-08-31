import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { changeLocale } from "i18n";
import {
  ADD_DATASOURCE_BUTTON,
  CONTEXT_COPY,
  CONTEXT_DELETE,
  CONTEXT_MOVE,
  CONTEXT_RENAME,
  CONTEXT_SHOW_BINDING,
  COPY_ENTITY_TO_APP_MODAL_TITLE,
  DATASOURCE_BLANK_STATE_MESSAGE,
  DEPLOY_MENU_OPTION,
  EDITOR_HEADER,
  EDITOR_RUN_BUTTON,
  EDITOR_HEADER_SAVE_INDICATOR,
  QUERY_CONFIRMATION_MODAL_MESSAGE,
  QUERY_CONFIRMATION_MODAL_TITLE,
  UI_ELEMENT_PANEL_SEARCH_TEXT,
  WIDGET_SIDEBAR_TITLE,
  createMessage,
} from "ee/constants/messages";
import { EditorSaveIndicator } from "./EditorSaveIndicator";
import { NoResponse } from "../../PluginActionEditor/components/PluginActionResponse/components/NoResponse/NoResponse";
import { RequestConfirmationModalWithI18n } from "./RequestConfirmationModal";
import { ModalType } from "../../reducers/uiReducers/modalActionReducer";

describe("editor operational chrome translations", () => {
  afterEach(async () => {
    await changeLocale("zh-CN");
  });

  it("resolves editor entry points and context actions in Chinese", async () => {
    await changeLocale("zh-CN");

    expect(createMessage(WIDGET_SIDEBAR_TITLE)).toBe("组件");
    expect(createMessage(DATASOURCE_BLANK_STATE_MESSAGE)).toBe("暂无数据源");
    expect(createMessage(ADD_DATASOURCE_BUTTON)).toBe("添加数据源");
    expect(createMessage(UI_ELEMENT_PANEL_SEARCH_TEXT)).toBe("搜索组件");
    expect(createMessage(CONTEXT_RENAME)).toBe("重命名");
    expect(createMessage(CONTEXT_SHOW_BINDING)).toBe("显示绑定");
    expect(createMessage(CONTEXT_MOVE)).toBe("移动到页面");
    expect(createMessage(CONTEXT_COPY)).toBe("复制到页面");
    expect(createMessage(CONTEXT_DELETE)).toBe("删除");
    expect(createMessage(COPY_ENTITY_TO_APP_MODAL_TITLE)).toBe("复制到应用");
    expect(createMessage(QUERY_CONFIRMATION_MODAL_TITLE)).toBe("确认对话框");
    expect(createMessage(QUERY_CONFIRMATION_MODAL_MESSAGE)).toBe("确定要运行 ");
    expect(createMessage(EDITOR_RUN_BUTTON)).toBe("运行");
    expect(createMessage(DEPLOY_MENU_OPTION)).toBe("发布");
  });

  it("renders save status text in both locales", async () => {
    await changeLocale("zh-CN");
    const { rerender } = render(
      <EditorSaveIndicator isSaving saveError={false} />,
    );

    expect(screen.getByText("保存中")).toBeInTheDocument();

    await changeLocale("en-US");

    rerender(<EditorSaveIndicator isSaving={false} saveError />);
    expect(screen.getByText("Save failed")).toBeInTheDocument();
    expect(createMessage(EDITOR_HEADER_SAVE_INDICATOR)).toBe("Saved");
    expect(createMessage(EDITOR_HEADER.saving)).toBe("Saving");
  });

  it("renders the query run command in both locales", async () => {
    await changeLocale("zh-CN");
    const { rerender } = render(
      <NoResponse
        isRunDisabled={false}
        isRunning={false}
        onRunClick={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "运行" })).toBeInTheDocument();

    await changeLocale("en-US");
    rerender(
      <NoResponse
        isRunDisabled={false}
        isRunning={false}
        onRunClick={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
  });

  it("updates an open request confirmation modal when locale changes", async () => {
    await changeLocale("zh-CN");
    const modal = {
      name: "GetUsers",
      modalOpen: true,
      modalType: ModalType.RUN_ACTION,
    };
    const dispatch = jest.fn();

    render(
      <RequestConfirmationModalWithI18n dispatch={dispatch} modals={[modal]} />,
    );
    expect(screen.getByText("确认对话框")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "否" })).toBeInTheDocument();

    await changeLocale("en-US");
    expect(screen.getByText("Confirmation dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });
});
