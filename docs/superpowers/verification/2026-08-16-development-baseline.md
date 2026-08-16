# Development Baseline Checkpoint

Date: 2026-08-16
Branch: `feat/ontology-datasource-plugin`
Status: Baseline committed with documented environment limitations

## Scope

This checkpoint freezes the current native Ontology Datasource architecture
and the T9 application release foundation before additional development. It
does not claim production readiness. The active runtime uses the Appsmith
Datasource, Query, Action, DataTree, and Widget paths; the retired ontology
side-channel paths remain excluded.

## Environment

- Backend: `celanworksmith-backend.service`, listening on `127.0.0.1:8081`.
- Frontend: development server on port `3000`.
- nginx: port `80`.
- RTS: port `8091`.
- MongoDB: `localhost:27017`.
- Redis: `localhost:6379`.
- Health endpoint: `/api/v1/health` returned HTTP `200`.
- Browser validation used one worker at a time to limit memory usage.

## Verification Results

### Server and plugin

- Ontology PF4J plugin suite: `45` tests passed.
- Native Ontology server suite: `83` tests passed.
- T9 release server suite: `66` tests passed.
- Backend package build with tests skipped: passed.
- MongoDB-backed tests connected successfully.

### Client

- Native Ontology, Widget, autocomplete, diagnostics, and release suites:
  `13` suites and `65` tests passed with `--runInBand`.
- Prettier checks for changed native/release/browser files: passed.
- `git diff --check`: passed.
- Existing React `act` and icon-mock warnings remain non-blocking test-harness
  warnings.

### Browser

- Playwright D0 native import/persistence: `1/1` passed in `11.6s`.
- Playwright T9 release lifecycle: `1/1` passed in `36.0s`.
- Cypress native Table execution path: `1/1` passed in Electron in `1m20s`.
  The test verified no duplicate execution during binding and one execution
  after explicit Query Run.

## Limitations

- Full client `tsc --noEmit` was attempted with 1.5 GB and 2 GB Node heaps and
  exhausted the heap in both runs. No TypeScript diagnostic was emitted before
  the process failed; no further heap increase was attempted because the host
  has only about 4.4 GB available memory and swap is exhausted.
- Full ESLint over the selected client files also exhausted a 1 GB Node heap.
  Targeted Jest, Prettier, server compilation, and browser validation passed.
- Cypress Chromium is unavailable on this host. The Cypress test passed with
  the bundled Electron browser after unsetting the inherited
  `ELECTRON_RUN_AS_NODE=1` environment variable. The missing root `.env`
  produced a warning, but all required test credentials were supplied through
  the command line and the test completed.
- The optimized frontend production build remains excluded because this host
  previously terminated it with exit code `137`; this is a host-capacity
  limitation, not a functional test result.

## Deferred Boundaries

- Action Server asynchronous protocol, authorization, retry, timeout,
  progress, and audit persistence remain deferred until the external contract
  is finalized.
- Production Ontology management-platform Provider and production ACL policy
  remain future work.
- Table search, pagination, column configuration, and broader Widget usability
  remain native-path follow-up work.

## Baseline Decision

The tested development state is suitable as the next development baseline for
native-path hardening. The memory-limited TypeScript/ESLint checks and deferred
production boundaries must remain visible in future release notes and must not
be interpreted as full production certification.
