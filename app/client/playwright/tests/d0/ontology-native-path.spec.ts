import { expect, type Page, test } from "@playwright/test";
import { createApp, deleteApp } from "../../helpers/api";

const importPath = "/api/v1/celanworksmith/ontology/datasources";

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

  await page.goto("/user/login");
  await page.getByPlaceholder("Enter your email").fill(username);
  await page.getByPlaceholder("Enter your password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/applications/);

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

test("reopens a generated PurchaseOrder query after its plugin form loads", async ({
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
  await page.goto("/user/login");
  await page.getByPlaceholder("Enter your email").fill(username);
  await page.getByPlaceholder("Enter your password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/applications/);

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

    const objectType = page.getByTestId(
      "t--dropdown-actionConfiguration.formData.objectTypeId.data",
    );
    await objectType.click();
    await page.getByText("Purchase Order", { exact: true }).last().click();
    await page.reload();

    await expect(page.getByText("An Unexpected error occurred.")).toHaveCount(
      0,
    );
    await expect(objectType).toContainText("Purchase Order");
  } finally {
    await stopDatasource(page, datasourceId);
    await deleteApp(page.request, app.id);
  }
});
