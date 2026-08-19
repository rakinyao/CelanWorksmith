# Ontology Query Mode Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize ontology `OBJECT_QUERY` Builder and Advanced JSON as two views of one canonical query definition.

**Architecture:** Keep the native Appsmith Query and PF4J execution path. Add a focused editor-side definition synchronizer that serializes Builder fields, seeds Advanced JSON, parses and validates Advanced edits, and hydrates Builder fields only after successful validation. Keep backend parsing authoritative and do not add a second Redux/Saga execution chain.

**Tech Stack:** React/TypeScript, Appsmith PluginActionEditor resource controls, Jest, Java 25, Spring WebFlux, PF4J, JUnit 5, Maven.

## Global Constraints

- `OBJECT_QUERY.definition` is the canonical semantic representation.
- Builder controls are a view of the canonical definition, not a second execution model.
- Advanced JSON edits use the same metadata and backend validation contract.
- Preserve Appsmith dynamic bindings such as `{{Table1.pageSize}}` as source text.
- Keep all new visible UI text in English.
- Do not add `$objects`, Object Widget modes, ontology-specific execution state, or a parallel Query path.
- Preserve DB/API Query behavior and existing ontology Function, Action, and Link paths.
- Do not change Runtime Provider, Action Server, or general Table rendering behavior.

## File Map

- Modify `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json` for mode visibility and read-only structured JSON previews.
- Modify or create focused files under `app/client/src/PluginActionEditor/` for the mode synchronizer only if declarative plugin controls cannot perform conversion.
- Modify `app/client/src/WidgetQueryGenerators/Ontology/index.ts` so generated actions seed the canonical definition.
- Extend `app/client/src/WidgetQueryGenerators/Ontology/index.test.ts` for generated definition and binding preservation.
- Extend backend tests under `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/` for equivalent Builder/Advanced execution.
- Create `docs/superpowers/verification/2026-08-18-ontology-query-mode-sync.md` with automated and manual evidence.

### Task 1: Define the canonical conversion contract

**Files:**
- Create: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.ts`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts`

**Interfaces:**
- `type OntologyObjectQueryDefinition = { objectTypeId: string; projection?: string[]; filter?: { conditions: Array<{ propertyId: string; operator: string; value?: unknown }> }; sort?: Array<{ propertyId: string; direction: "ASC" | "DESC" }>; page?: { offset: unknown; limit: unknown } }`
- `serializeBuilderForm(formData: Record<string, unknown>): string`
- `parseAdvancedDefinition(text: string): OntologyObjectQueryDefinition`
- `normalizeDefinition(definition: OntologyObjectQueryDefinition): OntologyObjectQueryDefinition`

- [ ] Write failing tests for Builder field serialization, omitted empty optional fields, stable JSON output, and preservation of `{{...}}` strings.
- [ ] Run the focused Jest test and verify the failure is caused by missing conversion behavior.
- [ ] Implement pure conversion and normalization helpers with no network or Redux dependencies.
- [ ] Run the focused Jest test and verify valid definitions round-trip without changing dynamic bindings.

### Task 2: Add metadata-aware Advanced JSON validation

**Files:**
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.ts`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts`

**Interfaces:**
- `type OntologyQueryMetadata = { objectTypes: Array<{ id: string; properties: Array<{ id: string; hidden?: boolean; operators?: Array<{ value: string }> }> }> }`
- `validateDefinition(definition: OntologyObjectQueryDefinition, metadata: OntologyQueryMetadata): { valid: true; definition: OntologyObjectQueryDefinition } | { valid: false; message: string }`

- [ ] Add failing tests for unknown Object Type, hidden/unknown Property, unsupported operator, malformed filter row, invalid sort direction, and invalid pagination.
- [ ] Run the tests and verify each failure identifies the expected validation boundary.
- [ ] Implement metadata validation using stable IDs and existing operator contracts; keep messages English.
- [ ] Run the tests and verify valid PurchaseOrder definitions pass while invalid definitions return actionable errors.

### Task 3: Seed generated Queries with real canonical JSON

**Files:**
- Modify: `app/client/src/WidgetQueryGenerators/Ontology/index.ts`
- Test: `app/client/src/WidgetQueryGenerators/Ontology/index.test.ts`

**Interfaces:**
- `Ontology.build(...)` continues returning native `QUERY_TYPE.SELECT` actions.
- Generated SELECT action includes `formData.queryMode.data = "BUILDER"`, Builder fields, and `formData.definition.data` containing the serialized equivalent definition.

- [ ] Add failing tests that assert a generated PurchaseOrder query contains `definition` matching its Object Type, projection, filter, sort, and dynamic page bindings.
- [ ] Run the focused generator tests and verify `definition` is absent or incorrect before the implementation change.
- [ ] Build the canonical definition from the same intermediate values used for Builder fields; serialize dynamic bindings without evaluation.
- [ ] Run the focused generator tests and verify both fields remain equivalent.

### Task 4: Make plugin resource mode boundaries explicit

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json`
- Test: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyConfigurationTest.java`

**Interfaces:**
- Builder controls remain visible only when `queryMode.data === 'BUILDER'`.
- Full Advanced JSON remains visible only when `queryMode.data === 'ADVANCED'`.
- Filter and Sort JSON alternate views are read-only previews or are removed if the control framework cannot mark them read-only.

- [ ] Add a resource/configuration regression test for mode visibility and the absence of an editable full JSON field in Builder.
- [ ] Run the focused plugin configuration test and verify it fails against the current resource contract.
- [ ] Update the resource JSON with explicit mode conditions and read-only preview configuration supported by the existing control schema.
- [ ] Run the focused plugin configuration test and validate JSON resource loading.

### Task 5: Integrate Builder-to-Advanced synchronization

**Files:**
- Modify: the smallest existing native editor/control file under `app/client/src/PluginActionEditor/` discovered in Task 1; do not add Redux/Saga state.
- Test: adjacent editor component test plus `ontologyObjectQueryDefinition.test.ts`.

**Interfaces:**
- On entering Advanced, the editor receives current `actionConfiguration.formData` and writes the serialized canonical definition to `formData.definition.data`.
- Builder control edits update the canonical definition before save/run.

- [ ] Add failing component tests for generated Builder data entering Advanced with the actual JSON visible, including dynamic pagination bindings.
- [ ] Run the focused component tests and verify the Advanced value is currently only the placeholder or empty.
- [ ] Implement the smallest existing form-control integration; keep conversion pure and synchronous.
- [ ] Run the focused component tests and verify no network request is triggered by mode switching.

### Task 6: Integrate Advanced-to-Builder hydration and error retention

**Files:**
- Modify: the synchronizer integration from Task 5.
- Test: adjacent editor component test.

**Interfaces:**
- A valid Advanced JSON edit parses, validates against the current metadata, and hydrates Builder fields.
- Invalid JSON or unsupported shape keeps Advanced selected and retains the last valid definition.

- [ ] Add failing tests for valid filter/sort/page hydration, malformed JSON, unknown property, and unrepresentable fields.
- [ ] Run the tests and verify invalid Advanced input cannot switch to Builder.
- [ ] Implement parse/validate/hydrate transitions with English error messages and no silent truncation.
- [ ] Run the tests and verify valid Advanced edits update every Builder control.

### Task 7: Align backend equivalence and stale-field behavior

**Files:**
- Modify only if required: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`
- Test: `OntologyActionConfigurationTest.java` and `OntologyObjectQueryExecutorTest.java`

**Interfaces:**
- Builder and Advanced representations of the same definition produce equivalent `OntologyRuntimeGateway.ObjectQuery` values.
- Inactive-mode stale fields never override the active canonical definition.

- [ ] Add failing tests comparing equivalent Builder and Advanced configurations, including dynamic page values where the existing parser supports them.
- [ ] Run the focused plugin tests and verify the expected equivalence gap.
- [ ] Make the smallest compatibility-preserving parser change only if frontend persistence requires it; do not weaken backend validation.
- [ ] Run the focused plugin suite and verify legacy advanced JSON and Builder defaults remain intact.

### Task 8: Run integration checks and record the checkpoint

**Files:**
- Create: `docs/superpowers/verification/2026-08-18-ontology-query-mode-sync.md`

- [ ] Run focused frontend conversion, generator, and editor tests with `--runInBand`.
- [ ] Run focused ontology plugin tests with Maven reactor compilation.
- [ ] Run formatting and `git diff --check` on touched files.
- [ ] Run the development service health checks after deployment if code changes require a new plugin/frontend build.
- [ ] Record manual verification: generated Table Query, Builder-to-Advanced, Advanced-to-Builder, invalid JSON retention, dynamic pagination, and native Table execution.
- [ ] Record known unrelated test failures separately from this task.
