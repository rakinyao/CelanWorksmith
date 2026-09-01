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
`on` for both the bundled browser and an executable override; this preserves
Playwright's normal recording behavior. This host lacks the pinned `ffmpeg`
helper, so a Chrome run can stop during context startup until Playwright's
browser dependencies are installed.

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
`page.addInitScript` storage seeds. Snapshot masks cover only the dynamic app
card, editor application header, and invite heading; translated controls remain
visible. Generate baselines once with `--update-snapshots`, then run the same
command without that flag for the non-update verification pass.

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

With video behavior preserved, the required command stops at the explicit
credential check above. A non-mutating diagnostic run with `--no-deps` then
selected all three smoke tests through Chrome and stopped before navigation
because the configured local storage state is absent:

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
- Restored `video: "on"` when `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` is set;
  the environment variable remains an executable-path-only override.
- Added narrow screenshot masks for the generated application card, workspace
  name, editor application header, and invite heading. The translated menu,
  editor, search, and dialog controls remain unmasked. Baselines must be
  generated once with `--update-snapshots`, followed by a normal non-update
  run.

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
