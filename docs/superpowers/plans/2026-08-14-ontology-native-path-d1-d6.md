# Ontology Native Path D1-D6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the native Ontology Datasource path from pinned metadata and query authoring through native Widgets, Action Server protocol boundaries, project engineering, developer experience, and an auditable development checkpoint.

**Architecture:** Ontology remains a first-class Appsmith Datasource beside DB/API sources. All queries and actions use the native Action, DataTree, evaluation, and Widget paths; metadata is resolved from the pinned snapshot through the PF4J plugin. Worksmith validates and routes Action Server requests but does not implement write-back business logic.

**Tech Stack:** Java 25, Spring WebFlux, MongoDB, PF4J, Appsmith plugin resources, React/TypeScript, Jest, Maven, Playwright.

## Global Constraints

- Ontology remains a first-class Datasource beside DB and API sources.
- Native Query/JS mode remains available.
- Do not restore `$objects`, `$functions`, `$actions`, `$variables`, Object Widget modes, or parallel Redux/Saga execution chains.
- Reuse the standard Datasource, Action, DataTree, evaluation, and Widget paths.
- All new visible UI text is English and uses the existing i18n mechanism.
- Pinned project version, metadata snapshot, digest, Provider, workspace, and Datasource identity are immutable query context.
- One App must not bind multiple active versions of the same Ontology Project.
- Action Server business execution remains outside Worksmith.
- No production deployment or availability work is required; verification targets the current development environment.

## File Map

- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/`: native plugin configuration, metadata, query validation, and execution.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/`: native Query editor forms and controls.
- `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/`: snapshot, Provider, Datasource lifecycle, upgrade, and Action Server boundary services.
- `app/client/src/pages/Editor/PluginActionEditor/`: only the native editor extension seam when plugin resources cannot express pinned metadata controls.
- `app/client/src/widgets/`: only native Widget compatibility corrections; no Object-mode implementation.
- `app/client/src/i18n/resources/en-US.ts`: English UI keys for new user-visible states.
- `docs/superpowers/verification/`: one evidence record per gate.

### Task 1: D1 - Pinned Metadata and Native Query Editor

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/function-query.json`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/action-query.json`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/link-query.json`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyConfigurationTest.java`
- Modify/Create: focused native PluginActionEditor test only if plugin resources cannot express the behavior.
- Create: `docs/superpowers/verification/2026-08-14-ontology-native-path-d1.md`

**Interfaces:** Metadata triggers consume the pinned Datasource snapshot and return stable IDs, safe display labels, data types, enum values, reference types, and read-only/derived flags. Object Query configuration serializes `objectTypeId`, optional projection, typed filters, sort, offset, and limit through `definition` while excluding immutable context fields.

- [x] Write failing plugin tests for rich metadata labels, hidden-property filtering, invalid ID rejection, typed projection/filter/sort/page validation, and preservation of standard array results.
- [x] Run the focused plugin suite and verify the failures are caused by missing behavior.
- [x] Implement rich metadata response and minimal native editor resource controls; keep snapshot validation at execution time.
- [x] Run focused plugin and client suites, Prettier, scoped ESLint, and `git diff --check`.
- [x] Record D1 evidence and link the completed D0 execution-count gate.

### Task 2: D2 - Native Widget Compatibility

**Files:**
- Modify: `app/client/src/widgets/TableWidget/widget/index.tsx` and/or `TableWidgetV2/widget/index.tsx` only for native Query result behavior.
- Modify: `app/client/src/widgets/ListWidget/widget/index.tsx`, `ListWidgetV2/widget/index.tsx`, `FormWidget/widget/index.tsx`, `JSONFormWidget/widget/index.tsx`, `SelectWidget/widget/index.tsx`, `DropdownWidget/widget/index.tsx`, and `ChartWidget/widget/index.tsx` only where a verified native Query compatibility gap exists.
- Test: corresponding existing Widget test files and `app/client/src/widgets/TableWidget/widget/nativeQueryMode.test.ts`.
- Create: `docs/superpowers/verification/2026-08-14-ontology-native-path-d2.md`.

**Interfaces:** Widgets consume ordinary `Query.data`, `Query.isLoading`, `Query.run()`, and native pagination/error state. No Widget reads ontology-specific Redux state or a legacy DataTree root.

- [x] Add failing native regression tests for array rows, empty results, loading/error states, columns, pagination inputs, and form field values.
- [x] Compare the ontology Query path with the nearest DB/API Query path and identify the first failing native boundary.
- [x] Apply the smallest native Widget/evaluation fix without adding ontology-specific state.
- [x] Run affected Widget suites, native DB/API regression tests, formatting, ESLint, and `git diff --check`.
- [x] Record D2 acceptance evidence and residual UI usability items separately from architecture gates.

### Task 3: D3 - Action Server Protocol Boundary

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionServerClient.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/WorkspaceActionServerConfigurationResolver.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Test: `OntologyFunctionLinkActionExecutorTest.java` and workspace configuration tests.
- Create: `docs/superpowers/verification/2026-08-14-ontology-native-path-d3.md`.

**Interfaces:** Action requests carry pinned project/version/datasource context, stable Action/Object IDs, parameters, request/idempotency identity, and metadata snapshot identity. Responses preserve audit ID, asynchronous status, progress, domain errors, and standard Appsmith `ActionExecutionResult` semantics.

- [x] Add failing tests for success, audit ID, domain failure, malformed response, and caller context override rejection; defer asynchronous acknowledgement and progress until the external protocol is defined.
- [x] Implement protocol decoding and error mapping through the existing native Action execution path.
- [x] Verify no direct write or business Action execution exists in Worksmith.
- [x] Run focused plugin/server tests and record D3 evidence.

### Task 4: D4 - Ontology Project Engineering

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/LocalYamlOntologyProjectImporter.java`
- Modify: `PlatformOntologyProjectImporter.java`, `OntologySnapshotService.java`, `OntologyDatasourceUpgradeService.java`, and related repositories only for verified gaps.
- Test: import, digest, uniqueness, upgrade, rollback, Provider health, and Datasource sharing tests.
- Create: `docs/superpowers/verification/2026-08-14-ontology-native-path-d4.md`.

**Interfaces:** YAML and platform release imports normalize into the same immutable snapshot. Multiple Apps may share one Datasource. Upgrades are explicit, version-pinned, audited, compatibility-checked, and rollback-capable.

- [x] Add failing tests for YAML/platform parity, stable digest, duplicate active version rejection, upgrade impact report, explicit approval, rollback, and Provider health failure.
- [x] Implement only missing importer/upgrade behavior using existing snapshot and Datasource services.
- [x] Run focused server suites and verify no automatic version switching exists.
- [x] Record D4 evidence.

### Task 5: D5 - Developer Experience and Diagnostics

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts` and related native editor/property components.
- Modify: existing native metadata/autocomplete and debug surfaces only through standard selectors and DataTree definitions.
- Test: focused metadata, autocomplete, diagnostics, error-state, and i18n suites.
- Create: `docs/superpowers/verification/2026-08-14-ontology-native-path-d5.md`.

**Interfaces:** User-visible states show English loading, empty, permission, validation, Provider, and Action Server errors. Metadata display names, descriptions, type/required/read-only flags, and safe semantic hints are derived from the pinned snapshot; sensitive values are filtered.

- [x] Add failing tests for English-only visible copy, safe metadata descriptions, autocomplete of native Query fields, unavailable metadata, and redacted diagnostics.
- [x] Implement focused i18n/metadata presentation corrections without restoring ontology roots or parallel loading state.
- [x] Run focused client suites, formatting, scoped ESLint, and `git diff --check`.
- [x] Record D5 evidence and deferred usability enhancements separately.

### Task 6: D6 - Full Development Checkpoint

**Files:**
- Create: `docs/superpowers/verification/2026-08-14-ontology-native-path-d6.md`.
- Modify: D0-D5 verification records only to correct factual command/results.
- Test: the complete focused native server/plugin/client suite and Playwright D0 scenario.

**Interfaces:** The checkpoint consumes all D1-D5 contracts and produces a reproducible development baseline for later production-provider, authorization, and release work.

- [x] Run focused plugin, server, client, and Playwright checks serially.
- [x] Run the native Table repeated-execution scenario and capture request-count evidence before marking D0 passed.
- [x] Run `git diff --check`, health checks, and active legacy-path search.
- [x] Review the branch against all global constraints and record residual risks.
- [x] Mark D6 complete with all acceptance evidence present; do not create a Git commit unless explicitly requested.

## Execution Order

Execute D1, review it, then D2, D3, D4, D5, and D6 in order. Each task requires a fresh implementer, a scoped reviewer, focused tests, and an evidence update. Do not dispatch parallel implementers with overlapping write sets.
