import { expect, test } from "@playwright/test";

const importPath = "/api/v1/celanworksmith/ontology/datasources";

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
