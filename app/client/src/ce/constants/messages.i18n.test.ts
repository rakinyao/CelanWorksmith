import i18n, { changeLocale } from "i18n";
import {
  APPLICATION_NAME_UPDATE,
  APPSMITH_HTTP_ERROR_413,
  CONNECT_A_DATASOURCE_HEADING,
  CONNECT_A_DATASOURCE_SUBHEADING,
  CREATE_NEW_API_SECTION_HEADER,
  CREATE_NEW_APPLICATION,
  CREATE_NEW_AI_SECTION_HEADER,
  CREATE_NEW_DATASOURCE_DATABASE_HEADER,
  CREATE_NEW_DATASOURCE_MOST_POPULAR_HEADER,
  CREATE_NEW_SAAS_SECTION_HEADER,
  DELETE_CONFIRMATION_MODAL_TITLE,
  EDIT,
  EXECUTE_A_QUERY,
  FIELD_REQUIRED_ERROR,
  HEADER_TITLES,
  EDITOR_HEADER,
  NEW_APPLICATION,
  NEW_QUERY_BUTTON_TEXT,
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
    expect(createMessage(HEADER_TITLES.DATA)).toBe("Data");
    expect(createMessage(NEW_QUERY_BUTTON_TEXT)).toBe("New query");
    expect(createMessage(EDIT)).toBe("Edit");
    expect(createMessage(CONNECT_A_DATASOURCE_HEADING)).toBe(
      "Connect a datasource",
    );
    expect(createMessage(CONNECT_A_DATASOURCE_SUBHEADING)).toBe(
      "Select a sample datasource or connect your own",
    );
    expect(createMessage(CREATE_NEW_DATASOURCE_MOST_POPULAR_HEADER)).toBe(
      "Most Popular",
    );
    expect(createMessage(CREATE_NEW_API_SECTION_HEADER)).toBe("APIs");
    expect(createMessage(CREATE_NEW_AI_SECTION_HEADER)).toBe("AI Integrations");
    expect(createMessage(CREATE_NEW_DATASOURCE_DATABASE_HEADER)).toBe(
      "Databases",
    );
    expect(createMessage(CREATE_NEW_SAAS_SECTION_HEADER)).toBe(
      "SaaS Integrations",
    );
    expect(i18n.t("profile.accountDescription")).toBe(
      "Set your profile and git settings",
    );
    expect(i18n.t("profile.section")).toBe("Profile");
    expect(i18n.t("profile.uploadDisplayPicture")).toBe(
      "Upload display picture",
    );
    expect(createMessage(EDITOR_HEADER.previewTooltip.text)).toBe("Preview");
    expect(i18n.t("application.menu.rename")).toBe("Rename");
    expect(i18n.t("application.menu.fork")).toBe("Fork application");
    expect(i18n.t("application.menu.export")).toBe("Export application");
    expect(i18n.t("application.menu.delete")).toBe("Delete application");
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
    expect(createMessage(HEADER_TITLES.DATA)).toBe("数据");
    expect(createMessage(NEW_QUERY_BUTTON_TEXT)).toBe("新建查询");
    expect(createMessage(EDIT)).toBe("编辑");
    expect(createMessage(CONNECT_A_DATASOURCE_HEADING)).toBe("连接数据源");
    expect(createMessage(CONNECT_A_DATASOURCE_SUBHEADING)).toBe(
      "选择示例数据源或连接你自己的数据源",
    );
    expect(createMessage(CREATE_NEW_DATASOURCE_MOST_POPULAR_HEADER)).toBe(
      "最受欢迎",
    );
    expect(createMessage(CREATE_NEW_API_SECTION_HEADER)).toBe("API");
    expect(createMessage(CREATE_NEW_AI_SECTION_HEADER)).toBe("AI 集成");
    expect(createMessage(CREATE_NEW_DATASOURCE_DATABASE_HEADER)).toBe("数据库");
    expect(createMessage(CREATE_NEW_SAAS_SECTION_HEADER)).toBe("SaaS 集成");
    expect(i18n.t("profile.accountDescription")).toBe(
      "设置你的个人资料和 Git 设置",
    );
    expect(i18n.t("profile.section")).toBe("个人资料");
    expect(i18n.t("profile.uploadDisplayPicture")).toBe("上传头像");
    expect(createMessage(EDITOR_HEADER.previewTooltip.text)).toBe("预览");
    expect(i18n.t("application.menu.rename")).toBe("重命名");
    expect(i18n.t("application.menu.fork")).toBe("复制应用");
    expect(i18n.t("application.menu.export")).toBe("导出应用");
    expect(i18n.t("application.menu.delete")).toBe("删除应用");
  });

  it("keeps technical compatibility values unchanged", () => {
    expect(APPSMITH_HTTP_ERROR_413()).toBe("413 CONTENT_TOO_LARGE");
    expect(i18n.t("common.yes", { lng: "zh-CN" })).toBe("是");
  });
});
