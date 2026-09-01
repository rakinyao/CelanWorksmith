import type { Locator, Page } from "@playwright/test";
import {
  createApp,
  createWorkspace,
  deleteApp,
  deleteWorkspace,
} from "../../helpers/api";
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
      heading: "应用",
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
      invite: "邀请",
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
      heading: "Applications",
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
      invite: "Invite",
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
type CaptureOptions = {
  masks?: Locator[];
  prepareMobile?: () => Promise<void>;
};

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
  { masks = [], prepareMobile }: CaptureOptions = {},
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
  await prepareMobile?.();
  await expect(page).toHaveScreenshot(
    `${workflow}-${locale}-mobile-390x844.png`,
    {
      animations: "disabled",
      caret: "hide",
      mask: masks,
      maxDiffPixelRatio:
        workflow === "applications" && locale === "zh-CN"
          ? 0.0011
          : workflow === "profile-search-dialog"
            ? 0.001
            : 0,
      scale: "css",
    },
  );
}

async function assertGlobalSearch(page: Page, locale: LocaleCase) {
  const globalSearch = page.getByTestId("t--global-search-modal");

  await expect(globalSearch).toBeVisible();
  await expect(globalSearch.locator("#global-search")).toHaveAttribute(
    "placeholder",
    locale.search.placeholder,
  );
  // SearchBox ignores input briefly after opening to avoid capturing the hotkey.
  await page.waitForTimeout(150);
  await globalSearch.locator("#global-search").fill("no-local-result");
  await expect(globalSearch.getByText(locale.search.noResults)).toBeVisible();
}

async function captureGlobalSearchMobile(page: Page, locale: LocaleCase) {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("t--global-search-modal")).toHaveScreenshot(
    `global-search-${locale.id}-mobile-390x844.png`,
    {
      animations: "disabled",
      caret: "hide",
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

      const exportAction = page.getByTestId("t--export-app");
      const openApplicationCardMenu = async () => {
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
        await expect(exportAction).toHaveText(locale.application.export);
      };

      await openApplicationCardMenu();

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
      await captureViewports(page, "applications", locale.id, {
        masks: [
          applicationCard,
          applicationCards,
          workspaceHeader,
          applicationMenuName,
          applicationColorSelector,
          applicationIconSelector,
          workspaceListItems,
          anvilEmptyState,
        ],
        prepareMobile: async () => {
          await expect(
            page.getByText(locale.application.heading, { exact: true }),
          ).toBeVisible();
          await expect(
            page.getByTestId("t--app-card-name").filter({ hasText: app.name }),
          ).toBeVisible();
        },
      });
      await page.keyboard.press("Escape");
    }
  });

  test("application editor sidebar and execution chrome", async ({
    api,
    page,
  }) => {
    for (const locale of locales) {
      const editorWorkspace = await createWorkspace(
        api,
        `i18n-editor-${locale.id}-${crypto.randomUUID().slice(0, 8)}`,
      );
      let editorApp: Awaited<ReturnType<typeof createApp>> | undefined;

      try {
        editorApp = await createApp(
          api,
          editorWorkspace.id,
          `${workflowAppName}-${locale.id}`,
        );
        await selectLocale(page, editorWorkspace.id, locale.id);
        await page.goto(editorApp.url);
        await expectLocale(page, locale.id);

        await expect(
          page.getByText(locale.editor.queries, { exact: true }),
        ).toBeVisible();
        await expect(page.locator(".t--application-publish-btn")).toHaveText(
          locale.editor.deploy,
        );

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

        const runButton = page
          .getByAltText("no-response-yet")
          .locator("..")
          .getByRole("button", { name: locale.editor.run });
        await expect(runButton).toBeVisible();
        // The embedded URL editor uses CodeMirror, whose cursor can be remounted
        // by a viewport resize after Playwright hides native carets.
        await page.addStyleTag({
          content:
            ".t--datasource-editor .CodeMirror-cursor { visibility: hidden !important; }",
        });

        const applicationName = page.getByText(editorApp.name, {
          exact: true,
        });
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
        await captureViewports(page, "editor", locale.id, {
          masks: [editorBreadcrumb],
          prepareMobile: async () => {
            await expect(runButton).toBeVisible();
          },
        });
      } finally {
        if (editorApp) {
          await deleteApp(api, editorApp.id).catch(() => {});
        }
        await deleteWorkspace(api, editorWorkspace.id).catch(() => {});
      }
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
      await assertGlobalSearch(page, locale);

      await page.keyboard.press("Escape");
      await page.goto(`/applications?workspaceId=${workspace.id}`);
      await page.getByRole("button", { name: locale.dialog.share }).click();
      const inviteHeading = page.getByText(
        `${locale.dialog.invitePrefix}${workflowWorkspaceName}`,
        { exact: true },
      );
      await expect(inviteHeading).toBeVisible();
      const inviteDialog = page.getByRole("dialog");
      const inviteButton = inviteDialog.getByRole("button", {
        name: locale.dialog.invite,
      });
      await expect(inviteButton).toBeVisible();

      const workspaceListItems = page
        .getByTestId("t--left-panel")
        .locator("a[data-testid]");
      const profileMenuIcon = page.locator(".t--profile-menu-icon");
      const workspaceShareUsers = page.locator(
        ".t--workspace-share-user-icons",
      );
      const applicationCardIcons = page.getByTestId("t--application-card-icon");
      const dialogUserRows = page.getByTestId("t--workspace-invite-user-row");

      await expect(applicationCardIcons).not.toHaveCount(0);
      await expect(dialogUserRows).not.toHaveCount(0);

      await captureViewports(page, "profile-search-dialog", locale.id, {
        masks: [
          applicationCardIcons,
          page.getByTestId("t--app-card-name"),
          workspaceListItems,
          profileMenuIcon,
          workspaceShareUsers,
          dialogUserRows,
        ],
      });
      await page.keyboard.press("Escape");
      await page.goto(app.url);
      await page.getByTestId("global-search-modal-trigger").click();
      await assertGlobalSearch(page, locale);
      await captureGlobalSearchMobile(page, locale);
      await page.keyboard.press("Escape");
    }
  });
});
