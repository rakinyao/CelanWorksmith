# Capability Widget Target Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let native Ontology Function and Action Queries derive object targets from Table, Select, MultiSelect, or manual expressions, while retaining server-authoritative `OntologyObjectSet<T>` validation.

**Architecture:** A client adapter registry turns supported Widget instances into ordinary Appsmith binding expressions. A shared Builder control stores editor-only Widget identity and expression data. The capability serializer emits only canonical `SINGLE_OBJECT/objectId` or Function `OBJECT_SET/objectIds` targets for execution; the plugin validates IDs, owner type, bounds, and snapshot as it does today.

**Tech Stack:** React, TypeScript, Redux Form, Appsmith form controls, Jest, Java 25, PF4J, JUnit 5.

## Global Constraints

- Preserve the native datasource/query/action pipeline and Widget public state.
- Targets are execution context, not business parameters.
- First phase supports Table, Select, MultiSelect, manual literals, and dynamic expressions.
- `maxItems` is an upper bound, not a source selector.
- `widgetId` is Builder metadata only and is never trusted by the server.
- Existing `SINGLE_OBJECT/objectId` Queries and Advanced JSON remain executable.
- Keep adapter, serializer, and plugin normalization as isolated provisional-contract seams.

### Task 1: Pure Widget Target Adapter Registry

**Files:** Create `app/client/src/PluginActionEditor/components/CapabilityTargetBinding/ontologyTargetWidgetAdapters.ts` and `app/client/src/PluginActionEditor/components/CapabilityTargetBinding/ontologyTargetWidgetAdapters.test.ts`.

**Interfaces:** `buildWidgetTargetBinding(widget, canonicalKey, maxItems)` returns `WidgetTargetBinding { widgetId, cardinality: "ONE" | "MANY", expression }` or `undefined`.

- [ ] Write failing tests that assert: Table single produces `{{Table1.selectedRow.contract_id}}`; Table many produces `{{Table1.selectedRows.map((row) => row.contract_id)}}`; Select single produces `{{CustomerSelect.selectedOptionValue}}` for both `maxItems = 1` and `maxItems = 2`; MultiSelect many produces `{{Customers.selectedOptionValues}}`; Table is absent without a canonical key; non-positive or non-finite bounds produce no binding.
- [ ] Run `cd app/client && yarn g:jest src/PluginActionEditor/components/CapabilityTargetBinding/ontologyTargetWidgetAdapters.test.ts`; confirm failure because the module is absent.
- [ ] Implement a closed registry for `TABLE_WIDGET`, `SELECT_WIDGET`, and `MULTI_SELECT_WIDGET`. Permit one-target adapters for every positive bound, and many-target adapters only when `maxItems > 1`.
- [ ] Rerun the focused test, confirm pass, then commit only the Task 1 files as `feat(ontology): add capability target widget adapters`.

### Task 2: Target Binding Builder Control

**Files:** Create `app/client/src/components/formControls/CapabilityTargetBindingControl.tsx` and `app/client/src/components/formControls/CapabilityTargetBindingControl.test.tsx`. Modify `app/client/src/utils/formControl/formControlTypes.ts`, `app/client/src/utils/formControl/FormControlRegistry.tsx`, and `app/client/src/entities/Action/actionProperties.ts`.

**Interfaces:** The control consumes `getCurrentPageWidgets`, known Table canonical-key provenance, and `maxItems`. It writes `{ mode: "WIDGET" | "MANUAL", widgetId?, cardinality, expression }` to Builder form data.

- [ ] Write failing component tests that open the picker with `maxItems = 1`, see compatible Table and Select entries, do not see MultiSelect, select a Widget and assert its stable ID/expression are written; add cases for manual mode clearing `widgetId` but retaining expression, removed Widget state, and `maxItems > 1` exposing Table-many plus MultiSelect.
- [ ] Run `cd app/client && yarn g:jest src/components/formControls/CapabilityTargetBindingControl.test.tsx`; confirm RED.
- [ ] Implement the control using `FunctionParametersControl` conventions and `getCurrentPageWidgets`, using Task 1 to generate expressions. Register `ONTOLOGY_CAPABILITY_TARGET` and mark it as a normal dynamic action field so expressions follow Appsmith's normal evaluation path.
- [ ] Rerun the focused control test plus `FunctionParametersControl.test.tsx`; confirm pass and commit Task 2 files as `feat(editor): select capability target widgets`.

### Task 3: Capability Serializer, Synchronizer, And Editor Resources

**Files:** Modify `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.ts`, its test, `QueryModeSynchronizer.tsx`, its test, `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/function-query.json`, and `action-query.json`.

**Interfaces:** Builder-only binding metadata serializes to canonical targets. Function one-target bindings emit `{ source: "SINGLE_OBJECT", objectId }`; Function many-target bindings emit `{ source: "OBJECT_SET", objectIds }`. Action Builder remains one target until Action cardinality exists in Release metadata. Advanced JSON stays `{ target, parameters }` and never stores `widgetId`.

- [ ] Write failing serializer/hydrator tests for a Function many target, a legacy single target, manual literal IDs, and Advanced-to-Builder hydration into manual mode.
- [ ] Run `cd app/client && yarn g:jest src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts`; confirm RED because the current target union only accepts `SINGLE_OBJECT/objectId`.
- [ ] Extend the target union, serialization, validation, and hydration. Preserve legacy single targets; clear target/parameters only when owner/capability changes. Reject a many binding for Action Builder rather than silently downcasting it.
- [ ] Replace the disabled `Target source` and `Object ID` controls in both editor JSON files with `ONTOLOGY_CAPABILITY_TARGET`. Supply Function `maxItems` and an effective one-target Action limit. Keep Advanced examples for single IDs and Function ID arrays.
- [ ] Run the Task 1 and Task 2 tests plus both synchronizer test files; confirm pass and commit Task 3 files as `feat(ontology): bind capability targets from widgets`.

### Task 4: Plugin Boundary And Runtime Guardrails

**Files:** Modify `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`, `OntologyQueryValidator.java`, `OntologyActionConfigurationTest.java`, and `OntologyQueryValidatorTest.java`.

**Interfaces:** Only evaluated canonical `SINGLE_OBJECT/objectId` and Function `OBJECT_SET/objectIds` reach `ValidatedCapabilityQuery`. Builder fields `widgetId`, `mode`, `cardinality`, and expressions must never reach the runtime boundary.

- [ ] Write failing tests accepting Function `OBJECT_SET` with `List.of("C1", "C2")` and rejecting a raw `{ source: "WIDGET_SELECTION", widgetId: "widget-1", objectIdExpression: "{{Select1.selectedOptionValue}}" }` target.
- [ ] Run `cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologyActionConfigurationTest,OntologyQueryValidatorTest -Dsurefire.failIfNoSpecifiedTests=false test`; confirm RED at the selected boundary.
- [ ] Keep configuration composition limited to evaluated canonical fields. Retain Function support for `SINGLE_OBJECT`, `OBJECT_SET`, and legacy `MANY_OBJECTS`; retain Action single-target validation; do not add a server-side Widget lookup.
- [ ] Add tests for blank ID, non-string array, duplicate IDs, over-`maxItems` target, owner mismatch, and unknown runtime ID, asserting no gateway invocation. Rerun the focused Maven command, confirm pass, and commit Task 4 files as `fix(ontology): normalize capability target bindings`.

### Task 5: Evidence And Manual Verification

**Files:** Create `docs/superpowers/verification/2026-09-09-capability-widget-target-binding.md`.

- [ ] Record actual output from Task 3 Jest, Task 4 Maven, `git diff --check`, backend build/restart, and health check. Do not claim a pass without the current-session command evidence.
- [ ] Verify manually against Release `1.1.0`: single Function from a Table with hidden canonical ID; single Function from a Select with canonical option value; `CalculateContractGrossAmount` from Table multi-selection and MultiSelect; a fixed nonexistent manual ID returning a native target-not-found error; legacy Query Builder/Advanced round trip; a known incompatible source producing an editor warning while manual input remains saveable.
- [ ] Run the final focused Jest suite, the focused Maven suite including `OntologyFunctionLinkActionExecutorTest`, then `git diff --check`.
- [ ] Run `cd app/server && ./build.sh -DskipTests`, restart `cw-backend`, and require `curl -fsS http://127.0.0.1:8081/api/v1/health` to succeed before manual testing.
- [ ] Commit the verification record as `docs(ontology): verify capability widget target bindings`.

## Plan Self-Review

- Tasks 1-3 cover the agreed adapter registry, Widget/manual input, Builder/Advanced compatibility, and Table/Select/MultiSelect scope.
- Task 4 preserves the authoritative `OntologyObjectSet<T>` runtime boundary and rejects UI-only metadata.
- Task 5 requires focused automated evidence, health confirmation, and the user-facing manual scenarios.
- Deferred: additional Widget types, server-side Object Query/Filter target sources, composite-key authoring UX, and Action many-target execution without Action target-cardinality metadata.
