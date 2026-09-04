import { expect, type Page, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createApp, deleteApp } from "../../helpers/api";

const importPath = "/api/v1/celanworksmith/ontology/datasources";
const fixture = Array.from(
  readFileSync(
    path.resolve(
      __dirname,
      "../../../../../docs/superpowers/fixtures/ontology-model-release-demo.json",
    ),
  ),
);
const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
const isLocalBaseUrl = (() => {
  if (!baseUrl) return false;
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
})();
const username = process.env.CW_RELEASE_JSON_USERNAME;
const password = process.env.CW_RELEASE_JSON_PASSWORD;
const workspaceId = process.env.CW_RELEASE_JSON_WORKSPACE_ID;

test.skip(
  !isLocalBaseUrl || !username || !password || !workspaceId,
  "requires an explicit local release-import server, existing test user, and business-bound workspace",
);

const login = async (page: Page) => {
  await page.goto("/user/login");
  const loginForm = page.locator(".t--login-container form");
  await loginForm.locator('input[name="username"]').fill(username!);
  await loginForm.locator('input[name="password"]').fill(password!);
  await loginForm.locator('button[type="submit"]').click();
  await page.waitForURL(/\/applications/);
};

const headers = (page: Page) => ({
  Origin: new URL(page.url()).origin,
  "X-Requested-By": "Appsmith",
});

const stopAndDeleteDatasource = async (page: Page, datasourceId?: string) => {
  if (!datasourceId) return;
  const stop = await page.request.post(
    `/api/v1/celanworksmith/ontology/datasources/${datasourceId}/stop`,
    { headers: headers(page) },
  );
  expect([200, 404]).toContain(stop.status());
  const remove = await page.request.delete(
    `/api/v1/celanworksmith/ontology/datasources/${datasourceId}`,
    { headers: headers(page) },
  );
  expect([204, 404]).toContain(remove.status());
};

test("imports the Release JSON, selects its datasource, and queries Chinese runtime rows", async ({
  page,
}) => {
  await login(page);
  const app = await createApp(page.request, workspaceId!, `release-json-${Date.now()}`);
  const datasourceName = `Release JSON ${Date.now()}`;
  let datasourceId: string | undefined;

  try {
    const imported = await page.request.post(importPath, {
      headers: headers(page),
      data: {
        workspaceId,
        datasourceName,
        projectImportRequest: {
          sourceKind: "LOCAL_RELEASE_JSON",
          metadata: fixture,
          sourceReleaseId: "ontology-model-release-demo.json",
        },
      },
    });
    expect(imported.status()).toBe(201);
    datasourceId = (await imported.json()).data?.datasourceId;
    expect(datasourceId).toBeTruthy();

    await page.goto(app.url);
    await page.getByTestId("t--sidebar-Datasources").click();
    await page.locator(".t--datasource").filter({ hasText: datasourceName }).click();
    await page.locator(".t--create-query").click();
    const objectType = page.getByTestId(
      "t--dropdown-actionConfiguration.formData.objectTypeId.data",
    );
    await expect(objectType).toBeVisible();
    await objectType.click();
    await page.getByText("Supplier", { exact: true }).last().click();
    await page.getByTestId("t--run-action").click();
    await expect(page.getByText(/供应商/).first()).toBeVisible();
  } finally {
    try {
      await deleteApp(page.request, app.id, headers(page));
    } finally {
      await stopAndDeleteDatasource(page, datasourceId);
    }
  }
});
