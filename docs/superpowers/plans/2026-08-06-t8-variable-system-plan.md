# T8 Variable System Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with focused tests and review checkpoints.

**Goal:** Add persisted, dependency-aware CelanWorksmith variables and expose their evaluated values through `{{$variables.<name>}}`.

**Architecture:** Variable definitions are stored on the page root DSL under `celanworksmithVariables`, so normal Appsmith page save/reload preserves them. A pure evaluator validates dependencies and derives ObjectSet, ObjectProperty, Function, and Aggregation values from the existing object query and execution states; a lightweight editor loader dispatches only referenced ObjectSet/Function work. The data tree exposes one stable `$variables` namespace without changing `$objects`, `$functions`, `$actions`, or Query bindings.

**Tech Stack:** React, Redux reducers/selectors, Redux-Saga, existing CelanWorksmith API/query layer, Jest, Appsmith property update actions.

**Implementation status:** T8.1-T8.6 implemented and verified; published runtime snapshots remain in T9 scope.

## Global Constraints

- Preserve existing Query, `$objects`, `$functions`, `$actions`, and Widget behavior.
- Use stable variable IDs and names separately; reject invalid names and duplicate names.
- Detect cycles before saving and expose the dependency path.
- Reuse the existing Object Query and Function execution chains; do not issue API calls from render components.
- Do not allow variable evaluation to mutate another variable.
- Keep the first version synchronous for derived values and asynchronous only at the existing query/function boundaries.

### Task 1: Define Variable Contracts and Graph Validation

**Files:**

- Create: `app/client/src/celanworksmith/variables/types.ts`
- Create: `app/client/src/celanworksmith/variables/variableUtils.ts`
- Test: `app/client/src/celanworksmith/variables/variableUtils.test.ts`

- [x] Add versioned definitions for `OBJECT_SET`, `OBJECT_PROPERTY`, `FUNCTION`, and `AGGREGATION`.
- [x] Implement name validation, dependency extraction, duplicate detection, topological ordering, and cycle path errors.
- [x] Implement aggregation operators `count`, `sum`, `avg`, `min`, and `max` with numeric-property validation.
- [x] Add unit tests for valid graphs, duplicate names, missing dependencies, cycles, and empty aggregation results.

### Task 2: Add Persisted Definition Access

**Files:**

- Create: `app/client/src/selectors/celanworksmithVariableSelectors.ts`
- Modify: `app/client/src/ce/reducers/index.tsx`
- Modify: `app/client/src/selectors/dataTreeSelectors.ts`
- Test: `app/client/src/selectors/celanworksmithVariableSelectors.test.ts`

- [x] Read and normalize `celanworksmithVariables` from the current page root widget.
- [x] Add the field to the root widget through the existing widget property update action; do not create a second persistence store.
- [x] Add selectors for definitions and the root widget ID with empty-state compatibility.
- [x] Verify definitions survive extraction-shaped DSL data and old pages without the field.

### Task 3: Evaluate Variables and Build `$variables`

**Files:**

- Create: `app/client/src/entities/DataTree/dataTreeCelanworksmithVariables.ts`
- Modify: `app/client/src/selectors/dataTreeSelectors.ts`
- Test: `app/client/src/entities/DataTree/dataTreeCelanworksmithVariables.test.ts`

- [x] Evaluate definitions in topological order using object query entries, object instances, and function execution state.
- [x] Return each variable as `{ data, _meta }` with `status`, `type`, `updatedAt`, and error/dependency information.
- [x] Expose `$variables` through `buildDataTreeForAutocomplete` while preserving existing namespaces.
- [x] Verify ObjectSet, ObjectProperty, Function, and Aggregation outputs and cycle/error states.

### Task 4: Trigger Referenced Variable Work

**Files:**

- Create: `app/client/src/celanworksmith/variables/variableLoaderUtils.ts`
- Create: `app/client/src/pages/AppIDE/components/CelanworksmithVariablesLoader.tsx`
- Modify: `app/client/src/pages/AppIDE/AppIDE.tsx`
- Test: `app/client/src/celanworksmith/variables/variableLoaderUtils.test.ts`
- Test: `app/client/src/pages/AppIDE/components/CelanworksmithVariablesLoader.test.tsx`

- [x] Dispatch shared Object Query requests for referenced ObjectSet variables using a stable `$variable/<id>` widget ID.
- [x] Dispatch existing Function run actions for referenced Function variables once per input signature.
- [x] Re-dispatch when definitions, metadata, or upstream query inputs change; avoid duplicate in-flight requests.
- [x] Verify no request is emitted for unused or invalid variables.

### Task 5: Add Variables Explorer Configuration UI

**Files:**

- Create: `app/client/src/pages/AppIDE/components/OntologyExplorer/VariablesSection.tsx`
- Modify: `app/client/src/pages/AppIDE/components/OntologyExplorer/index.tsx`
- Test: `app/client/src/pages/AppIDE/components/OntologyExplorer/VariablesSection.test.tsx`

- [x] Add Variables section with create/delete controls and visible status/error state.
- [x] Support ObjectSet and Aggregation configuration first, plus basic ObjectProperty and Function configuration.
- [x] Save only validated definitions to the root DSL property and surface cycle/missing-dependency errors inline.
- [x] Verify the section renders, creates a valid filtered PurchaseOrder set, creates a dependent delay count, and deletes a variable.

### Task 6: Verify and Document T8

**Files:**

- Create: `docs/superpowers/verification/2026-08-06-t8-variable-system-verification.md`
- Modify: `CelanWorksmith_分步实施计划.md`

- [x] Run focused Jest, Prettier, ESLint, and `git diff --check` commands.
- [x] Verify the development server and API remain available.
- [x] Record manual steps for ObjectSet, Aggregation, `$variables` binding, filter changes, cycle rejection, and page reload recovery.
- [x] Record any intentionally deferred cloud-publish/runtime snapshot work for T9.
