# CelanWorkshop Bilingual UI Phase 1 Verification

Date: 2026-08-28

Branch: `feat/celanworkshop-bilingual-ui-phase-1`

## Scope

Phase 1 browser coverage targets the anonymous login screen. The test clears
`appsmith.locale` through `page.addInitScript`, verifies the Chinese default,
selects English through the visible language combobox, and verifies the
persisted English locale after navigation. The first test records login
screenshots at 1440x900 and 390x844 when the browser runner is available.

The smoke project discovery was narrowed to `playwright/tests/smoke/**` and
`playwright/tests/i18n/**`; d0, t9, and other credential-dependent projects are
unchanged.

## RED

The required browser command initially found no tests because the smoke
project was scoped only to `playwright/tests/smoke` (exit code `1`, "No tests
found"). After the narrow smoke discovery adjustment, the command selected the
new spec but setup stopped before test bodies because the pinned browser binary
is unavailable:

```bash
cd app/client
npx playwright test tests/i18n/celanworkshop-bilingual-ui.spec.ts --project=smoke
```

Result: exit code `1`; Playwright reported that
`/home/gavin/.cache/ms-playwright/chromium_headless_shell-1217/.../chrome-headless-shell`
does not exist. Installing the pinned browser was also blocked because this
host reports `ubuntu26.04-x64`, which this Playwright release does not support:

```bash
npx playwright install chromium
```

Result: exit code `1`, "Playwright does not support chromium on
ubuntu26.04-x64". No remote browser result was substituted: `dev.appsmith.com`
was checked and serves a different Appsmith build, not this worktree.

## GREEN

The available focused locale checks pass:

```bash
cd app/client
yarn jest src/i18n/index.test.ts src/i18n/types.test.ts src/i18n/resources/resourceParity.test.ts --runInBand
```

Result: exit code `0`; 3 suites and 11 tests passed.

```bash
npx prettier --check playwright/tests/i18n/celanworkshop-bilingual-ui.spec.ts playwright.config.ts
git diff --check
```

Result: both commands exit `0` with no formatting or whitespace errors.

## Coverage Matrix

Covered by the new browser spec: anonymous `/user/login`, default `zh-CN`,
visible Chinese brand `沧澜工坊`, visible locale selection to `en-US`, English
brand `CelanWorkshop`, `document.documentElement.lang`, local-storage
persistence, and desktop/mobile screenshot capture hooks.

Deferred: authenticated Ontology datasource/query and application release
screens. Those remain in `tests/d0/ontology-native-path.spec.ts` and
`tests/t9/application-release.spec.ts` and require their documented
`CW_D0_*`/`CW_T9_*` credentials. They were not run or rewritten in this phase.

## Phase 3 Dependency

Phase 1 does not alter plugin forms or visual assets. Phase 3 still depends on
a generic locale-aware plugin manifest/control rendering contract before the
complete CelanWorksmith plugin forms can be accepted in both locales. The
screen matrix and that manifest dependency must be resolved in the Phase 3
design specification.
