import { expect, type Page, test } from "@playwright/test";
import { createApp, deleteApp } from "../../helpers/api";

const importPath = "/api/v1/celanworksmith/ontology/datasources";

const login = async (page: Page, username: string, password: string) => {
  await page.goto("/user/login");
  const loginForm = page.locator(".t--login-container form");
  await loginForm.locator('input[name="username"]').fill(username);
  await loginForm.locator('input[name="password"]').fill(password);
  await loginForm.locator('button[type="submit"]').click();
  await page.waitForURL(/\/applications/);
};

const requestHeaders = (page: Page) => ({
  Origin: new URL(page.url()).origin,
  "X-Requested-By": "Appsmith",
});

const importDemoDatasource = async (
  page: Page,
  workspaceId: string,
  datasourceName: string,
) => {
  const response = await page.request.post(importPath, {
    headers: requestHeaders(page),
    data: {
      workspaceId,
      datasourceName,
      projectImportRequest: { sourceKind: "DEMO" },
    },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  const datasourceId = body.data?.datasourceId;
  expect(datasourceId).toBeTruthy();
  return datasourceId as string;
};

const stopDatasource = async (page: Page, datasourceId?: string) => {
  if (!datasourceId) return;

  const response = await page.request.post(
    `/api/v1/celanworksmith/ontology/datasources/${datasourceId}/stop`,
    { headers: requestHeaders(page) },
  );
  expect([200, 404]).toContain(response.status());
};

const deleteDatasource = async (page: Page, datasourceId?: string) => {
  if (!datasourceId) return;

  const response = await page.request.delete(
    `/api/v1/celanworksmith/ontology/datasources/${datasourceId}`,
    { headers: requestHeaders(page) },
  );
  expect([204, 404]).toContain(response.status());
};

test("imports and persists the Demo Ontology Datasource through the browser session", async ({
  page,
}) => {
  const username = process.env.CW_D0_USERNAME;
  const password = process.env.CW_D0_PASSWORD;
  const workspaceId = process.env.CW_D0_WORKSPACE_ID;

  if (!username || !password || !workspaceId) {
    throw new Error(
      "CW_D0_USERNAME, CW_D0_PASSWORD, and CW_D0_WORKSPACE_ID are required",
    );
  }

  await login(page, username, password);

  const datasourceName = `D0 Playwright ${Date.now()}`;
  const importResponse = await page.request.post(importPath, {
    headers: {
      Origin: new URL(page.url()).origin,
      "X-Requested-By": "Appsmith",
    },
    data: {
      workspaceId,
      datasourceName,
      projectImportRequest: { sourceKind: "DEMO" },
    },
  });

  expect(importResponse.status()).toBe(201);
  const importBody = await importResponse.json();
  const datasourceId = importBody.data?.datasourceId;
  expect(datasourceId).toBeTruthy();

  try {
    const listResponse = await page.request.get(
      `/api/v1/datasources?workspaceId=${workspaceId}`,
    );
    expect(listResponse.ok()).toBeTruthy();
    const listBody = await listResponse.json();
    const imported = (listBody.data || []).find(
      (datasource: { id?: string; name?: string }) =>
        datasource.id === datasourceId || datasource.name === datasourceName,
    );
    expect(imported).toBeTruthy();
  } finally {
    const stopResponse = await page.request.post(
      `/api/v1/celanworksmith/ontology/datasources/${datasourceId}/stop`,
      {
        headers: {
          Origin: new URL(page.url()).origin,
          "X-Requested-By": "Appsmith",
        },
      },
    );
    expect([200, 404]).toContain(stopResponse.status());
  }
});

test("opens a generated PurchaseOrder query after its plugin form loads", async ({
  page,
}) => {
  const username = process.env.CW_D0_USERNAME;
  const password = process.env.CW_D0_PASSWORD;
  const workspaceId = process.env.CW_D0_WORKSPACE_ID;
  if (!username || !password || !workspaceId) {
    throw new Error(
      "CW_D0_USERNAME, CW_D0_PASSWORD, and CW_D0_WORKSPACE_ID are required",
    );
  }

  const datasourceName = `P1 Query Editor ${Date.now()}`;
  await login(page, username, password);

  const app = await createApp(
    page.request,
    workspaceId,
    `P1 Query Editor ${Date.now()}`,
  );
  let datasourceId: string | undefined;

  try {
    datasourceId = await importDemoDatasource(
      page,
      workspaceId,
      datasourceName,
    );
    await page.goto(app.url);
    await page.getByTestId("t--sidebar-Datasources").click();
    await page
      .locator(".t--datasource")
      .filter({ hasText: datasourceName })
      .click();
    await page.locator(".t--create-query").click();
    await expect(page).toHaveURL(/\/queries\/[^/]+/);

    const objectType = page.getByTestId(
      "t--dropdown-actionConfiguration.formData.objectTypeId.data",
    );
    const unexpectedError = page.getByText("An unexpected error occurred", {
      exact: true,
    });
    await expect(unexpectedError).toHaveCount(0);
    await expect(objectType).toBeVisible();
    await objectType.click();
    await page.getByText("Purchase Order", { exact: true }).last().click();
    await expect(objectType).toContainText("Purchase Order");
  } finally {
    try {
      await stopDatasource(page, datasourceId);
    } finally {
      try {
        await deleteApp(page.request, app.id, requestHeaders(page));
      } finally {
        await deleteDatasource(page, datasourceId);
      }
    }
  }
});
