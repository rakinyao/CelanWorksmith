# Native Ontology Next Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the native Ontology Datasource integration and make its Query,
Widget, runtime-state, and diagnostics behavior production-shaped in the
development environment without entering T9.

**Architecture:** Keep Ontology as a standard Appsmith Datasource beside DB and
API sources. All work must reuse native Datasource, Action, DataTree,
evaluation, Query, and Widget paths. The plan improves the native path in
independent gates and does not restore `$objects`, `$functions`, `$actions`,
`$variables`, Object Widget modes, or ontology-specific Redux/Saga execution.

**Tech Stack:** Appsmith PF4J plugins, Java/Spring WebFlux, MongoDB development
Provider, React/TypeScript, Redux native Datasource state, Jest, Maven,
Playwright/Cypress, and existing i18n resources.

## Global Constraints

- Ontology remains a first-class Datasource beside DB and API sources.
- Native Query/JS mode remains available.
- Widgets consume ordinary Query results such as `{{Query.data}}` and
  `{{Query.run()}}`.
- No ontology-specific Widget mode, DataTree root, Redux reducer, Saga, or
  refresh coordinator may be introduced.
- One Datasource pins one immutable project/version/snapshot/digest/provider
  tuple.
- One App cannot use two active versions of the same Ontology Project.
- Runtime collection names, endpoints, and Provider credentials stay behind
  the Runtime Provider and are not stored in Query or Widget configuration.
- Worksmith maps Action Server requests/results but does not implement business
  execution, write-back, authorization, or audit policy.
- All new visible UI copy is English and uses existing i18n keys; no new
  bilingual UI strings are allowed.
- Each phase is independently testable and must have a verification record
  before the next phase begins.
- Shared production files are modified serially. Each implementation task uses
  a short timebox, focused tests, and a scoped review.
- T9 application publishing, release snapshots, and production deployment are
  excluded from this plan.

## Phase Map

| Phase | Focus | Gate |
| --- | --- | --- |
| H0 | Baseline and evidence normalization | Reproducible service/test baseline and no contradictory active guidance |
| H1 | Native Query editor and metadata usability | A developer can author a valid query using display names and pinned IDs |
| H2 | Native Table and Widget result compatibility | Table/JSONForm/List/Select consume stable native results without duplicate execution |
| H3 | Loading, empty, error, permission, and refresh semantics | Every native state is readable and refreshes only through native execution |
| H4 | Action and Link interaction hardening | Native Action/Link behavior, errors, and local invalidation are deterministic |
| H5 | Platform Provider and upgrade readiness | YAML/platform imports, health checks, explicit upgrades, and rollback remain equivalent |
| H6 | Localization, diagnostics, and release-readiness review | Development baseline is documented; T9 remains a separate approved project |

## Phase H0: Baseline and Evidence Normalization

**Purpose:** Establish a clean handoff before behavior changes.

**Files:**

- Review: `docs/superpowers/verification/2026-08-15-native-ontology-stage-checkpoint.md`
- Review: `docs/superpowers/verification/2026-08-14-ontology-native-path-d*.md`
- Review: `docs/superpowers/designs/2026-08-13-ontology-datasource-plugin-design.md`
- Review: `app/server/appsmith-server/src/main/resources/celanworksmith/demo-ontology-project.yaml`
- Create: `docs/superpowers/verification/2026-08-15-native-ontology-h0.md`

**Work:**

- [x] Record the exact backend working directory (`app/server/dist`), frontend
  entrypoint, Runtime Provider, test data identity, and health URLs.
- [x] Mark older side-channel verification documents as historical or
  superseded where their active guidance conflicts with the native contract.
- [x] Run the focused plugin, server, client, Playwright, and Cypress checks
  serially and record their actual results.
- [x] Confirm the active-source audit remains empty for retired ontology roots
  and Object Widget mode.

**Acceptance:** A new developer can reproduce the native Demo import and one
native Table execution from the H0 record without relying on retired docs.

## Phase H1: Native Query Editor and Metadata Usability

**Purpose:** Make native ontology Query authoring understandable without
changing the persisted or runtime architecture.

**Files:**

- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Modify: `app/client/src/pages/Editor/PluginActionEditor/` only if plugin resources cannot render the controls
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Test: plugin configuration/metadata tests and native editor tests
- Create: `docs/superpowers/verification/2026-08-15-native-ontology-h1.md`

**Work:**

- [x] Add regression tests for display label, stable ID, description, data type,
  required/read-only, enum, and reference metadata.
- [x] Add regression tests proving hidden properties cannot appear in projection,
  Function parameters, or Action parameters.
- [x] Replace free-form Object/Property/Function/Action/Link identifiers with
  metadata-driven native selectors where the existing plugin editor supports
  them.
- [x] Keep advanced JSON editing pointed at the same normalized definition and
  validate every ID against the pinned snapshot at save and run time.
- [x] Add only English i18n keys for labels, helper text, and validation errors.

**Acceptance:** A Query author can select `Purchase Order` while the saved
configuration retains `PurchaseOrder`; invalid or hidden IDs fail before
Provider execution; existing DB/API query editors are unchanged.

## Phase H2: Native Widget Result Compatibility

**Purpose:** Verify and fix the first failing native boundary for common Widgets
without creating ontology-specific rendering.

**Files:**

- Modify only when a regression is proven: `app/client/src/widgets/TableWidget/`,
  `TableWidgetV2/`, `JSONFormWidget/`, `ListWidget/`, `SelectWidget/`,
  `DropdownWidget/`, `ChartWidget/`, and `FormWidget/`
- Test: adjacent native Query/Widget suites and new focused regression tests
- Create: `docs/superpowers/verification/2026-08-15-native-ontology-h2.md`

**Work:**

- [x] Add regression tests for array rows, empty arrays, loading, columns,
  pagination parameters, form values, option arrays, and selected-row state.
- [x] Compare the native Ontology Query boundary with the nearest DB/API Query
  contract using the same Widget inputs and assert that the Widget receives
  the same native shape.
- [x] No native boundary failure was demonstrated; no production change was
  required. No object adapter, ontology-specific selector, or second refresh
  path was added.
- [x] Retain the H0 browser scenario for Table binding and one explicit Run.
  It counts `/api/v1/actions/execute` requests to detect duplicate execution.

**Acceptance:** Table, JSONForm, List, and Select consume native ontology Query
results with the same result contract as DB/API queries; binding stabilization
does not execute the Query repeatedly.

## Phase H3: Runtime State and Refresh Semantics

**Purpose:** Make loading, empty, error, permission, Provider, and refresh
states explicit and deterministic on the native path.

**Files:**

- Modify: native Action/DataTree selectors and existing error/loading surfaces
  only where a failing H2/H3 test identifies a gap
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Test: native Action execution, DataTree, Query, and Widget state suites
- Create: `docs/superpowers/verification/2026-08-15-native-ontology-h3.md`

**Work:**

- [x] Define and verify the covered native transitions for initial load, manual
  Run, empty success, Provider failure, permission denial, and stale metadata;
  unsupported external policy remains represented by structured native errors.
- [x] Add regression tests for each covered transition and for preserving the
  last valid native result while a new run is pending.
- [x] Verify refresh through the existing native Query/Action execution path;
  no ontology refresh coordinator was added.
- [x] Retain structured backend/plugin error responses for the existing native
  debugger surface; detailed English error-code mapping remains H6 scope.

**Acceptance:** Every supported state has deterministic native behavior,
structured diagnostics, English presentation, and no duplicate requests.

## Phase H4: Action and Link Interaction Hardening

**Purpose:** Complete the native interaction boundary while leaving business
execution and authorization in Action Server.

**Files:**

- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionServerClient.java`
- Modify: workspace Action Server resolver/configuration classes only for the
  agreed protocol
- Modify: native Action execution state surfaces only where tests identify a gap
- Test: `OntologyFunctionLinkActionExecutorTest.java`, Action execution suites,
  and native Link query tests
- Create: `docs/superpowers/verification/2026-08-15-native-ontology-h4.md`

**Work:**

- [x] Freeze the current synchronous acknowledgement, audit, idempotency, and
  domain-error boundary; defer asynchronous acknowledgement/progress/timeout
  fields until the external Action Server protocol is frozen.
- [x] Add regression tests for success, domain failure, malformed response,
  transport failure, audit ID retention, idempotency identity, and
  caller-context override rejection.
- [x] Keep response mapping through the existing native Action path only.
- [x] Add Link query tests for stable IDs, empty related results, Provider
  failure, and pinned snapshot validation.
- [x] Keep invalidation/refetch within existing native Query run or dependency
  mechanisms; no Widget state mutation path was added.

**Acceptance:** Action and Link Queries have native success/error/loading
behavior, audit identity is retained, and no Worksmith code performs business
write-back.

## Phase H5: Platform Provider and Upgrade Readiness

**Purpose:** Make the development exchange format and future platform adapter
interchangeable without changing Apps or Queries.

**Files:**

- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/`
- Modify: `app/server/appsmith-server/src/main/resources/celanworksmith/demo-ontology-project.yaml`
- Test: importer parity, digest, Provider compatibility, upgrade, rollback,
  uniqueness, and health suites
- Create: `docs/superpowers/verification/2026-08-15-native-ontology-h5.md`

**Work:**

- [x] Use the existing platform release and local YAML fixtures to compare
  normalized pinned snapshot behavior.
- [x] Verify stable digest and identity preservation across import paths.
- [x] Verify Provider compatibility and health checks before activation and
  that existing pinned Apps cannot switch implicitly.
- [x] Verify explicit upgrade produces an impact report, audit record, and
  rollback path; automatic version switching remains prohibited.

**Acceptance:** Replacing YAML with a platform release changes only the
  importer/provider adapter; native Query definitions and Widget bindings stay
  unchanged.

## Phase H6: Localization, Diagnostics, and Release-Readiness Review

**Purpose:** Consolidate developer-facing usability and document the boundary
before a separately approved T9 project.

**Files:**

- Modify: `app/client/src/i18n/resources/en-US.ts` and native diagnostics/editor
  surfaces
- Review: `docs/superpowers/designs/2026-08-13-ontology-datasource-plugin-design.md`
- Create: `docs/superpowers/verification/2026-08-15-native-ontology-h6.md`
- Create: `docs/superpowers/plans/2026-08-15-t9-application-release-plan.md` only after H0-H5 pass and T9 is explicitly approved

**Work:**

- [x] Audit all newly introduced active copy for English i18n coverage and
  confirm no accidental bilingual UI strings.
- [x] Verify safe metadata descriptions and redacted diagnostics without
  exposing credentials or Provider endpoints.
- [x] Review query authoring, native error location, Action progress boundary,
  and Link interaction against the native Appsmith model.
- [x] Run the complete focused server/plugin/client/browser suite serially and
  publish the final development checkpoint.
- [x] Record explicit non-goals for production ACL, production Providers,
  Action Server authorization, and T9 release behavior.

**Acceptance:** The development baseline is documented, reproducible, and
ready for a separate T9 decision. H6 does not implement publishing or release
runtime behavior.

## Execution Rules

Execute H0 through H6 serially. Within each phase, split work into short tasks
with one implementation owner and one scoped reviewer. Run focused tests before
broader tests. Do not run parallel production edits or concurrent memory-heavy
Webpack/Jest processes. Mark a phase blocked only when the same external or
environmental blocker has recurred three times and no meaningful local work
remains.

Each phase must produce:

1. focused tests and their exact command/results;
2. a scoped review result;
3. a verification document under `docs/superpowers/verification/`;
4. a list of deferred issues that do not alter the native architecture.
