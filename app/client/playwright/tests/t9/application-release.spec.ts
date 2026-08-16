import { expect, test } from "@playwright/test";

const datasourceImportPath = "/api/v1/celanworksmith/ontology/datasources";

type Release = {
  releaseId: string;
  status: string;
};

const responseData = <T>(body: { data?: T }) => body.data as T;

test("verifies the native application release lifecycle", async ({ page }) => {
  const username = process.env.CW_D0_USERNAME;
  const password = process.env.CW_D0_PASSWORD;
  const workspaceId = process.env.CW_D0_WORKSPACE_ID;
  const applicationUrl = process.env.CW_T9_APPLICATION_URL;
  const applicationId = process.env.CW_T9_APPLICATION_ID;

  if (
    !username ||
    !password ||
    !workspaceId ||
    !applicationUrl ||
    !applicationId
  ) {
    throw new Error(
      "CW_D0_USERNAME, CW_D0_PASSWORD, CW_D0_WORKSPACE_ID, CW_T9_APPLICATION_URL, and CW_T9_APPLICATION_ID are required",
    );
  }

  await page.goto("/user/login");
  await page.getByPlaceholder("Enter your email").fill(username);
  await page.getByPlaceholder("Enter your password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/applications/);

  const datasourceName = `T9 Demo Ontology ${Date.now()}`;
  const importResponse = await page.request.post(datasourceImportPath, {
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
  expect(
    responseData<{ datasourceId: string }>(await importResponse.json())
      .datasourceId,
  ).toBeTruthy();

  await page.goto(applicationUrl);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toContainText(/editor|canvas/i);

  await page.getByTestId("t--sidebar-Datasources").click();
  const datasourceCard = page
    .locator(".t--datasource")
    .filter({ hasText: datasourceName });
  await expect(datasourceCard).toBeVisible();
  await datasourceCard.click();
  await expect(page).toHaveURL(/\/datasource\/[^/]+/);
  await expect(page.getByRole("button", { name: /new query/i })).toBeVisible();

  await page.locator(".t--create-query").click();
  await expect(page).toHaveURL(/\/queries\/[^/]+/);
  const objectTypeDropdown = page.getByTestId(
    "t--dropdown-actionConfiguration.formData.objectTypeId.data",
  );
  await expect(objectTypeDropdown).toBeVisible();
  await objectTypeDropdown.click();
  await page.getByText("Purchase Order", { exact: true }).last().click();
  await expect(objectTypeDropdown).toContainText("Purchase Order");
  await page.goto(applicationUrl);

  await page.locator(".t--application-publish-btn").click();
  await expect(page.getByText("Application release")).toBeVisible();
  await expect(page.getByText("Release is ready.")).toBeVisible();

  const releaseCollectionPath = `/api/v1/celanworksmith/applications/${applicationId}/releases`;
  const releaseItems = page.locator("text=Release ID:");
  const initialReleaseCount = await releaseItems.count();
  const createRelease = page.getByRole("button", { name: "Create release" });
  const firstCreateResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(releaseCollectionPath) &&
      response.request().method() === "POST" &&
      response.status() === 201,
  );
  await createRelease.click();
  const firstRelease = responseData<Release>(
    await (await firstCreateResponse).json(),
  );
  const firstReleaseId = firstRelease.releaseId;
  await expect(releaseItems).toHaveCount(initialReleaseCount + 1);
  const firstReleaseItem = page
    .getByText(`Release ID: ${firstReleaseId}`, { exact: true })
    .locator("..");

  await firstReleaseItem.getByRole("button", { name: "Activate" }).click();
  await expect(
    page.getByText(new RegExp(`Active release: ${firstReleaseId}`)),
  ).toBeVisible();

  await page.getByRole("button", { name: "Run preflight" }).click();
  await expect(page.getByText("Release is ready.")).toBeVisible();
  const secondCreateResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(releaseCollectionPath) &&
      response.request().method() === "POST" &&
      response.status() === 201,
  );
  await createRelease.click();
  const secondRelease = responseData<Release>(
    await (await secondCreateResponse).json(),
  );
  const secondReleaseId = secondRelease.releaseId;
  await expect(releaseItems).toHaveCount(initialReleaseCount + 2);
  const secondReleaseItem = page
    .getByText(`Release ID: ${secondReleaseId}`, { exact: true })
    .locator("..");

  await secondReleaseItem.getByRole("button", { name: "Activate" }).click();
  await expect(
    page.getByText(new RegExp(`Active release: ${secondReleaseId}`)),
  ).toBeVisible();

  await firstReleaseItem.getByRole("button", { name: "Rollback" }).click();
  await expect(
    page.getByText(new RegExp(`Active release: ${firstReleaseId}`)),
  ).toBeVisible();

  const activeBeforeFailure = firstReleaseId;
  const activatePath =
    /\/api\/v1\/celanworksmith\/applications\/[^/]+\/releases\/[^/]+\/activate$/;
  await page.route(activatePath, async (route) => {
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        responseMeta: {
          status: 422,
          success: false,
          error: {
            code: "RELEASE_PROVIDER_INCOMPATIBLE",
            message: "Runtime provider metadata mapping is incompatible",
          },
        },
        data: {
          applicationId,
          baseRevisionId: null,
          valid: false,
          diagnostics: [
            {
              severity: "BLOCKING",
              code: "RELEASE_ONTOLOGY_PROVIDER_INCOMPATIBLE",
              path: "datasources.demoOntology.providerId",
              message: "Runtime provider metadata mapping is incompatible",
              details: { providerId: "mongo-backed-runtime" },
            },
          ],
        },
      }),
    });
  });

  const failedActivation = page.waitForResponse(
    (response) =>
      activatePath.test(response.url()) && response.status() === 422,
  );
  await secondReleaseItem.getByRole("button", { name: "Activate" }).click();
  const failureResponse = await failedActivation;
  const failureBody = await failureResponse.json();
  expect(failureBody.data.diagnostics[0]).toMatchObject({
    severity: "BLOCKING",
    code: "RELEASE_ONTOLOGY_PROVIDER_INCOMPATIBLE",
  });
  await expect(
    page.getByText("Unable to load release readiness."),
  ).toBeVisible();

  const activeResponse = await page.request.get(
    `${new URL(page.url()).origin}/api/v1/celanworksmith/applications/${applicationId}/releases/active`,
  );
  expect(activeResponse.ok()).toBeTruthy();
  const activeRelease = responseData<Release>(await activeResponse.json());
  expect(activeRelease.releaseId).toBe(activeBeforeFailure);
});
