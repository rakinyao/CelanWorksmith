# Core Platform Bilingual UI Chrome Verification

Date: 2026-09-01

## Environment

- Worktree: `/home/gavin/workspace/projects/CelanWorksmith/.worktrees/celanworkshop-core-platform-bilingual-ui`
- Branch: `feat/celanworkshop-core-platform-bilingual-ui`
- Branch server: `http://127.0.0.1:3001`, started from this worktree's `app/client` directory. The pre-existing main-checkout server on port `3000` was not modified.
- Browser: `/usr/bin/google-chrome` (`Google Chrome 152.0.7977.64`)
- Browser override: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome`

The Playwright configuration uses `launchOptions.executablePath` only when
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` is set. Without that environment
variable, the pinned bundled-browser behavior remains unchanged. Video remains
`on` for the bundled browser. When an executable override is set, video is
conditionally `off`: this host lacks Playwright's pinned `ffmpeg` helper, and
otherwise Chrome contexts fail before the workflows begin. Installing the
matching Playwright browser dependencies removes that host-only limitation.

## Workflow Matrix

| Workflow                                                    | Chinese                            | English                            | Desktop 1440x900 | Mobile 390x844 |
| ----------------------------------------------------------- | ---------------------------------- | ---------------------------------- | ---------------- | -------------- |
| Applications, workspace New menu, application-card commands | Defined; blocked before navigation | Defined; blocked before navigation | Not captured     | Not captured   |
| Editor sidebar and Run/Save/Publish chrome                  | Defined; blocked before navigation | Defined; blocked before navigation | Not captured     | Not captured   |
| Profile menu, global search, shared dialog command          | Defined; blocked before navigation | Defined; blocked before navigation | Not captured     | Not captured   |

The suite asserts deterministic Playwright snapshots named
`<workflow>-<locale>-desktop-1440x900.png` and
`<workflow>-<locale>-mobile-390x844.png` after each workflow reaches its
assertions. No workflow snapshot baseline or actual screenshot was produced in
this environment because authenticated browser contexts could not be created.
Each locale is selected through the authenticated profile menu and persisted by
the normal `LanguageSwitcher` update; the suite does not accumulate
`page.addInitScript` storage seeds. Because these writes update the authenticated
user's durable profile locale, the describe runs serially even though the global
configuration is fully parallel. The suite creates its own fixed-name workspace
so the translated invite title remains visible without a mask. Snapshot masks
cover the dynamic app card, its portal-rendered application-name field, the
workspace header, and the editor application header; translated menu, editor,
search, and dialog controls remain visible. Generate baselines once with
`--update-snapshots`, then run the same command without that flag for the
non-update verification pass.

## Commands And Results

The branch server became reachable at `http://127.0.0.1:3001` after its initial
webpack build. The required command was run with `PLAYWRIGHT_BASE_URL` pointed
at that server:

```text
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
npx playwright test tests/i18n/core-platform-bilingual-ui.spec.ts --project=smoke

Running 5 tests using 3 workers
1 failed: [signup-setup] sign up with configured credentials
4 did not run
Error: USERNAME and PASSWORD environment variables are required for signup setup
```

The normal `--project=smoke` command runs the `signup-setup` and `setup`
dependencies first. It therefore requires `USERNAME` and `PASSWORD` and
creates `playwright/auth/user.json`; no credentials are committed. When an
existing `playwright/auth/user.json` is already available, `--no-deps` can be
used to skip those setup projects and run only the smoke tests. `--no-deps`
does not create, refresh, or repair the auth state.

An initial Chrome run also established that the environment override reaches
the installed browser, but Playwright's normal video setup stopped on the
missing pinned helper:

```text
Error: browserContext.newPage: Executable doesn't exist at
/home/gavin/.cache/ms-playwright/ffmpeg-1011/ffmpeg-linux
```

With video conditionally disabled only for the executable-path override, the
required command stops at the explicit credential check above. A non-mutating
diagnostic run with `--no-deps` then selected all three smoke tests through
Chrome and stopped before navigation because the configured local storage state
is absent:

```text
Running 3 tests using 3 workers
3 failed
Error reading storage state from playwright/auth/user.json:
ENOENT: no such file or directory, open 'playwright/auth/user.json'
```

Formatting verification passed:

```text
npx prettier --check playwright.config.ts playwright/tests/i18n/core-platform-bilingual-ui.spec.ts
All matched files use Prettier code style!
```

`npx tsc --noEmit -p playwright/tsconfig.json` reaches the new suite but exits
non-zero on the existing unrelated error in
`playwright/fixtures/migration.setup.ts:132`: `GiteaDeployKey` has no
`key_id` property. `git diff --check` passed.

## Red/Green Status

The requested historical Chinese red assertion cannot be reproduced on this
worktree: Tasks 2-4 were already committed before Task 5 began. Green Chrome
workflow execution is blocked by the missing local authenticated fixture,
not by a product assertion. No external accounts were created or used.

## Scope And Credential Gates

- The smoke project continues to discover `playwright/tests/i18n/**`; no `d0`
  or `t9` credential-dependent project was added.
- Local credentials are gated by missing `USERNAME` and `PASSWORD`; setup
  therefore could not authenticate or create `playwright/auth/user.json`. A
  future run with an existing auth state may use `--no-deps` as described above.
- The suite uses the existing authenticated API fixtures to create and clean up
  only local test workspaces/applications once that storage state is supplied.
- The suite does not submit invitations, publish or delete applications, export
  applications, configure data sources, connect Git, or open external links.
- Discord/help/documentation destinations remain excluded and unchanged;
  credential-dependent `d0` and `t9` suites are not exercised.

## Fix Round 1

- Removed the accumulating `page.addInitScript` locale seed. Each workflow now
  loads the authenticated applications route, selects the requested locale in
  the real profile `LanguageSwitcher`, waits for the `PUT /api/v1/users`
  response, and verifies both the document language and persisted locale before
  navigating onward. This keeps authenticated `LocaleSync` and test state in
  the same path used by the product.
- Retained Playwright's default bundled-browser video capture, while disabling
  video only when `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects host Chrome.
  This is required on this host because its Playwright-pinned `ffmpeg` helper
  is unavailable.
- Added narrow screenshot masks for generated application content, including
  the portal-rendered application-name field in its context menu. Translated
  menu actions remain unmasked.

Verification for this round:

```text
npx prettier --check playwright.config.ts playwright/tests/i18n/core-platform-bilingual-ui.spec.ts
All matched files use Prettier code style!

npx playwright test tests/i18n/core-platform-bilingual-ui.spec.ts --project=smoke --list
Total: 5 tests in 3 files (3 workflow tests plus the existing setup dependencies)

git diff --check
passed
```

The Playwright TypeScript check still reports only the pre-existing
`playwright/fixtures/migration.setup.ts:132` `GiteaDeployKey.key_id` error.
Browser execution remains credential-gated as described above; no external
account or auth state was created in this round.

## Fix Round 2

- Serialized the workflow describe because all three tests persist the same
  authenticated user's locale through the profile API.
- Replaced the random workspace fixture with a suite-local fixed name. The
  complete localized invite title is now visible in snapshots rather than
  masking it.
- Kept dynamic portal context-menu application text masked without masking its
  localized actions, and documented the executable-override-only video
  exception.

Verification for this round:

```text
npx prettier --check playwright.config.ts playwright/tests/i18n/core-platform-bilingual-ui.spec.ts ../../docs/superpowers/verification/2026-08-31-celanworkshop-core-platform-bilingual-ui.md
All matched files use Prettier code style!

PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npx playwright test tests/i18n/core-platform-bilingual-ui.spec.ts --project=smoke --list
Total: 5 tests in 3 files (setup dependencies plus the 3 serial workflow tests)

PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npx playwright test tests/i18n/core-platform-bilingual-ui.spec.ts --project=smoke --no-deps
Running 3 tests using 1 worker
1 failed, 2 did not run
Error reading storage state from playwright/auth/user.json:
ENOENT: no such file or directory, open 'playwright/auth/user.json'

git diff --check
passed
```

`npx tsc --noEmit -p playwright/tsconfig.json` still reports only the existing
`playwright/fixtures/migration.setup.ts:132` `GiteaDeployKey.key_id` error; the
new suite and local fixture override add no TypeScript errors.

## Runtime Gate Attempt

Date: 2026-09-01

The branch UI was initially absent from port `3001`. Its first worktree start
also exposed a local dependency-provenance problem: `app/client/node_modules`
was a symlink into the main checkout, so workspace imports resolved outside
this worktree while webpack transpiled only this worktree's `packages/` tree.
The symlink was replaced with a local `yarn install --immutable` dependency
tree; no tracked source files or main-checkout services were changed.

The resulting local integration topology was verified before signup:

- Branch webpack process: `http://127.0.0.1:3002`, working directory
  `/home/gavin/workspace/projects/CelanWorksmith/.worktrees/celanworkshop-core-platform-bilingual-ui/app/client`.
- Project-native ignored Nginx development configuration: `http://127.0.0.1:3001`,
  forwarding UI requests to `3002`, `/api`, `/oauth2`, and `/login` to the
  healthy local backend on `8081`, and `/rts` to local port `8091`.
- Backend: `http://127.0.0.1:8081/api/v1/health` returned `200`; its existing
  process remained in the main checkout's `app/server/dist` directory.
- Provenance checks: `GET /` through `3001` returned the branch UI (`200`), and
  `GET /api/v1/users/current-user` through `3001` returned the backend's
  expected unauthenticated `401`. The same API request sent directly to the
  raw webpack port returned the frontend history fallback, confirming that the
  integration gateway is required for browser authentication.

A uniquely named disposable development credential pair was generated in the
shell only. It was not written to `.env`, source, or a tracked file. The
baseline command used the required local Chrome override:

```text
USERNAME=<redacted-disposable-local-address> \
PASSWORD=<redacted-disposable-password> \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
npx playwright test tests/i18n/core-platform-bilingual-ui.spec.ts --project=smoke --update-snapshots

Running 5 tests using 1 worker
[1/5] playwright/fixtures/signup.setup.ts:13:6 > sign up with configured credentials
Test timeout of 60000ms exceeded.
expect(locator).toBeVisible() failed
Locator: getByTestId('firstName').or(getByPlaceholder('Enter your email'))
Expected: visible
Error: element(s) not found
```

This is a fixture-localization blocker, not a backend signup rejection. The
actual Chrome error context shows the unauthenticated signup page in its
intentional default Chinese locale: `创建你的账户`, `请输入邮箱`, `请输入密码`, and
`注册`. The existing `signup.setup.ts` fixture only searches for English
`Enter your email`, `Enter your password`, and `Sign up`; it therefore never
submits the disposable credentials. `src/i18n/types.ts` defines `zh-CN` as the
default, and the `signup-setup` Playwright project has neither a locale
override nor a storage state from which it could read `appsmith.locale`.

The captured ignored local failure artifacts are:

```text
playwright/results/signup.setup.ts-sign-up-with-configured-credentials-signup-setup/test-failed-1.png
playwright/results/signup.setup.ts-sign-up-with-configured-credentials-signup-setup/error-context.md
playwright/results/signup.setup.ts-sign-up-with-configured-credentials-signup-setup/trace.zip
```

No account was created, `playwright/auth/user.json` was not produced, no
workflow screenshot baseline was written, and the non-update command was not
started after this confirmed baseline failure. Changing the fixture selectors
or seeding its locale would be a source change and is outside this runtime-gate
attempt's explicit constraint. Consequently, the Chrome workflow gate remains
blocked and no green result is claimed.

## Final Local Chrome Evidence

- The final branch webpack runtime was `http://127.0.0.1:3002`; the
  project-native gateway at `http://127.0.0.1:3001` and
  `http://127.0.0.1:3001/api/v1/health` both returned `200` before the final
  browser runs. This strict rerun reused the existing authenticated
  `playwright/auth/user.json` state; the earlier signup-gated attempt and its
  redacted disposable credentials remain documented in the Runtime Gate Attempt
  section above.
- D0 snapshot update and the subsequent no-flag verification each passed:
  `2 passed (29.0s)` and `2 passed (29.1s)`.
- The core update run passed `3 passed (1.9m)`. It writes 12 baselines: three
  workflows, two locales, and desktop/mobile viewports. The no-flag core run is
  the strict stability check for those same files.
- A blank REST API query exposes localized Publish and blank-response Run
  controls, but no save-status DOM because `EditorSaveIndicator` renders only
  while saving or on save error. The browser suite therefore does not assert
  an invisible Save state; Save localization remains covered by
  `src/pages/Editor/EditorChrome.i18n.test.tsx`.
- Screenshots mask generated application content, the feature-flagged Anvil
  CDN empty-state illustration, and volatile editor header/tab chrome. Localized
  controls remain explicit browser assertions. Only the Chinese desktop
  applications screenshot permits `maxDiffPixelRatio: 0.0004` (518 pixels):
  the observed 456-pixel delta was static Chrome anti-aliasing in the Appsmith
  header and Search text, with no layout or product-content difference. Its
  Chinese mobile counterpart permits `0.0011` (363 pixels): the observed
  332-pixel difference was confined to the static `appsmith_` header glyphs.
- The mobile profile/shared-dialog viewport retains a full invite-dialog
  screenshot. It permits `maxDiffPixelRatio: 0.001` for static Chrome
  anti-aliasing. The mobile global-search dialog is captured separately as
  `global-search-<locale>-mobile-390x844.png`; its locator screenshot keeps a
  strict zero-diff threshold and does not purport to be a full viewport.

## Final Strict Verification

- Host Chrome rendered the Chinese workflow with the installed Noto CJK fonts.
  The final snapshots visibly contain Chinese workspace, editor, run, publish,
  search, and dialog text with no missing-glyph fallback.
- The editor workflow follows the native datasource path: `Datasources` ->
  localized blank-state CTA -> `REST API` -> persisted API route reload ->
  `Api1` -> URL entry -> localized `Save URL` -> localized `Save`. It waits for
  the native `POST /api/v1/datasources` response and requires a successful
  status before continuing.
- The route reload is intentional. Creating a REST action before the editor's
  initial `PAGE_LOAD` can leave the URL at an API route while the UI canvas is
  still mounted; reloading the persisted action route initializes the API
  editor from durable state.
- Editor snapshots mask only the center application/workspace breadcrumb via
  `.t--application-name >> xpath=../../../..`. The app-card, workspace, avatar,
  and dialog-user masks cover generated account data only. Localized controls,
  including `Save URL`, `Save`, `Run`, and `Publish`, remain visible and are
  asserted. A scoped test stylesheet hides the remounting CodeMirror URL caret;
  it does not mask the URL field or any localized control.
- Baselines were refreshed with the Chrome executable override. The final
  editor refresh used:

```text
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
npx playwright test tests/i18n/core-platform-bilingual-ui.spec.ts \
  --project=smoke --no-deps --workers=1 \
  --grep 'application editor sidebar and execution chrome' --update-snapshots
```

- Strict verification completed without snapshot updates:

```text
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome \
npx playwright test tests/i18n/core-platform-bilingual-ui.spec.ts \
  --project=smoke --no-deps --workers=1

Running 3 tests using 1 worker
3 passed
```

The serial describe has a scoped 120-second per-test budget. The editor case
creates a datasource, changes the persisted locale twice, and takes four
snapshots; it completed in 55.2 seconds in isolation. The global 60-second
limit left no teardown margin and caused an intermittent Playwright trace
artifact `ENOENT`, not a product or screenshot failure. The strict no-flag
rerun above completed `3 passed (2.3m)` with the scoped budget.

The branch-local Nginx gateway required a development-only `/static/` proxy
override that clears websocket upgrade headers. Without it, the local webpack
server crashed while serving an icon font and Playwright correctly timed out
waiting for `document.fonts`. That ignored configuration is not a source change
and is not staged.
