# Ontology Query Objects Structured Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ontology `OBJECT_QUERY` script-first editor with a metadata-driven structured query form while preserving the native Appsmith Query path and advanced JSON compatibility.

**Architecture:** Keep the canonical ontology query definition and runtime execution path unchanged. Extend the ontology plugin to expose property data types and supported operators, use Appsmith's existing projection, where, sorting, and pagination controls, and merge their structured values into the existing `OntologyActionConfiguration` before the current validator executes.

**Tech Stack:** Java 17, Spring/Appsmith plugin metadata JSON, React/TypeScript Appsmith form controls, Redux Form, Jest, JUnit 5.

## Global Constraints

- The ontology datasource remains a first-class datasource alongside DB and API datasources.
- Native Appsmith Query mode remains the only primary binding and execution path.
- Do not add `$objects`, Object Widget mode, or a parallel runtime execution chain.
- The backend validator remains authoritative for Object Type, Property, operator, filter value, sort, and pagination validation.
- Preserve the existing canonical `OBJECT_QUERY` definition fields: `objectTypeId`, `projection`, `filter`, `sort`, and `page`.
- Preserve legacy saved queries that only contain `definition` and selector fields.
- Use the pinned ontology metadata snapshot for dependent metadata and validation.
- New visible labels, placeholders, helper text, and errors are English only.
- Do not redesign Function, Action, or Link operations in this plan.
- Do not change the external Action Server contract.

## File Map

- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`: normalize builder fields and preserve legacy/advanced definitions.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryOperatorCatalog.java`: centralize property-type operator capabilities used by metadata and validation.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`: expose operator metadata for property selector requests.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json`: define the structured `OBJECT_QUERY` editor.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java`: test structured and legacy configuration normalization.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyQueryOperatorCatalogTest.java`: test operator capabilities.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyObjectQueryExecutorTest.java`: extend execution and validation regression coverage.
- `app/client/src/components/formControls/WhereClauseControl.tsx`: make the existing filter control accept metadata-driven property options where required.
- `app/client/src/components/formControls/FieldArrayControl.tsx`: preserve dynamic nested selector configuration for filter rows.
- `app/client/src/utils/formControl/formControlTypes.ts`: register any minimal control type extension required by the metadata-driven filter rows.
- `app/client/src/utils/formControl/FormControlRegistry.tsx`: register the minimal shared control extension if needed.
- `app/client/src/components/formControls/*test*` and `app/client/src/WidgetQueryGenerators/*test*`: focused frontend regression tests for form behavior and binding compatibility.

### Task 1: Normalize Structured Query Configuration

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java`
- Extend: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyObjectQueryExecutorTest.java`

**Interfaces:**
- Consumes Appsmith `ActionConfiguration.formData` containing `queryMode`, `objectTypeId`, `projection`, `filter`, `sort`, `page`, and optional `definition`.
- Produces the existing `OntologyActionConfiguration(Operation, Map<String, Object>)` with one canonical definition map.

- [x] **Step 1: Add failing normalization tests**

Cover these exact cases:

```java
structuredFormDataProducesCanonicalDefinition();
advancedDefinitionIgnoresStaleBuilderFields();
legacyDefinitionRemainsSupported();
structuredProjectionFilterSortAndPageAreCopied();
malformedStructuredFilterIsRejected();
```

The structured case must produce `objectTypeId`, `projection`, `filter`, `sort`, and `page` in the definition. The advanced case must preserve the JSON `definition` without overwriting it with stale structured fields. The legacy case must continue accepting the current selector plus JSON definition shape.

- [x] **Step 2: Run the focused backend tests and verify the new cases fail**

Run from `app/`:

```bash
./mvnw -pl server/appsmith-plugins/celanworksmithOntologyPlugin -Dtest=OntologyActionConfigurationTest,OntologyObjectQueryExecutorTest test
```

Expected: the new normalization tests fail before implementation while existing ontology tests remain runnable.

- [x] **Step 3: Implement mode-aware normalization**

Implement these rules in `OntologyActionConfiguration.from`:

- `queryMode=BUILDER` copies structured fields into the canonical definition and permits an absent or empty raw definition.
- `queryMode=ADVANCED` parses and preserves `definition` without applying stale builder fields.
- An absent `queryMode` follows the legacy behavior.
- Structured fields are copied only when they have the expected object/array types.
- Protected context keys remain rejected at both form and definition levels.

- [x] **Step 4: Run the focused backend tests and verify they pass**

Run the same Maven command. Expected: all new normalization tests and the existing ontology object query tests pass.

- [x] **Step 5: Run formatting and compile checks**

Run:

```bash
./mvnw -pl server/appsmith-plugins/celanworksmithOntologyPlugin -DskipTests compile
```

Expected: the plugin compiles without changing Function, Action, or Link behavior.

### Task 2: Centralize Property Operator Metadata

**Files:**
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryOperatorCatalog.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryValidator.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Create: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyQueryOperatorCatalogTest.java`
- Extend: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyObjectQueryExecutorTest.java`

**Interfaces:**
- Produces `List<MetadataOperator>` or the existing metadata map shape containing stable operator values and English labels.
- Consumes the same property `dataType` values used by `OntologyQueryValidator`.

- [x] **Step 1: Add failing operator catalog tests**

Verify the catalog returns:

- String operators: `equals`, `contains`, `startsWith`, `isEmpty`.
- Numeric operators: `equals`, `gt`, `gte`, `lt`, `lte`.
- Boolean operators: `equals`, `isEmpty`.
- A deterministic fallback for an unsupported metadata type that exposes only `equals` and does not invent unsafe operators.

- [x] **Step 2: Run the focused catalog tests and verify they fail**

Run:

```bash
./mvnw -pl server/appsmith-plugins/celanworksmithOntologyPlugin -Dtest=OntologyQueryOperatorCatalogTest test
```

Expected: FAIL because the shared catalog does not yet exist.

- [x] **Step 3: Implement the catalog and reuse it in validation**

Move the existing validator operator sets behind the catalog. Keep the validator's current error behavior and make it reject operators not returned for the selected property's data type.

- [x] **Step 4: Expose operators in `ONTOLOGY_OBJECT_PROPERTIES` metadata**

Add an `operators` array to each visible property metadata entry. Keep existing `label`, `value`, `dataType`, `required`, `readOnly`, `derived`, `enumValues`, and `referenceTypeId` fields unchanged.

- [x] **Step 5: Run backend operator and metadata regression tests**

Run:

```bash
./mvnw -pl server/appsmith-plugins/celanworksmithOntologyPlugin -Dtest=OntologyQueryOperatorCatalogTest,OntologyObjectQueryExecutorTest test
```

Expected: operator selection and backend validation use one catalog, and existing metadata consumers continue to parse the response.

### Task 3: Replace the Script-First Object Query Editor

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/root.json` only if the editor registration requires an identifier update.
- Create or extend: plugin editor JSON fixture tests under `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test`.

**Interfaces:**
- Consumes the metadata requests `ONTOLOGY_OBJECT_TYPES` and `ONTOLOGY_OBJECT_PROPERTIES`.
- Produces `queryMode`, `objectTypeId`, `projection`, `filter`, `sort`, `page`, and `definition` fields understood by Task 1.

- [x] **Step 1: Add a form fixture test for the required controls**

Assert that the `OBJECT_QUERY` editor configuration contains these controls and paths:

```text
queryMode
objectTypeId
projection
filter
sort
page
definition
```

Assert that `projection`, `filter`, `sort`, and `page` are disabled until `objectTypeId` is available.

- [x] **Step 2: Replace the current object query JSON configuration**

Use existing Appsmith controls wherever possible:

- `DROP_DOWN` for `queryMode` with `Builder` and `Advanced JSON` values.
- `DROP_DOWN` with conditional metadata for `Object Type`.
- `PROJECTION` for `Properties` using `ONTOLOGY_OBJECT_PROPERTIES`.
- `ARRAY_FIELD` for filter rows, with a dynamic Property selector, an operator selector sourced from the selected property metadata, and a dynamic Value input.
- `SORTING` for sort property and direction.
- `PAGINATION` for offset and limit.
- `QUERY_DYNAMIC_INPUT_TEXT` for the advanced canonical definition, visible only in advanced mode.

All labels and helper text must be English. Use stable IDs in saved values and display names only in labels.

- [x] **Step 3: Add dependent-field clearing rules**

When the Object Type changes, ensure the editor does not preserve Property, Filter, Sort, or Projection values from the previous type. If the existing form framework cannot clear nested array values through JSON configuration alone, implement the smallest shared form-control change in Task 4 and keep the behavior covered there.

- [x] **Step 4: Verify editor configuration parsing**

Run the plugin resource/configuration test suite and confirm the JSON loads without errors. Expected: the editor renders the builder controls and the advanced definition only in its selected mode.

### Task 4: Add Metadata-Driven Filter Row Behavior

**Files:**
- Modify only as needed: `app/client/src/components/formControls/FieldArrayControl.tsx`
- Modify only as needed: `app/client/src/components/formControls/WhereClauseControl.tsx`
- Modify only as needed: `app/client/src/utils/formControl/formControlTypes.ts`
- Modify only as needed: `app/client/src/utils/formControl/FormControlRegistry.tsx`
- Add focused tests beside the changed control.

**Interfaces:**
- Consumes nested filter row values under `actionConfiguration.formData.filter.data`.
- Consumes property metadata returned by `ONTOLOGY_OBJECT_PROPERTIES`, including each property's `operators` array.
- Produces filter rows containing `propertyId`, `operator`, and `value` without changing the canonical backend filter shape.

- [x] **Step 1: Add failing frontend control tests**

Cover:

- A filter row renders a Property selector, Operator selector, and Value input.
- The Property selector requests metadata for the selected Object Type.
- The Operator selector changes when the selected Property changes.
- Existing filter rows are cleared when their Property is no longer valid after an Object Type change.
- The Add and Remove row controls preserve valid sibling rows.

- [x] **Step 2: Run the focused Jest tests and verify they fail**

Run from `app/client/`:

```bash
yarn g:jest FieldArrayControl WhereClauseControl --runInBand
```

Expected: the new ontology-specific cases fail before the control extension.

- [x] **Step 3: Implement the minimal dynamic nested selector behavior**

Reuse `FormControl` and Redux Form paths. Do not create an ontology-specific query executor. Dynamic options must be keyed by stable property IDs, and changes must dispatch form changes that remove stale operator/value data.

- [x] **Step 4: Run the focused frontend tests and verify they pass**

Run the same Jest command. Expected: all new tests pass and existing generic filter control tests remain green.

- [x] **Step 5: Run TypeScript lint/type checks for touched frontend files**

Use the repository's existing client lint/typecheck command for the touched files. Do not introduce a new lint configuration or dependency.

### Task 5: Complete Query Binding and Regression Coverage

**Files:**
- Extend: `app/client/src/WidgetQueryGenerators/types.ts` only if the native query binding contract needs an explicit ontology operation field.
- Extend: `app/client/src/sagas/OneClickBindingSaga.ts` only if the existing datasource operation selection cannot create `OBJECT_QUERY` without a special case; any such change must remain generic and registry-driven.
- Extend: `app/client/src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts`.
- Add or extend: ontology datasource binding tests under `app/client/src` and plugin tests under `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test`.

**Interfaces:**
- Consumes the structured `OBJECT_QUERY` form definition.
- Produces the same native Table bindings already used for ontology Query mode: data, pagination inputs, and total-record behavior where supported.

- [x] **Step 1: Add failing binding regression tests**

Verify that:

- A generated `PurchaseOrder` query is created as a normal Appsmith Query.
- Table binding does not add `$objects` or Object Widget properties.
- Pagination bindings update the canonical `page.offset` and `page.limit` values.
- Existing DB/API one-click binding tests remain unchanged.

- [x] **Step 2: Implement only the required generic binding registration**

Prefer datasource operation metadata and the existing Widget query contract. Do not add a hardcoded ontology branch to a generic saga when the plugin registry can provide the operation.

- [x] **Step 3: Run focused frontend and backend regression tests**

Run:

```bash
cd app/client && yarn g:jest nativeQueryMode OneClickBindingSaga --runInBand
cd ../ && ./mvnw -pl server/appsmith-plugins/celanworksmithOntologyPlugin -Dtest=OntologyActionConfigurationTest,OntologyQueryOperatorCatalogTest,OntologyObjectQueryExecutorTest test
```

Expected: structured ontology queries and native Table binding pass, with no regressions in existing datasource query generation.

### Task 6: End-to-End Verification and Documentation

**Files:**
- Create: `docs/superpowers/verification/2026-08-17-ontology-query-objects-form.md`
- Update: `docs/superpowers/plans/2026-08-17-ontology-query-objects-form-implementation.md` checkboxes as tasks complete.
- Update: the relevant ontology datasource design/contract document only if implementation exposes a contract detail not already documented.

- [x] **Step 1: Run the complete focused plugin test suite**

Run:

```bash
cd app && ./mvnw -pl server/appsmith-plugins/celanworksmithOntologyPlugin test
```

- [x] **Step 2: Run the focused client tests in serial mode**

Run the changed form-control, query-generator, and native binding tests with `--runInBand` to limit memory usage.

- [x] **Step 3: Verify the generated editor resource and build artifacts**

Confirm the plugin resource JSON is included in the built plugin and no stale compiled frontend bundle is treated as source.

- [ ] **Step 4: Perform the manual verification flow**

Use the demo ontology datasource and verify:

1. Create a Query with `Query Objects`.
2. Select `PurchaseOrder`.
3. Select `delayDays` and apply `gt 0`.
4. Add descending sort by `delayDays`.
5. Set limit `2` and offset `0`.
6. Run and bind the result to a native Table Widget.
7. Change Object Type to `Supplier` and confirm all PurchaseOrder-dependent fields clear.
8. Switch to `Advanced JSON`, edit a valid canonical definition, run it, then restore Builder mode.
9. Enter an invalid operator/value and confirm the query is blocked with an English error.

- [x] **Step 5: Record evidence and residual risks**

The verification document must record exact commands, test counts, manual results, known limitations, and whether the next phase can begin. It must explicitly state that Function, Action, Link redesign and Widget visual optimization remain out of scope.

## Execution Notes

- Use a fresh implementer and a focused review for each task if executing with `subagent-driven-development`.
- Keep each subagent scoped to one task and require a short report with changed files, tests, and concerns.
- Do not run Playwright or a full production build for every task; reserve browser validation for Task 6 to limit memory use.
- Do not commit generated bundles or temporary build output.
