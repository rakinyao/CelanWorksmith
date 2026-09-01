import type { Locator, Page } from "@playwright/test";
import { createApp, createWorkspace, deleteWorkspace } from "../../helpers/api";
import { expect, test as base } from "../../fixtures";

const workflowWorkspaceName = "i18n-workflow-workspace";
const workflowAppName = "i18n-workflow-app";

const test = base.extend({
  workspace: async ({ api }, use) => {
    const workspace = await createWorkspace(api, workflowWorkspaceName);

    await use(workspace);
    await deleteWorkspace(api, workspace.id).catch(() => {});
  },
  app: async ({ api, workspace }, use) => {
    const app = await createApp(api, workspace.id, workflowAppName);

    await use(app);
  },
});

const locales = [
  {
    id: "zh-CN",
    workspace: {
      create: "新建",
      newApplication: "新建应用",
    },
    application: {
      delete: "删除",
      export: "导出",
      fork: "复制应用",
    },
    editor: {
      datasourceBlankCta: "导入你的数据",
      dataPaneTitle: "工作区中的数据源",
      deploy: "发布",
      queries: "查询",
      run: "运行",
      save: "保存",
      saveUrl: "保存 URL",
      saved: "已保存",
    },
    profile: {
      edit: "编辑资料",
      language: "语言",
    },
    dialog: {
      invitePrefix: "邀请用户加入 ",
      share: "分享",
    },
    search: {
      noResults: "未找到结果",
      placeholder: "搜索组件、查询或新建内容",
    },
  },
  {
    id: "en-US",
    workspace: {
      create: "Create new",
      newApplication: "New application",
    },
    application: {
      delete: "Delete",
      export: "Export",
      fork: "Fork app",
    },
    editor: {
      datasourceBlankCta: "Bring your data",
      dataPaneTitle: "Datasources in your workspace",
      deploy: "Deploy",
      queries: "Queries",
      run: "Run",
      save: "Save",
      saveUrl: "Save URL",
      saved: "Saved",
    },
    profile: {
      edit: "Edit profile",
      language: "Language",
    },
    dialog: {
      invitePrefix: "Invite users to ",
      share: "Share",
    },
    search: {
      noResults: "No results found",
      placeholder: "Search widgets, queries or create new",
    },
  },
] as const;

type LocaleCase = (typeof locales)[number];

async function expectLocale(page: Page, locale: LocaleCase["id"]) {
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}

async function selectLocale(
  page: Page,
  workspaceId: string,
  locale: LocaleCase["id"],
) {
  // Set locale through the authenticated profile so LocaleSync and the next
  // navigation use the same persisted value.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/applications?workspaceId=${workspaceId}`);
  await page.locator(".t--profile-menu-icon").first().click();

  const languageControl = page.getByRole("combobox").first();
  await expect(languageControl).toBeVisible();

  if ((await languageControl.inputValue()) !== locale) {
    const userUpdate = page.waitForResponse((response) => {
      return (
        response.request().method() === "PUT" &&
        /\/api\/v1\/users\/?$/.test(response.url())
      );
    });

    await languageControl.selectOption(locale);
    await expect((await userUpdate).ok()).toBe(true);
    await page.reload();
  }

  await expectLocale(page, locale);
  await page.keyboard.press("Escape");
}

async function captureViewports(
  page: Page,
  workflow: string,
  locale: LocaleCase["id"],
  masks: Locator[] = [],
) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page).toHaveScreenshot(
    `${workflow}-${locale}-desktop-1440x900.png`,
    {
      animations: "disabled",
      caret: "hide",
      mask: masks,
      maxDiffPixelRatio:
        workflow === "applications" && locale === "zh-CN" ? 0.0004 : 0,
      scale: "css",
    },
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page).toHaveScreenshot(
    `${workflow}-${locale}-mobile-390x844.png`,
    {
      animations: "disabled",
      caret: "hide",
      mask: masks,
      maxDiffPixelRatio:
        workflow === "applications" && locale === "zh-CN" ? 0.0011 : 0,
      scale: "css",
    },
  );
}

test.describe("Core platform bilingual workflows", () => {
  // All workflows update the same authenticated user's durable locale.
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test("applications workspace actions and application-card commands", async ({
    app,
    page,
    workspace,
  }) => {
    for (const locale of locales) {
      await selectLocale(page, workspace.id, locale.id);
      await expectLocale(page, locale.id);

      const newMenu = page.locator(".t--new-button");

      await expect(newMenu).toHaveText(locale.workspace.create);
      await newMenu.click();
      await expect(
        page.getByTestId("t--workspace-action-create-app"),
      ).toHaveText(locale.workspace.newApplication);
      await page.keyboard.press("Escape");

      const applicationCard = page.locator(".t--application-card").filter({
        has: page.getByTestId("t--application-card-context-menu"),
        hasText: app.name,
      });
      const applicationCards = page.locator(".t--application-card");

      await expect(applicationCard).toBeVisible();
      await applicationCard
        .getByTestId("t--application-card-context-menu")
        .click();
      await expect(page.getByTestId("t--fork-app")).toHaveText(
        locale.application.fork,
      );
      await expect(page.getByTestId("t--delete-confirm")).toHaveText(
        locale.application.delete,
      );

      const exportAction = page.getByTestId("t--export-app");

      await expect(exportAction).toHaveText(locale.application.export);

      const workspaceHeader = page.locator(".t--workspace-name-text").first();
      const applicationMenuName = page.locator(
        '[role="menu"] .t--application-name',
      );
      const applicationColorSelector = page
        .locator(".t--color-selected")
        .locator("..");
      const applicationIconSelector = page.locator(".icon-selector");
      const workspaceListItems = page
        .getByTestId("t--left-panel")
        .locator("a[data-testid]");
      const anvilEmptyState = page.getByText(
        "There are no Anvil apps in this workspace yet.",
      );
      const anvilEmptyStateImage = anvilEmptyState.locator(
        "xpath=preceding-sibling::img",
      );

      await expect(workspaceHeader).toBeVisible();
      await expect(applicationMenuName).toBeVisible();
      await expect(anvilEmptyState).toBeVisible();
      await anvilEmptyStateImage.evaluate((image) => {
        image.setAttribute("style", "display: none");
      });
      await captureViewports(page, "applications", locale.id, [
        applicationCard,
        applicationCards,
        workspaceHeader,
        applicationMenuName,
        applicationColorSelector,
        applicationIconSelector,
        workspaceListItems,
        anvilEmptyState,
      ]);
      await page.keyboard.press("Escape");
    }
  });

  test("application editor sidebar and execution chrome", async ({
    app,
    page,
    workspace,
  }) => {
    let apiQueryCreated = false;

    for (const locale of locales) {
      await selectLocale(page, workspace.id, locale.id);
      await page.goto(app.url);
      await expectLocale(page, locale.id);

      await expect(
        page.getByText(locale.editor.queries, { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".t--application-publish-btn")).toHaveText(
        locale.editor.deploy,
      );

      if (apiQueryCreated) {
        await page.getByText(locale.editor.queries, { exact: true }).click();
        await page
          .locator(".t--action-entity")
          .filter({ hasText: "Api1" })
          .click();
      } else {
        await page.getByTestId("t--sidebar-Datasources").click();
        await expect(
          page.getByText(locale.editor.dataPaneTitle, { exact: true }),
        ).toBeVisible();
        const addDatasourceButton = page.getByTestId(
          "t--add-datasource-button-blank-screen",
        );

        await expect(addDatasourceButton).toHaveText(
          locale.editor.datasourceBlankCta,
        );
        await addDatasourceButton.click();
        await page.getByText("REST API", { exact: true }).first().click();
        await expect(page).toHaveURL(/\/api\//);
        await page.reload();
        const apiAction = page
          .locator(".t--action-entity")
          .filter({ hasText: "Api1" });
        const datasourceUrl = page.locator(".t--datasource-editor textarea");

        await expect(apiAction).toBeVisible();
        await apiAction.click();
        await expect(datasourceUrl).toBeVisible();
        await datasourceUrl.fill("http://127.0.0.1:8081/api/v1/health");
        const saveAsDatasource = page.getByTestId("t--store-as-datasource");

        await expect(saveAsDatasource).toHaveText(locale.editor.saveUrl);
        await saveAsDatasource.click();
        const saveDatasource = page.locator(".t--save-datasource");

        await expect(saveDatasource).toHaveText(locale.editor.save);
        const datasourceSaveResponse = page.waitForResponse((response) => {
          return (
            response.request().method() === "POST" &&
            /\/api\/v1\/datasources\/?$/.test(response.url())
          );
        });

        await saveDatasource.click();
        await expect((await datasourceSaveResponse).ok()).toBe(true);
        apiQueryCreated = true;
      }
      await expect(
        page
          .getByAltText("no-response-yet")
          .locator("..")
          .getByRole("button", { name: locale.editor.run }),
      ).toBeVisible();
      // The embedded URL editor uses CodeMirror, whose cursor can be remounted
      // by a viewport resize after Playwright hides native carets.
      await page.addStyleTag({
        content:
          ".t--datasource-editor .CodeMirror-cursor { visibility: hidden !important; }",
      });

      const applicationName = page.getByText(app.name, { exact: true });
      const editorBreadcrumb = page
        .locator(".t--application-name")
        .locator("xpath=../../../..");
      const apiEditorTab = page.getByTestId("t--ide-tab-api1");
      const apiEditorTabIcon = apiEditorTab.locator("img").first();
      await expect(applicationName).toBeVisible();
      await expect(editorBreadcrumb).toBeVisible();
      await expect(apiEditorTab).toBeVisible();
      await expect(apiEditorTabIcon).toBeVisible();
      await apiEditorTab.locator("svg").evaluateAll((icons) => {
        icons.forEach((icon) =>
          icon.setAttribute("style", "visibility: hidden"),
        );
      });
      await apiEditorTabIcon.evaluate((icon) => {
        icon.setAttribute("style", "visibility: hidden");
      });
      await captureViewports(page, "editor", locale.id, [editorBreadcrumb]);
    }
  });

  test("profile menu, global search, and shared dialog commands", async ({
    app,
    page,
    workspace,
  }) => {
    for (const locale of locales) {
      await selectLocale(page, workspace.id, locale.id);
      await expectLocale(page, locale.id);

      await page.locator(".t--profile-menu-icon").first().click();
      await expect(
        page.getByText(locale.profile.edit, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("combobox", { name: locale.profile.language }),
      ).toBeVisible();
      await page.keyboard.press("Escape");

      await page.goto(app.url);
      await page.getByRole("button", { name: "Ctrl + K" }).click();
      const globalSearch = page.getByTestId("t--global-search-modal");

      await expect(globalSearch).toBeVisible();
      await expect(globalSearch.locator("#global-search")).toHaveAttribute(
        "placeholder",
        locale.search.placeholder,
      );
      await page.waitForTimeout(150);
      await globalSearch.locator("#global-search").fill("no-local-result");
      await expect(
        globalSearch.getByText(locale.search.noResults),
      ).toBeVisible();

      await page.keyboard.press("Escape");
      await page.goto(`/applications?workspaceId=${workspace.id}`);
      await page.getByRole("button", { name: locale.dialog.share }).click();
      const inviteHeading = page.getByText(
        `${locale.dialog.invitePrefix}${workflowWorkspaceName}`,
        { exact: true },
      );
      await expect(inviteHeading).toBeVisible();

      const workspaceListItems = page
        .getByTestId("t--left-panel")
        .locator("a[data-testid]");
      const profileMenuIcon = page.locator(".t--profile-menu-icon");
      const workspaceShareUsers = page.locator(
        ".t--workspace-share-user-icons",
      );
      const dialogUserRows = page
        .getByRole("dialog")
        .locator('[aria-label*="@"]')
        .locator("xpath=../../..");

      await captureViewports(page, "profile-search-dialog", locale.id, [
        page.locator(".t--application-card"),
        workspaceListItems,
        profileMenuIcon,
        workspaceShareUsers,
        dialogUserRows,
      ]);
      await page.keyboard.press("Escape");
    }
  });
});
