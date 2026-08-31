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
  EDITOR_HEADER,
  EDITOR_HEADER_SAVE_INDICATOR,
  QUERY_CONFIRMATION_MODAL_MESSAGE,
  QUERY_CONFIRMATION_MODAL_TITLE,
  UI_ELEMENT_PANEL_SEARCH_TEXT,
  WIDGET_SIDEBAR_TITLE,
  createMessage,
} from "ee/constants/messages";
import { EditorSaveIndicator } from "./EditorSaveIndicator";

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
});
