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
variable, the pinned bundled-browser behavior and video capture remain
unchanged. Chrome-mode video is disabled because this host does not have the
Playwright-pinned `ffmpeg` helper; this prevents an unrelated video-recording
startup failure while preserving the default behavior.

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

An initial Chrome run also established that the environment override reaches
the installed browser, but Playwright attempted to enable video and stopped on
the missing pinned helper:

```text
Error: browserContext.newPage: Executable doesn't exist at
/home/gavin/.cache/ms-playwright/ffmpeg-1011/ffmpeg-linux
```

After the conditional Chrome-only video configuration, the required command
advanced to the explicit credential check above. A non-mutating diagnostic run
with `--no-deps` then loaded all three smoke tests through Chrome and stopped
before navigation because the configured local storage state is absent:

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
- Local credentials are gated by missing `USERNAME`, `PASSWORD`, and
  `playwright/auth/user.json`; setup therefore could not authenticate.
- The suite uses the existing authenticated API fixtures to create and clean up
  only local test workspaces/applications once that storage state is supplied.
- The suite does not submit invitations, publish or delete applications, export
  applications, configure data sources, connect Git, or open external links.
- Discord/help/documentation destinations remain excluded and unchanged;
  credential-dependent `d0` and `t9` suites are not exercised.
