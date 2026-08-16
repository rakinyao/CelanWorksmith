# Table V2 Native Query Usability Verification

Date: 2026-08-16

## Scope

Task 4 verifies the active `TableWidgetV2` native Query behavior against the
design constraints in
`docs/superpowers/specs/2026-08-16-table-v2-native-query-usability-design.md`.
No production code was modified during this verification.

## Focused Jest

Command, run from `app/client`:

```bash
ELECTRON_RUN_AS_NODE= yarn jest src/widgets/TableWidgetV2/widget --runInBand --no-cache
```

Result: exit code `0`.

- Test suites: `20 passed, 20 total`
- Tests: `230 passed, 230 total`
- Snapshots: `0`
- Runtime: `36.358 s`

The complete focused V2 widget directory suite passed serially. This includes
the native Query binding, schema, search, pagination, loading, empty/error,
and rendered Table coverage present in the selected directory.

## Browser Smoke

The existing native browser smoke scenario is
`app/client/cypress/e2e/CelanWorksmith/OntologyDatasourceNativePath_spec.ts`.
It uses the existing Cypress Electron path and checks native Table binding and
request-count behavior. It does not cover all of the new height, search, and
pagination manual criteria in this task.

The smoke test was not run because the required local development frontend was
unavailable in this environment:

- `http://127.0.0.1:80` returned HTTP `502`.
- `http://127.0.0.1:3000` refused the connection.
- Backend health at `http://127.0.0.1:8081/api/v1/health` returned HTTP `200`,
  but that does not provide a usable frontend session.
- `CW_D0_USERNAME`, `CW_D0_PASSWORD`, and `CW_D0_WORKSPACE_ID` were unset.
- `Xvfb` and the existing Cypress binary were present.

Therefore no browser pass count is claimed. The smoke command was deliberately
not started, and no Cypress configuration or service setup was changed.

## Diff Audit

Commands:

```bash
git diff c5c9a7dc67..HEAD --check
git diff c5c9a7dc67..HEAD --stat
git status --short
```

The reviewed range contains only `TableWidgetV2` implementation/tests and the
associated plan/spec documents. The static audit found:

- No `$objects`, `$functions`, `$actions`, `$variables`, Object Widget mode,
  ontology-specific reducer, refresh coordinator, or second execution path.
- No new datasource adapter.
- No non-English user-facing additions in the changed V2 source.
- No changes to the old Table widget or unrelated Widget implementations.

`git diff --check` reported one existing whitespace issue in the reviewed
range: `docs/superpowers/specs/2026-08-16-table-v2-native-query-usability-design.md:142`
has a blank line at EOF. It was not changed during this verification.

## Limits And Manual Checks

Verified by this task: focused V2 Jest behavior and the static architecture/
scope audit. Not verified here: browser execution against a live Demo Ontology
Datasource, generated columns in the running editor, client-side versus
server-side search transitions, next/previous pagination in the browser, Widget
height changes with a valid finite page indicator, and duplicate Query request
counts during those interactions.

The following manual/browser checks remain required when the D0/T9 local
frontend and credentials are available:

1. Bind a native Ontology Query returning Demo Ontology rows to the active V2
   Table and confirm generated columns render.
2. Confirm configured labels, aliases, order, visibility, widths, types, sort,
   and custom cell expressions survive equivalent and value-only row updates.
3. Exercise client-side search with no searchable server field and
   server-side search with one; confirm each resets to page one and neither
   path triggers the other.
4. Exercise next and previous pagination, empty/loading/error results, and
   zero-row results; confirm page indicators remain finite and bounded.
5. Change Widget height on a non-first page; confirm page size recalculates,
   the page is clamped, and no duplicate Query execution occurs.
6. Repeat the existing one-worker Cypress native smoke scenario and record its
   request count after the Table binding and after one explicit Query Run.

Full client TypeScript, full ESLint, and production build checks were not run;
the task brief identifies them as OOM-prone baseline checks and they remain a
separate machine-capacity limitation.
