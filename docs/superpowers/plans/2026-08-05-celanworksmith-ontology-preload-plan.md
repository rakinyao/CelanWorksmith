# CelanWorksmith Ontology Preload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preload Function/Action metadata at editor root mount and refresh Tern autocomplete definitions after successful metadata loads.

**Architecture:** Add a root-level loader alongside the existing object loader. Keep ontology API ownership in `CelanworksmithOntologySaga`; keep the Ontology tab as the failure/retry surface. Extend `PostEvaluationSagas` so ontology success rebuilds the `DATA_TREE` Tern definition.

**Tech Stack:** TypeScript, React, Redux, redux-saga, Jest, Tern autocomplete.

## Global Constraints

- Metadata failure must not block editor rendering.
- The Ontology tab remains bilingual and provides Retry.
- Function/Action metadata requests remain parallel and atomically stored.
- Do not modify native Appsmith datasource or Query Action behavior.
- Do not revert unrelated existing worktree changes.
- Do not create a Git commit.

### Task 1: Add Root Ontology Loader

**Files:**
- Create: `app/client/src/pages/AppIDE/components/CelanworksmithOntologyLoader.tsx`
- Create: `app/client/src/pages/AppIDE/components/CelanworksmithOntologyLoader.test.tsx`
- Modify: `app/client/src/pages/AppIDE/AppIDE.tsx`

**Interfaces:**
- Consumes: `celanworksmithOntologyLoadRequest()`.
- Produces: one ontology load request after the editor root mounts.

- [x] Write a component test that renders the loader and asserts one dispatch.
- [x] Implement the loader with `useEffect` and a `useRef` guard, matching `CelanworksmithObjectsLoader`.
- [x] Mount the loader beside `CelanworksmithObjectsLoader` inside the initialized editor tree.
- [x] Run the focused loader test.

### Task 2: Decouple Explorer Initial Load and Preserve Retry

**Files:**
- Modify: `app/client/src/pages/AppIDE/components/OntologyExplorer/index.tsx`
- Modify: `app/client/src/pages/AppIDE/components/OntologyExplorer/index.test.tsx`

**Interfaces:**
- Consumes: global ontology state and `celanworksmithOntologyLoadRequest()`.
- Produces: no initial Function/Action request; Retry dispatches the request.

- [x] Change the Explorer mount test to assert that the initial render does not dispatch the ontology request.
- [x] Add a failure-state test that clicks Retry and asserts one ontology request.
- [x] Split the initial object/link metadata load from the ontology retry callback so only Retry dispatches the ontology request.
- [x] Run the focused Explorer tests.

### Task 3: Refresh Tern Definitions on Ontology Success

**Files:**
- Modify: `app/client/src/sagas/PostEvaluationSagas.ts`
- Create or modify: `app/client/src/sagas/__tests__/PostEvaluationSagas.test.ts`

**Interfaces:**
- Consumes: `CELANWORKSMITH_ONTOLOGY_LOAD_SUCCESS` and `refreshCelanworksmithTernDefinitions`.
- Produces: a watcher that refreshes `DATA_TREE` definitions after ontology success.

- [x] Add a Saga test asserting the ontology success watcher uses `takeLatest` with `refreshCelanworksmithTernDefinitions`.
- [x] Add the watcher to `PostEvaluationSagas` without changing existing object-load refresh behavior.
- [x] Run the focused Saga test and existing ontology/data-tree tests.

### Task 4: Validate the Integrated Development Path

**Files:**
- No additional production files.

- [x] Run all focused loader, Explorer, ontology Saga, PostEvaluation Saga, selector, and autocomplete tests.
- [x] Confirm the development server returns `200 OK` through `http://10.10.110.129/`.
- [x] Confirm no new TypeScript or Webpack errors are present in the frontend log.
