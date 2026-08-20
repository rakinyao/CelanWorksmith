# Query Editor Plugin Form Race Playwright Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-cleaning browser regression proving that a newly created Demo Ontology `PurchaseOrder` query opens its editor without an unexpected-error screen.

**Architecture:** The test uses the authenticated browser session to create a temporary App and import the Demo Ontology datasource, then uses the normal Datasource UI to create and configure a query. It asserts the initial native query-editor transition has no UQI error boundary and that the Object Type field is usable. The temporary datasource is stopped and deleted, and the App is removed from the server in `finally`, preserving the isolated local-development data boundary.

**Tech Stack:** Playwright, existing Appsmith REST test helpers, Appsmith Query editor UI.

## Global Constraints

- Use `CW_D0_USERNAME`, `CW_D0_PASSWORD`, and `CW_D0_WORKSPACE_ID`; never commit credentials or local URLs.
- Use the existing native Appsmith Datasource, Query, and Action pipeline; do not mutate MongoDB or add an Ontology-only execution path.
- Create uniquely named temporary resources and clean them up in `finally`.
- Do not rely on brittle Table drag-and-drop selectors when the Datasource's native New Query flow reaches the same query-editor loading contract.

---

### Task 1: Add the query-editor plugin-form regression

**Files:**
- Modify: `app/client/playwright/tests/d0/ontology-native-path.spec.ts`
- Modify: `docs/superpowers/plans/2026-08-20-query-editor-plugin-form-race-playwright.md`

**Interfaces:**
- Consumes: `createApp(page.request, workspaceId, name)` and `deleteApp(page.request, appId)` from `playwright/helpers/api.ts`.
- Consumes: `POST /api/v1/celanworksmith/ontology/datasources` with `{ workspaceId, datasourceName, projectImportRequest: { sourceKind: "DEMO" } }`, which returns `data.datasourceId`.
- Produces: a Playwright test that fails when opening an Ontology query does not load its plugin editor form before rendering the editor controls.

- [x] **Step 1: Write the failing browser test**

```ts
test("reopens a generated PurchaseOrder query after its plugin form loads", async ({ page }) => {
  const app = await createApp(page.request, workspaceId, `P1 Query Editor ${Date.now()}`);
  let datasourceId: string | undefined;

  try {
    datasourceId = await importDemoDatasource(page, workspaceId);
    await page.goto(app.url);
    await page.getByTestId("t--sidebar-Datasources").click();
    await page.locator(".t--datasource").filter({ hasText: datasourceName }).click();
    await page.locator(".t--create-query").click();

    const objectType = page.getByTestId(
      "t--dropdown-actionConfiguration.formData.objectTypeId.data",
    );
    await objectType.click();
    await page.getByText("Purchase Order", { exact: true }).last().click();
    await page.reload();

    await expect(page.getByText("An Unexpected error occurred.")).toHaveCount(0);
    await expect(objectType).toContainText("Purchase Order");
  } finally {
    await stopDatasource(page, datasourceId);
    await deleteApp(page.request, app.id);
  }
});
```

- [x] **Step 2: Run the focused test to verify the initial result**

Run: `cd app/client && yarn playwright test --config=playwright/d0.config.ts tests/d0/ontology-native-path.spec.ts`

Expected: the new test is discovered. In a configured local environment it passes only when the editor can load the plugin form before rendering. If the required `CW_D0_*` credentials are unavailable, it fails immediately with that explicit configuration error and the static checks continue.

- [x] **Step 3: Add the smallest supporting test code**

```ts
const stopDatasource = async (page: Page, datasourceId?: string) => {
  if (!datasourceId) return;

  const response = await page.request.post(
    `/api/v1/celanworksmith/ontology/datasources/${datasourceId}/stop`,
    { headers: requestHeaders(page) },
  );
  expect([200, 404]).toContain(response.status());
};
```

Keep credentials validation, login, import request headers, and cleanup local to the d0 spec. Reuse `createApp` and `deleteApp`; add no production code.

- [x] **Step 4: Run focused verification**

Run: `cd app/client && yarn prettier --check playwright/tests/d0/ontology-native-path.spec.ts && yarn eslint playwright/tests/d0/ontology-native-path.spec.ts && yarn jest src/sagas/__tests__/QueryPaneSagas.test.ts src/workers/Evaluation/__tests__/formEval.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts src/WidgetQueryGenerators/Ontology/index.test.ts --runInBand --no-cache`

Expected: formatting, lint, and the five focused client regression suites pass. Run the d0 Playwright command when local credentials are configured; otherwise record its precise configuration blocker without claiming browser execution passed.

- [x] **Step 5: Commit the regression and plan**

```bash
git add \
  app/client/playwright/tests/d0/ontology-native-path.spec.ts \
  docs/superpowers/plans/2026-08-20-query-editor-plugin-form-race-playwright.md
HUSKY=0 git commit -m "test: cover query editor plugin form reload"
```

Use `HUSKY=0` only after the Step 4 targeted checks because this fresh environment's hook dependencies are still not globally resolvable.

## Self-Review

**Spec coverage:** The test verifies the browser-visible regression described by `2026-08-20-query-editor-plugin-form-race-design.md`: reopening an Ontology query after client navigation renders the plugin form's Object Type field and no unexpected-error boundary. It also exercises the native query creation path and cleans up all isolated data.

**Placeholder scan:** No implementation placeholders or unspecified commands remain.

**Type consistency:** The plan uses `AppInfo.id`/`AppInfo.url` and the datasource import response's `data.datasourceId`, matching the existing Playwright helpers and d0 test contract.
