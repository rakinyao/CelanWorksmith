import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../../fixtures";

const localeStorageKey = "appsmith.locale";

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
      share: "分享应用",
    },
    editor: {
      datasources: "数据源",
      deploy: "发布",
      queries: "查询",
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
      share: "Share app",
    },
    editor: {
      datasources: "Datasources",
      deploy: "Deploy",
      queries: "Queries",
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

  const persistLocale = async (nextLocale: LocaleCase["id"]) => {
    const userUpdate = page.waitForResponse((response) => {
      return (
        response.request().method() === "PUT" &&
        /\/api\/v1\/users\/?$/.test(response.url())
      );
    });

    await languageControl.selectOption(nextLocale);
    await expect((await userUpdate).ok()).toBe(true);
    await expect(languageControl).toHaveValue(nextLocale);
  };

  // The browser may still hold the requested value while the authenticated
  // profile is loading. Round-trip through the other option to force a server
  // update before selecting the locale under test.
  if ((await languageControl.inputValue()) === locale) {
    await persistLocale(locale === "en-US" ? "zh-CN" : "en-US");
  }

  await persistLocale(locale);
  await expectLocale(page, locale);
  await expect
    .poll(() =>
      page.evaluate(
        (key) => window.localStorage.getItem(key),
        localeStorageKey,
      ),
    )
    .toBe(locale);
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
      scale: "css",
    },
  );
}

test.describe("Core platform bilingual workflows", () => {
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

      const applicationCard = page.getByTestId(
        `t--application-card ${app.name}`,
      );

      await expect(applicationCard).toBeVisible();
      await applicationCard
        .getByTestId("t--application-card-context-menu")
        .click();
      await expect(page.getByTestId("t--share")).toHaveText(
        locale.application.share,
      );
      await expect(page.getByTestId("t--fork-app")).toHaveText(
        locale.application.fork,
      );
      await expect(page.getByTestId("t--delete-confirm")).toHaveText(
        locale.application.delete,
      );

      const exportAction = page.getByTestId("t--export-app");

      await expect(exportAction).toHaveText(locale.application.export);

      const workspaceHeader = page.locator(".t--workspace-name-text").first();
      await expect(workspaceHeader).toBeVisible();
      await captureViewports(page, "applications", locale.id, [
        applicationCard,
        workspaceHeader,
      ]);
      await page.keyboard.press("Escape");
    }
  });

  test("application editor sidebar and execution chrome", async ({
    app,
    page,
    workspace,
  }) => {
    for (const locale of locales) {
      await selectLocale(page, workspace.id, locale.id);
      await page.goto(app.url);
      await expectLocale(page, locale.id);

      await expect(
        page.getByText(locale.editor.queries, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(locale.editor.datasources, { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".t--application-publish-btn")).toHaveText(
        locale.editor.deploy,
      );

      await page.getByText(locale.editor.queries, { exact: true }).click();
      await expect(
        page.getByText(locale.editor.run, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(locale.editor.saved, { exact: true }),
      ).toBeVisible();

      const applicationHeader = page.locator(".t--application-name").first();
      await expect(applicationHeader).toBeVisible();
      await captureViewports(page, "editor", locale.id, [applicationHeader]);
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
      await page.keyboard.press("Control+k");
      const globalSearch = page.getByTestId("t--global-search-modal");

      await expect(globalSearch).toBeVisible();
      await expect(globalSearch.locator("#global-search")).toHaveAttribute(
        "placeholder",
        locale.search.placeholder,
      );
      await globalSearch.locator("#global-search").fill("no-local-result");
      await expect(
        globalSearch.getByText(locale.search.noResults),
      ).toBeVisible();

      await page.keyboard.press("Escape");
      await page.goto(`/applications?workspaceId=${workspace.id}`);
      await page.getByRole("button", { name: locale.dialog.share }).click();
      const inviteHeading = page.getByText(
        `${locale.dialog.invitePrefix}${workspace.name}`,
        { exact: true },
      );
      await expect(inviteHeading).toBeVisible();

      await captureViewports(page, "profile-search-dialog", locale.id, [
        inviteHeading,
      ]);
      await page.keyboard.press("Escape");
    }
  });
});
