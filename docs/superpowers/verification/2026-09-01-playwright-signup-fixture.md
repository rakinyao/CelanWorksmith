# Playwright Signup Fixture Verification

Date: 2026-09-01

## Root Cause

`playwright/fixtures/signup.setup.ts` located the legacy signup form by
English placeholders and located its submit controls by English accessible
names. The branch application defaults to `zh-CN`, so the fixture timed out
while waiting for the first signup control before submitting credentials.
`auth.setup.ts` had the same locale coupling and would have failed immediately
after signup was repaired.

## Fix

- Legacy signup detection and fields use `#signup-form` plus `input[name]`.
- Empty-instance fields use `#super-user-form` and existing `data-testid`
  hooks.
- Setup actions use the existing stable button classes and submit type.
- Login fields and submit use the `.t--login-container form` and `input[name]`
  / `button[type=submit]` selectors.

No locale was forced or seeded, and no product source was changed.

## Verification

Formatting passed:

```text
yarn exec prettier --check playwright/fixtures/signup.setup.ts playwright/fixtures/auth.setup.ts
All matched files use Prettier code style!
```

Whitespace validation passed:

```text
git diff --check
passed
```

The Playwright TypeScript check reaches the existing unrelated error:

```text
yarn tsc --noEmit -p playwright/tsconfig.json
playwright/fixtures/migration.setup.ts(132,66): error TS2339:
Property 'key_id' does not exist on type 'GiteaDeployKey'.
```

The required disposable-credential setup command was attempted against the
branch gateway:

```bash
USERNAME="pw-signup-$(date +%s)@example.com" \
PASSWORD='Playwright!2026Strong' \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 \
npx playwright test --project=signup-setup --reporter=line
```

The run could not launch because this host has no pinned Playwright browser:

```text
Executable doesn't exist at
/home/gavin/.cache/ms-playwright/chromium_headless_shell-1217/.../chrome-headless-shell
```

`npx playwright install chromium` cannot install it on this host because the
installed Playwright release reports `ubuntu26.04-x64` as unsupported. A
follow-up check against `http://127.0.0.1:3001/user/signup` returned `502`
consistently; nginx reported `connect() failed (111: Connection refused)` to
upstream `127.0.0.1:3002`. Therefore no account was created and
`playwright/auth/user.json` was not generated in this run.
