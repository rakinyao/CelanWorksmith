# Ontology Datasource Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Widget/Object-mode ontology path with a standard Appsmith ontology datasource plugin whose native Queries feed the existing Action/DataTree/Widget pipeline.

**Architecture:** Add a PF4J datasource plugin for query execution and metadata-driven query configuration. Add small application-server services for immutable project snapshots, workspace datasource import/upgrade, provider validation, and demo data bootstrap. Once the native path passes end-to-end validation, remove the temporary Widget/DataTree/Redux ontology path rather than maintaining compatibility.

**Tech Stack:** Appsmith PF4J plugins, Java 17, Spring WebFlux, MongoDB reactive driver, MongoDB test fixtures, React/TypeScript, Redux only for Appsmith's existing datasource/action state, Jest, Maven.

## Global Constraints

- Follow `docs/superpowers/process/subagent-execution-constraints.md`: short serial implementation tasks, one scoped review after each task, and no parallel production edits.
- Do not add ontology-specific Widget modes, Redux reducers, Sagas, DataTree roots, or AppIDE loader paths.
- Use standard Appsmith Datasource and Action entities; Widgets consume only ordinary `Query.data`/`Query.run()` values.
- One datasource pins one immutable `projectId + projectVersion + metadataSnapshotId + metadataDigest` tuple.
- Block a second active project version per `applicationId + ontologyProjectId`.
- Treat Mongo as the read-only demo Runtime Provider only. Do not leak collection names or endpoint details into Query or Widget configuration.
- Keep Action Server to one workspace configuration; implement a protocol adapter and test double only, never business write logic.
- Do not remove the old path until Task 12's native end-to-end gate passes.
- Run targeted tests serially; the development host has previously OOM-killed parallel Webpack/Jest work.
- All newly introduced user-facing UI copy is English only and must use existing `react-i18next` keys in `app/client/src/i18n/resources/en-US.ts`; do not render bilingual text or hard-code UI strings in components.
- Add Chinese translations only in a future localization iteration. New ontology keys must have a clear namespace and English fallback; ontology metadata display names remain authored data, not translated UI chrome.

## Target File Map

| Area | Planned responsibility |
| --- | --- |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/` | PF4J plugin module, datasource form, query editor resources, executor, plugin tests |
| `app/server/appsmith-plugins/pom.xml` | Registers the ontology plugin Maven module |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/` | Snapshot, source import, compatibility, Provider registry, workspace datasource services/controllers |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/actionserver/` | Workspace Action Server configuration and client abstraction |
| `app/server/appsmith-server/src/main/resources/celanworksmith/` | Demo YAML and test/runtime configuration |
| `app/client/src/pages/Editor/IntegrationEditor/` | Datasource import entry and project chooser only |
| `app/client/src/pages/Editor/PluginActionEditor/` | Metadata-driven ontology query editor controls registered through normal plugin metadata |
| `app/client/src/i18n/resources/en-US.ts` | English ontology datasource/import/query labels, help text, validation, and status keys |
| `app/client/src/celanworksmith/legacy/` | Temporary staging location for readable retired code before final archive move |
| `docs/superpowers/verification/` | Task and phase verification records |

---

### Task 1: Confirm native plugin extension seam

**Files:**
- Inspect: `app/server/appsmith-plugins/mongoPlugin/pom.xml`, `src/main/resources/plugin.properties`, `form.json`, `editor/root.json`, and `src/main/java/com/external/plugins/MongoPlugin.java`
- Inspect: `app/client/src/entities/Plugin/index.ts`, `app/client/src/entities/Action/index.ts`, `app/client/src/pages/Editor/PluginActionEditor/`
- Create: `docs/superpowers/verification/2026-08-13-ontology-plugin-seam-audit.md`

**Consumes:** current Appsmith PF4J plugin/resource conventions.

**Produces:** an audited exact registration/resource list for Tasks 2-8, including the chosen closest plugin exemplar and frontend configuration rendering boundary.

- [ ] **Step 1: Write the seam audit checklist**

Record the exact class implementing `PluginExecutor`, PF4J resource files, Maven packaging/shading steps, and how one existing DB plugin passes action configuration fields to the native query editor.

- [ ] **Step 2: Verify the audit against a clean compile target**

Run: `cd app/server && mvn -pl appsmith-plugins/mongoPlugin -am test -DskipTests`

Expected: the exemplar module resolves without requiring the development server.

- [ ] **Step 3: Record no-code decision**

The audit must state whether plugin JSON forms alone can provide the visual query editor. If not, list the smallest native `PluginActionEditor` extension required; do not create it in this task.

- [ ] **Step 4: Scoped review**

Review only the audit for incorrect inferred paths/interfaces and update it before Task 2.

---

### Task 2: Create plugin module skeleton and configuration contracts

**Files:**
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/pom.xml`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/plugin.properties`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/form.json`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/setting.json`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyDatasourceConfiguration.java`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`
- Test: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyConfigurationTest.java`
- Modify: `app/server/appsmith-plugins/pom.xml`

**Consumes:** Task 1 seam audit.

**Produces:** `OntologyDatasourceConfiguration.from(DatasourceConfiguration)` and `OntologyActionConfiguration.from(ActionConfiguration)` that preserve the stable datasource/action contract and validate required fields.

- [ ] **Step 1: Write failing configuration tests**

Cover a valid pinned datasource config; missing snapshot ID; invalid digest; an `OBJECT_QUERY` with `objectTypeId`; and rejection of an Action config that tries to set project version or caller context.

- [ ] **Step 2: Run configuration test**

Run: `cd app/server && mvn -pl appsmith-plugins/celanworksmithOntologyPlugin -Dtest=OntologyConfigurationTest test`

Expected: compilation/test failure because the module and contracts do not exist.

- [ ] **Step 3: Add minimal PF4J module and contracts**

Match the audited plugin module dependency/shading structure. The datasource form contains read-only/imported fields: project name, project version, source kind, provider identifier, snapshot ID, and digest. It must not expose runtime table mappings or Action Server credentials.

- [ ] **Step 4: Re-run targeted tests**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Scoped review**

Check only module registration, package/resource names, immutable field validation, and accidental exposure of runtime/action-server configuration.

---

### Task 3: Persist immutable ontology metadata snapshots

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyMetadataSnapshot.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyMetadataSnapshotRepository.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologySnapshotService.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologySnapshotServiceTest.java`

**Consumes:** current ontology project DTO/parser and Mongo persistence patterns.

**Produces:** `createSnapshot(ImportedOntologyProject project): Mono<OntologyMetadataSnapshot>` and `getRequiredSnapshot(String snapshotId, String digest): Mono<OntologyMetadataSnapshot>`.

- [ ] **Step 1: Write failing tests**

Assert canonical digest stability for equivalent YAML/platform payloads, immutable snapshot reads, digest mismatch rejection, and stable project/version/source/provider fields.

- [ ] **Step 2: Run snapshot service test**

Run: `cd app/server && mvn -pl appsmith-server -Dtest=OntologySnapshotServiceTest test`

Expected: FAIL because the snapshot service is absent.

- [ ] **Step 3: Implement snapshot entity, canonical serialization, and repository**

Persist a normalized metadata tree with source (`platform-release` or `local-yaml`), release ID when supplied, provider ID, project/version, creation actor/time, and SHA-256 digest. Never update a stored snapshot.

- [ ] **Step 4: Re-run the targeted test**

Expected: PASS.

- [ ] **Step 5: Scoped review**

Verify no live metadata lookup is hidden in `getRequiredSnapshot` and no mutable collection update exists.

---

### Task 4: Normalize import sources and bootstrap the demo project

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyProjectImportSource.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/LocalYamlOntologyProjectImporter.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/PlatformOntologyProjectImporter.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/DemoOntologyProjectBootstrap.java`
- Create: `app/server/appsmith-server/src/main/resources/celanworksmith/demo-ontology-project.yaml`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyProjectImportTest.java`

**Consumes:** Task 3 `OntologySnapshotService` and existing YAML project parser.

**Produces:** `importProject(ImportRequest): Mono<OntologyMetadataSnapshot>` for `LOCAL_YAML`, `PLATFORM_RELEASE`, and `DEMO` source kinds.

- [ ] **Step 1: Write failing import tests**

Cover valid local YAML; a platform release response test double; unsupported source; malformed metadata; and bootstrap of the fixed demo project/version/provider ID.

- [ ] **Step 2: Run import tests**

Run: `cd app/server && mvn -pl appsmith-server -Dtest=OntologyProjectImportTest test`

Expected: FAIL because import-source adapters do not exist.

- [ ] **Step 3: Implement source adapters and demo bootstrap**

Both importers must produce the same `ImportedOntologyProject` internal model. The platform importer is an interface plus deterministic test-double adapter until the platform API contract is supplied. The demo importer uses the new YAML and `demo-mongo-readonly` only.

- [ ] **Step 4: Re-run targeted tests and review**

Expected: PASS. Review source labels and ensure platform adapter cannot silently request latest metadata during Query execution.

---

### Task 5: Add runtime Provider registry and compatibility validation

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/RuntimeProviderRegistry.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/RuntimeProviderCompatibilityValidator.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/port/RuntimeProvider.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/RuntimeProviderCompatibilityValidatorTest.java`

**Consumes:** Task 3 snapshot and existing `RuntimeProvider` read contract.

**Produces:** `resolveRequired(String providerId)` and `validate(snapshot, providerId): Mono<ProviderValidationResult>`.

- [ ] **Step 1: Write failing compatibility tests**

Cover registered demo provider; unknown provider; missing Object mapping; incompatible property type; and healthy validation for the demo snapshot.

- [ ] **Step 2: Run validator test**

Run: `cd app/server && mvn -pl appsmith-server -Dtest=RuntimeProviderCompatibilityValidatorTest test`

Expected: FAIL because the registry and compatibility result do not exist.

- [ ] **Step 3: Implement stable Provider identity**

Expose provider ID and a metadata-capability probe from the runtime adapter. Keep query methods semantic-ID based; no Appsmith action configuration can contain Mongo collection/table details.

- [ ] **Step 4: Re-run targeted tests and review**

Expected: PASS. Review that a failed validation blocks activation and does not alter an existing datasource binding.

---

### Task 6: Create workspace datasource import and lifecycle services

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceService.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceController.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/dto/ImportOntologyDatasourceRequest.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/dto/OntologyDatasourceSummary.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyDatasourceServiceTest.java`

**Consumes:** Tasks 2-5 and the server's normal datasource persistence/service APIs.

**Produces:** admin-only `importDatasource`, `listDatasourceCandidates`, `getDatasourceSummary`, `stopDatasource`, and `deleteDatasource` operations that create ordinary Appsmith datasource records using the ontology plugin ID.

- [ ] **Step 1: Write failing service tests**

Cover admin import creating an Appsmith datasource with pinned snapshot fields; non-admin rejection; provider validation failure; local YAML source label; and two Apps reading the same workspace datasource.

- [ ] **Step 2: Run service test**

Run: `cd app/server && mvn -pl appsmith-server -Dtest=OntologyDatasourceServiceTest test`

Expected: FAIL because lifecycle service/controller do not exist.

- [ ] **Step 3: Implement service and controller**

Use existing datasource persistence rather than a parallel datasource store. Create the datasource only after snapshot and provider validation succeed. Return project/version/source/provider/digest/status/change-note summary for the native Datasource UI.

- [ ] **Step 4: Re-run tests and review**

Expected: PASS. Review workspace ownership, admin guard, and no direct App binding state.

---

### Task 7: Implement upgrade, uniqueness, and rollback audit

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceCompatibilityService.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceUpgradeService.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceUpgradeAudit.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyDatasourceUpgradeServiceTest.java`

**Consumes:** Task 6 datasource lifecycle and standard Appsmith Action/Application references.

**Produces:** `analyzeUpgrade(datasourceId, candidateSnapshotId)` and `applyUpgrade(datasourceId, candidateSnapshotId, actor)` plus auditable rollback.

- [ ] **Step 1: Write failing upgrade tests**

Cover added Property classified compatible; deleted Property referenced by a saved Action classified blocking; incompatible type change classified manual/blocking; explicit approval switching version; rollback restoring exact prior snapshot; and duplicate active project versions in one App rejected.

- [ ] **Step 2: Run upgrade test**

Run: `cd app/server && mvn -pl appsmith-server -Dtest=OntologyDatasourceUpgradeServiceTest test`

Expected: FAIL because compatibility/upgrade services are absent.

- [ ] **Step 3: Implement analysis and atomic upgrade**

Scan standard Appsmith Actions referencing the datasource and stable metadata IDs. Never infer impact from display names. Persist before/after snapshot/digest, actor, timestamps, report, and rollback linkage.

- [ ] **Step 4: Re-run tests and review**

Expected: PASS. Review atomicity and confirm no automatic upgrade route exists.

---

### Task 8: Implement Object Query plugin execution

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryValidator.java`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyRuntimeGateway.java`
- Test: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyObjectQueryExecutorTest.java`

**Consumes:** Task 2 configuration contracts, Task 3 snapshot API, and Task 5 Provider registry.

**Produces:** `OBJECT_QUERY` execution result as a standard list-valued `ActionExecutionResult`.

- [ ] **Step 1: Write failing executor tests**

Cover default displayable projection; explicit stable-ID projection; typed filter/sort/page forwarding; invalid Property/Object rejection before Provider call; provider error mapping; and no live metadata refresh.

- [ ] **Step 2: Run plugin executor test**

Run: `cd app/server && mvn -pl appsmith-plugins/celanworksmithOntologyPlugin -Dtest=OntologyObjectQueryExecutorTest test`

Expected: FAIL because executor collaborators are absent.

- [ ] **Step 3: Implement minimal Object Query dispatch**

Obtain the snapshot using datasource snapshot ID/digest, validate configuration, resolve Provider by stable ID, execute semantic query, and map items to an array. Attach page metadata through standard execution metadata if the audited Appsmith plugin interface supports it.

- [ ] **Step 4: Re-run tests and review**

Expected: PASS. Review that result is an array, no Widget API is referenced, and runtime mapping remains behind the Provider.

---

### Task 9: Implement Function, Link, and Action Query execution

**Files:**
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionServerClient.java`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/WorkspaceActionServerConfigurationResolver.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Test: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`

**Consumes:** Task 8 validator/gateway and the existing read-only Function/Link runtime capabilities.

**Produces:** native `FUNCTION_QUERY`, `LINK_QUERY`, and `ACTION_QUERY` behavior.

- [ ] **Step 1: Write failing operation tests**

Cover typed Function parameters/result; Link resolution by link ID; Action request injection of project/version/datasource/context/idempotency key; Action Server audit ID propagation; action-server domain error mapping; and rejection of user-supplied caller/version fields.

- [ ] **Step 2: Run operation test**

Run: `cd app/server && mvn -pl appsmith-plugins/celanworksmithOntologyPlugin -Dtest=OntologyFunctionLinkActionExecutorTest test`

Expected: FAIL because operation dispatch/client abstractions are absent.

- [ ] **Step 3: Implement dispatch and Action Server adapter**

Use a configuration resolver with a test double for the workspace-level Action Server. The plugin must not perform direct writes or store Action Server credentials in datasource configuration.

- [ ] **Step 4: Re-run tests and review**

Expected: PASS. Review error mapping and verify each operation remains a normal Action execution.

---

### Task 10: Add native query-editor resources and metadata-driven controls

**Files:**
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/root.json`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/function-query.json`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/action-query.json`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/link-query.json`
- Modify/Create based on Task 1 audit: minimal files below `app/client/src/pages/Editor/PluginActionEditor/`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Test: corresponding focused client tests in the selected editor directory

**Consumes:** Tasks 2, 3, and 8-9.

**Produces:** normal Appsmith Query editor selection of operation and metadata-driven form/advanced JSON, both serializing `OntologyActionConfiguration`.

- [ ] **Step 1: Write failing editor tests**

Cover operation picker; Object default projection; Property/Function/Action/Link options from pinned snapshot response; advanced JSON round-trip; invalid ID/type error before save; and advanced JSON hiding immutable context fields.

- [ ] **Step 2: Run focused client test serially**

Run the exact Jest command identified in Task 1 with `--runInBand`.

Expected: FAIL because editor resources/controls do not exist.

- [ ] **Step 3: Implement the smallest native editor extension**

Prefer plugin resource forms. If Task 1 proved that dynamic snapshot metadata requires client code, add a focused ontology-query editor component only under the native PluginActionEditor extension seam. It must read plugin datasource metadata, not AppIDE/Widget Redux state.

Register every new visible English label, help text, validation message, and state under an `ontologyDatasource.*` i18n key and resolve it with `t()`. Do not add Chinese copy or bilingual concatenation.

- [ ] **Step 4: Re-run focused test and review**

Expected: PASS. Review query JSON parity and ensure no Widget-specific control was introduced.

---

### Task 11: Add datasource import UI to native Datasources management

**Files:**
- Modify: `app/client/src/pages/Editor/IntegrationEditor/CreateNewDatasourceTab.tsx`
- Create: `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.tsx`
- Create: `app/client/src/api/OntologyDatasourceApi.ts`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Test: `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx`

**Consumes:** Task 6 controller response and native datasource creation UI conventions.

**Produces:** administrator import of demo/local/platform ontology project into a normal workspace datasource.

- [ ] **Step 1: Write failing UI tests**

Cover source selection, platform release/version display, YAML upload selection, demo import, loading/error state, successful datasource card creation, and hidden/disabled import entry for non-admin roles.

- [ ] **Step 2: Run focused client test serially**

Run: `cd app/client && yarn test OntologyDatasourceImport --runInBand`

Expected: FAIL because the import component/API do not exist.

- [ ] **Step 3: Implement import UI**

Reuse existing Integration Editor controls and datasource refresh actions. The UI creates a datasource; it must not write App binding, Widget, or Query state.

All visible copy, including import source labels, source-validation errors, loading/empty states, and datasource status, is registered as English `ontologyDatasource.*` i18n keys. Tests assert rendered English text through the resource, not hard-coded bilingual literals.

- [ ] **Step 4: Re-run tests and review**

Expected: PASS. Review administrator guard and project/version/digest presentation.

---

### Task 12: Native end-to-end verification gate

**Files:**
- Create: `docs/superpowers/verification/2026-08-13-ontology-datasource-native-path.md`
- Create/Modify: narrowly scoped server/client integration tests determined by Tasks 8-11

**Consumes:** Tasks 2-11.

**Produces:** evidence that the native datasource route replaces the old route before removal begins.

- [ ] **Step 1: Add an integration fixture**

Fixture imports `demo-ontology-project.yaml`, creates an Ontology Datasource, creates an `OBJECT_QUERY` using its pinned snapshot, executes it, and asserts a standard array action result.

- [ ] **Step 2: Verify Function/Link/Action native results**

Use test doubles only for Action Server. Assert regular Action run/error contracts and trace ID retention.

- [ ] **Step 3: Browser/manual verification record**

Record exact manual steps: import demo datasource; create two Apps; create Object Query; bind native Table to `{{PurchaseOrdersQuery.data}}`; configure normal Table columns; run Function Query; invoke Action Query; verify a second same-project version cannot be active in one App.

- [ ] **Step 4: Run targeted server/client suites serially**

Run each Task test command separately, then `git diff --check`. Record actual commands/results in the verification document. Do not start a full Webpack build concurrently with server tests.

- [ ] **Step 5: Phase review**

Review only new plugin/lifecycle/editor/import diffs for violations of native datasource boundaries. Critical/important issues are fixed before Task 13.

---

### Task 13: Remove the legacy ontology Widget/Object-mode execution path

**Files:**
- Modify: `app/client/src/entities/DataTree/dataTreeCelanworksmith*.ts`
- Modify: `app/client/src/pages/AppIDE/AppIDE.tsx`
- Modify: `app/client/src/pages/AppIDE/components/Celanworksmith*Loader.tsx`
- Modify: `app/client/src/widgets/**/widget/index.tsx` only where Object-mode properties were added
- Modify: `app/client/src/ce/reducers/index.tsx`, `app/client/src/ce/sagas/index.tsx`
- Move readable retired code/tests to: `docs/superpowers/archive/ontology-widget-mode-2026-08-13/`
- Create: `docs/superpowers/archive/ontology-widget-mode-2026-08-13/removal-ledger.md`
- Test: targeted DataTree/Widget regression tests converted or removed with their implementation

**Consumes:** Task 12 passing evidence.

**Produces:** no executable `$objects/$functions/$actions/$variables` roots, Object Widget modes, object-specific reducers/sagas, or AppIDE ontology loaders.

- [ ] **Step 1: Inventory exact legacy reachability**

Use `rg` to produce a ledger grouped by DataTree, Redux/Saga, loader, Widget property/rendering, API/controller, tests, and generated artifact. Mark each entry `remove`, `retain behind plugin adapter`, or `archive-readable`.

- [ ] **Step 2: Write failing absence/regression tests**

Assert native datasource Actions still appear in DataTree and bind to a native Table. Assert removed Object-mode widget properties are no longer registered. Do not write a test that preserves `$objects` behavior.

- [ ] **Step 3: Remove one layer at a time**

Remove client paths in the order DataTree roots/loaders, Widget mode configuration/renderers, reducers/sagas/actions/selectors, then obsolete server controllers used exclusively by the old route. After each layer, run only its direct tests.

- [ ] **Step 4: Archive readable material and clear generated output**

Move explanatory code extracts/reports only to the ignored archive directory with source paths, commit IDs, and removal reasons. Delete stale generated plugin jars/build output rather than archiving them.

- [ ] **Step 5: Run native-path gate again and review**

Repeat Task 12 targeted verification. Review for any remaining active old-route references; acceptable references exist only in the archive ledger.

---

### Task 14: Establish replacement checkpoint and operational documentation

**Files:**
- Create: `docs/superpowers/verification/2026-08-13-ontology-datasource-replacement-checkpoint.md`
- Modify: `docs/superpowers/designs/celanworksmith-widget-ontology-integration-contract.md`
- Modify: `docs/superpowers/plans/2026-08-11-widget-ontology-integration-replan.md`
- Create: `docs/superpowers/verification/2026-08-13-ontology-datasource-manual-test.md`

**Consumes:** Tasks 12-13.

**Produces:** a Git checkpoint-ready verification record and superseded-plan status without preserving conflicting architecture as active guidance.

- [ ] **Step 1: Record implementation state**

Document plugin ID, import sources, snapshot/version semantics, Provider validation, Action Server boundary, known protocol stubs, test commands/results, and manual test results.

- [ ] **Step 2: Mark old contract superseded**

Add a prominent historical note to the Object-first Widget contract and replan, linking this design. Do not rewrite historical validation claims as if they described the new architecture.

- [ ] **Step 3: Review documentation consistency**

Search `docs/superpowers` for claims that new Widgets default to Object mode or `$objects` is the primary path. Update active guidance or add a supersession link.

- [ ] **Step 4: Checkpoint preparation**

Run `git diff --check`, capture `git status --short`, and record the exact staged scope proposed for the checkpoint. Do not create a commit unless explicitly requested by the user.

## Phase Acceptance

- All Tasks 2-12 are independently tested and scoped-reviewed before Task 13 begins.
- Task 13 runs only after native end-to-end evidence exists.
- A manual tester can import the Demo Ontology Datasource, create standard Queries, and bind standard Widgets with no Object-mode controls.
- Documentation clearly distinguishes the replacement architecture from archived side-path experiments.
- Future usability work (Table/Chart assistants, binding wizard, datasource ACL, platform production client) remains outside this plan.
