import type { Locator, Page } from "@playwright/test";
import { createWorkspace, deleteWorkspace } from "../../helpers/api";
import { expect, test as base } from "../../fixtures";

const workflowWorkspaceName = "i18n-workflow-workspace";

const test = base.extend({
  workspace: async ({ api }, use) => {
    const workspace = await createWorkspace(api, workflowWorkspaceName);

    await use(workspace);
    await deleteWorkspace(api, workspace.id).catch(() => {});
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
      deploy: "发布",
      queries: "查询",
      newQueryApi: "新建查询 / API",
      run: "运行",
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
      deploy: "Deploy",
      queries: "Queries",
      newQueryApi: "New query / API",
      run: "Run",
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
  test.describe.configure({ mode: "serial" });

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
      const workspaceListItems = page.locator(
        'a[data-testid="t--"], a[data-testid="t--selected-workspace"]',
      );
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

      await page.getByText(locale.editor.queries, { exact: true }).click();
      if (apiQueryCreated) {
        await page
          .locator(".t--action-entity")
          .filter({ hasText: "Api1" })
          .click();
      } else {
        await page
          .getByRole("button", { name: locale.editor.newQueryApi })
          .click();
        await page.getByText("REST API", { exact: true }).click();
        await page.waitForURL(/\/queries\/add$/);
        apiQueryCreated = true;
      }
      await expect(
        page
          .getByAltText("no-response-yet")
          .locator("..")
          .getByRole("button", { name: locale.editor.run }),
      ).toBeVisible();

      const applicationHeader = page.locator(".t--application-name").first();
      const editorHeader = page.locator(".t--editor-header");
      const apiEditorTab = page.getByTestId("t--ide-tab-api1");
      const apiEditorTabIcon = apiEditorTab.locator("img").first();
      await expect(applicationHeader).toBeVisible();
      await expect(editorHeader).toBeVisible();
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
      await captureViewports(page, "editor", locale.id, [editorHeader]);
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

      await captureViewports(page, "profile-search-dialog", locale.id, [
        page.locator(".t--application-card"),
      ]);
      await page.keyboard.press("Escape");
    }
  });
});
