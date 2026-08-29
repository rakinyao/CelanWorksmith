# CelanWorkshop Bilingual UI Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish CelanWorkshop's bilingual UI foundation: Simplified Chinese is the default, English remains selectable, visible text-branding uses `沧澜工坊`/`CelanWorkshop`, and the existing localized authentication/navigation entry points have verified key parity.

**Architecture:** Keep `react-i18next` as the sole client display-language mechanism. Resolve persisted and authenticated choices before the product default, use stable semantic keys for brand text, and add a resource-parity check so English and Chinese catalogs cannot drift. Do not alter Appsmith internal identifiers, protocol data, existing visual assets, or plugin manifests in this phase.

**Tech Stack:** TypeScript, React, `i18next`, `react-i18next`, Jest, existing Appsmith client test tooling.

## Global Constraints

- Scope only user-visible core UI and CelanWorksmith-owned UI; other plugin-specific forms are not translated in this program phase.
- `zh-CN` is the default for unconfigured sessions; explicit authenticated-user or stored preference wins; `en-US` is supported and is the missing-key fallback.
- English brand text is `CelanWorkshop`; Chinese brand text is `沧澜工坊`.
- Keep all internal Appsmith compatibility identifiers unchanged, including package names, `appsmith.*` bindings, protocol headers, API paths, environment variables, database fields, and Docker paths.
- Do not change logo/favicon/PWA visual assets, privacy/legal pages, documentation, manuals, or external documentation links.
- Route new user-facing copy through i18n. Do not translate authored ontology metadata, IDs, query JSON, operation values, or audit/protocol messages.
- Use historical Git identity `gavin <gavin@localhost>` for commits.

---

### Task 1: Make Locale Selection Default to Chinese

**Files:**
- Modify: `app/client/src/i18n/types.ts`
- Modify: `app/client/src/i18n/index.ts`
- Modify: `app/client/src/i18n/LocaleSync.tsx` only if its current authenticated-preference behavior needs a correction
- Test: `app/client/src/i18n/index.test.ts` (create if absent)
- Test: `app/client/src/i18n/types.test.ts` (create if absent)
- Test: `app/client/src/i18n/LocaleSync.test.tsx` (create if absent)

**Interfaces:**
- `DEFAULT_LOCALE` is `"zh-CN"`.
- `getInitialLocale()` resolves stored explicit locale before the Chinese default; unsupported browser locale must not replace the product default.
- `LocaleSync` applies a valid authenticated-user locale after user state loads, overriding the stored explicit locale without writing a different persisted value.
- `normalizeLocale("zh-TW")` behavior remains whatever the existing approved normalization defines; do not add Traditional Chinese in this phase.

- [ ] **Step 1: Write failing locale-order tests**

Add tests that reset i18n/localStorage modules between cases and assert:

```ts
it("uses Chinese when no user or stored locale is configured", () => {
  expect(getInitialLocale()).toBe("zh-CN");
});

it("keeps an explicit stored English preference", () => {
  localStorage.setItem(LOCALE_STORAGE_KEY, "en-US");
  expect(getInitialLocale()).toBe("en-US");
});
```

Add normalization cases for `zh-*`, `en-*`, and unsupported input.

Add a rendered `LocaleSync` test with a mocked current user locale of `"en-US"`, stored locale `"zh-CN"`, and an assertion that `changeLocale("en-US")` is invoked after the effect runs.

- [ ] **Step 2: Verify red**

Run:

```bash
cd app/client && npx jest --runInBand src/i18n/index.test.ts src/i18n/types.test.ts src/i18n/LocaleSync.test.tsx
```

Expected: the unconfigured-session assertion fails because the existing default/browser fallback selects English or browser language.

- [ ] **Step 3: Implement the smallest locale resolution change**

Set the product default to `zh-CN`. Retain valid stored choices, normalize existing Chinese variants, and use the default rather than browser language when no explicit preference exists. Preserve document-language updates, `LocaleSync` authenticated-preference behavior, and the existing `changeLocale()` persistence behavior.

- [ ] **Step 4: Verify green**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/client/src/i18n/types.ts app/client/src/i18n/index.ts \
  app/client/src/i18n/LocaleSync.tsx \
  app/client/src/i18n/index.test.ts app/client/src/i18n/types.test.ts \
  app/client/src/i18n/LocaleSync.test.tsx
git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(i18n): default the UI to Chinese"
```

### Task 2: Add Brand Keys and Translate Existing Localized Entry Points

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Create: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/pages/UserAuth/FooterLinks.tsx`
- Modify: `app/client/src/ce/constants/messages.ts`

**Interfaces:**
- Add `brand.name` with values `CelanWorkshop` and `沧澜工坊`.
- Replace brand-bearing auth/footer copy with interpolation or composable brand keys. Existing TypeScript compatibility export names such as `APPSMITH_DISPLAY_VERSION` remain unchanged while their user-visible value is localized.
- Translate all existing `ontologyDatasource.*` and `release.*` Chinese resource leaves in this task; no visible English values remain under these namespaces.

- [ ] **Step 1: Write failing resource and rendered-brand tests**

Add a recursive `flattenKeys(value, prefix = "")` helper and a leaf-key parity assertion:

```ts
expect(flattenKeys(enUS).sort()).toEqual(flattenKeys(zhCN).sort());
```

Add locale assertions for brand text, the visible footer sentence, and representative custom namespaces:

```ts
expect(i18n.t("brand.name", { lng: "en-US" })).toBe("CelanWorkshop");
expect(i18n.t("brand.name", { lng: "zh-CN" })).toBe("沧澜工坊");
expect(i18n.t("ontologyDatasource.heading", { lng: "zh-CN" })).not.toBe("Ontology datasource");
```

- [ ] **Step 2: Verify red**

Run:

```bash
cd app/client && npx jest --runInBand src/i18n/resources/resourceParity.test.ts
```

Expected: brand keys are absent and current Chinese ontology/release values equal English.

- [ ] **Step 3: Implement translations and brand composition**

Add `brand.name` and `brand.displayVersion` to both resources. Change `FooterLinks` to render `footer.usingProductAgreement` with `{ brand: t("brand.name") }`, preserving its existing privacy and terms link targets. Change `APPSMITH_DISPLAY_VERSION` to return `i18n.t("brand.displayVersion", { edition, version })`, without renaming its export or callers. Translate every `ontologyDatasource.*` and `release.*` leaf in `zh-CN.ts`; preserve all ontology-owned values and technical identifiers.

- [ ] **Step 4: Verify green**

Run the Step 2 command and:

```bash
cd app/client && npx jest --runInBand src/pages/UserAuth
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/client/src/i18n/resources \
  app/client/src/pages/UserAuth/FooterLinks.tsx \
  app/client/src/ce/constants/messages.ts
git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(i18n): localize brand and ontology entry points"
```

### Task 3: Localize Existing CelanWorksmith React Surfaces

**Files:**
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.ts`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.ts`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.ts`
- Modify: `app/client/src/PluginActionEditor/components/PluginActionResponse/components/Response/Response.tsx`
- Modify: `app/client/src/PluginActionEditor/components/PluginActionResponse/components/Response/constants.ts`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.test.ts`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts`
- Test: `app/client/src/PluginActionEditor/components/PluginActionResponse/components/Response/Response.test.tsx`

**Interfaces:**
- Pure parsers/serializers return stable error identifiers plus interpolation data, or use an equivalent existing typed validation result; they must not call React hooks.
- React boundaries map known identifiers to `ontologyQuery.*` / `queryResponse.*` translation keys.
- Serialized ontology query definitions remain byte-compatible for the same input.

- [ ] **Step 1: Write failing locale-boundary tests**

Add tests showing a known parser/Builder validation failure is rendered through an `ontologyQuery.*` key in both locales, while serialization remains unchanged:

```ts
expect(serializeCapabilityBuilderForm(formData, "FUNCTION_QUERY", metadata)).toBe(
  '{"target":{"source":"SINGLE_OBJECT","objectId":"PO002"},"parameters":{}}',
);
```

Add response-chrome tests for localized `queryResponse.duration`, `queryResponse.size`, `queryResponse.status`, and `queryResponse.unexpectedError` labels. The test must render the real `Response` component under each locale and assert the translated status-tooltip content rather than asserting an implementation helper.

- [ ] **Step 2: Verify red**

Run:

```bash
cd app/client && npx jest --runInBand src/PluginActionEditor/components/QueryModeSynchronizer src/PluginActionEditor/components/PluginActionResponse/components/Response
```

Expected: existing literal-English errors/labels fail localized assertions.

- [ ] **Step 3: Implement boundary localization**

Introduce stable validation/error IDs only where needed, localize them at the React/toast/response boundary, and add `ontologyQuery.*` / `queryResponse.*` entries in both resource catalogs. Do not translate backend messages, ontology-authored names, or advanced JSON keys.

- [ ] **Step 4: Verify green**

Run the Step 2 command. Expected: PASS, including existing Builder/Advanced invariants.

- [ ] **Step 5: Commit**

```bash
git add app/client/src/PluginActionEditor/components/QueryModeSynchronizer \
  app/client/src/PluginActionEditor/components/PluginActionResponse \
  app/client/src/i18n/resources
git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(i18n): localize ontology query feedback"
```

### Task 4: Add Bilingual Phase-1 Browser Coverage

**Files:**
- Create: `app/client/playwright/tests/i18n/celanworkshop-bilingual-ui.spec.ts`
- Inspect: `app/client/playwright/tests/smoke/login.spec.ts`
- Inspect: `app/client/playwright/tests/d0/ontology-native-path.spec.ts`
- Inspect: `app/client/playwright/tests/t9/application-release.spec.ts`
- Modify: `docs/superpowers/verification/2026-08-28-celanworkshop-bilingual-ui.md`

**Interfaces:**
- Browser tests set `appsmith.locale` in browser storage before navigation and can select `zh-CN` and `en-US` without relying on the host browser language.
- Tests assert visible brand text, language switch persistence, and localized Ontology datasource/release UI where test fixtures support it.

- [ ] **Step 1: Write a failing browser test for the default locale**

Create `app/client/playwright/tests/i18n/celanworkshop-bilingual-ui.spec.ts`. Its first test clears `appsmith.locale`, loads `/user/login`, and expects `document.documentElement.lang` to be `zh-CN` plus visible `沧澜工坊`. Its second test uses the visible language switcher to choose English, reloads `/user/login`, and expects `document.documentElement.lang` to be `en-US` plus visible `CelanWorkshop`.

- [ ] **Step 2: Verify red**

Run:

```bash
cd app/client && npx playwright test tests/i18n/celanworkshop-bilingual-ui.spec.ts --project=smoke
```

Expected: default language/brand assertions fail before Tasks 1-2 implementation.

- [ ] **Step 3: Implement only test fixtures required for deterministic locale setup**

Use the established `tests/fixtures` login fixture only for authenticated follow-up coverage. The anonymous language-switch tests isolate browser storage with `page.addInitScript`; do not create test accounts or use external environments.

- [ ] **Step 4: Verify green and visual layout**

Run the selected suite for both locales. Use Playwright projects or `page.setViewportSize` to capture desktop `1440x900` and mobile `390x844` screenshots for the login page. Run `tests/d0/ontology-native-path.spec.ts` and `tests/t9/application-release.spec.ts` only when their documented `CW_D0_*` / `CW_T9_*` local test credentials are available; do not replace their existing English role-name assertions in this phase.

- [ ] **Step 5: Record evidence and commit**

Update the verification record with exact Jest/Playwright commands, results, covered screens, deferred plugin manifest work, and known remaining core screen matrix. Then:

```bash
git add app/client/playwright/tests/i18n/celanworkshop-bilingual-ui.spec.ts \
  docs/superpowers/verification/2026-08-28-celanworkshop-bilingual-ui.md
git -c user.name=gavin -c user.email=gavin@localhost commit -m "test(i18n): verify bilingual UI foundation"
```

## Phase 1 Exit Gate

Run the affected i18n, authentication/navigation, QueryModeSynchronizer, response, and browser suites. Confirm `git diff --check` is clean and preserve unrelated working-tree changes. The next plan is authorized only after recording the Phase 1 screen matrix and deciding the generic locale-aware plugin manifest/control rendering contract needed for Phase 3 in the design specification.

## Subsequent Plans

- **Phase 2:** core editor, workspace, application, dialog, toast, and navigation literals, delivered by an agreed screen matrix rather than a blind repository-wide string replacement.
- **Phase 3:** locale-aware generic plugin manifest/control rendering plus complete CelanWorksmith plugin forms and dynamic capability target acceptance.
- **Phase 4:** code-to-template mapping for known CelanWorksmith server/release diagnostics and bilingual end-to-end acceptance matrix.
