import i18n, { changeLocale } from "i18n";
import {
  APPLICATION_NAME_UPDATE,
  APPSMITH_HTTP_ERROR_413,
  CREATE_NEW_APPLICATION,
  DELETE_CONFIRMATION_MODAL_TITLE,
  EXECUTE_A_QUERY,
  FIELD_REQUIRED_ERROR,
  NEW_APPLICATION,
  NO_APPS_FOUND,
  NO_WORKSPACE_HEADING,
  SEARCH_APPS,
  WIDGET_SIDEBAR_TITLE,
  createMessage,
} from "./messages";

describe("core compatibility messages", () => {
  afterEach(async () => {
    await changeLocale("en-US");
  });

  it("resolves core compatibility exports in English", async () => {
    await changeLocale("en-US");

    expect(createMessage(NEW_APPLICATION)).toBe("New application");
    expect(createMessage(CREATE_NEW_APPLICATION)).toBe("Create new");
    expect(createMessage(SEARCH_APPS)).toBe("Search for apps...");
    expect(createMessage(NO_APPS_FOUND)).toBe(
      "Whale! Whale! This name doesn't ring a bell!",
    );
    expect(createMessage(NO_WORKSPACE_HEADING)).toBe(
      "Oops! No workspace found",
    );
    expect(i18n.t("workspace.logoAlt", { name: "Design" })).toBe("Design logo");
    expect(createMessage(WIDGET_SIDEBAR_TITLE)).toBe("Widgets");
    expect(createMessage(EXECUTE_A_QUERY)).toBe("Execute a query");
    expect(createMessage(DELETE_CONFIRMATION_MODAL_TITLE)).toBe(
      "Are you sure?",
    );
    expect(createMessage(APPLICATION_NAME_UPDATE)).toBe(
      "Application name updated",
    );
    expect(createMessage(FIELD_REQUIRED_ERROR)).toBe("This field is required");
  });

  it("resolves core compatibility exports in Simplified Chinese", async () => {
    await changeLocale("zh-CN");

    expect(createMessage(NEW_APPLICATION)).toBe("新建应用");
    expect(createMessage(CREATE_NEW_APPLICATION)).toBe("新建");
    expect(createMessage(SEARCH_APPS)).toBe("搜索应用...");
    expect(createMessage(NO_APPS_FOUND)).toBe("哎呀！没有找到这个名称！");
    expect(createMessage(NO_WORKSPACE_HEADING)).toBe("糟糕！未找到工作区");
    expect(i18n.t("workspace.logoAlt", { name: "设计" })).toBe("设计 标志");
    expect(createMessage(WIDGET_SIDEBAR_TITLE)).toBe("组件");
    expect(createMessage(EXECUTE_A_QUERY)).toBe("执行查询");
    expect(createMessage(DELETE_CONFIRMATION_MODAL_TITLE)).toBe("确定吗？");
    expect(createMessage(APPLICATION_NAME_UPDATE)).toBe("应用名称已更新");
    expect(createMessage(FIELD_REQUIRED_ERROR)).toBe("此字段为必填项");
  });

  it("keeps technical compatibility values unchanged", () => {
    expect(APPSMITH_HTTP_ERROR_413()).toBe("413 CONTENT_TOO_LARGE");
    expect(i18n.t("common.yes", { lng: "zh-CN" })).toBe("是");
  });
});
