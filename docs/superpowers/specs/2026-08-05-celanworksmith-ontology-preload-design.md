# CelanWorksmith Ontology Preload Design

**Date:** 2026-08-05

**Status:** Approved

**Scope:** Move Function/Action ontology metadata loading from `OntologyExplorer` mount to the editor root and refresh autocomplete definitions after metadata changes.

## 1. Goal

Load Function and Action metadata as soon as the editor is available so `$functions` and `$actions` are available to all editor fields without requiring the Ontology tab to be opened.

Metadata failures must not block the editor. The Ontology tab remains the user-facing failure and retry surface.

## 2. Design

`AppIDE.tsx` already mounts `CelanworksmithObjectsLoader` as an invisible editor-level loader. Add a sibling `CelanworksmithOntologyLoader` that dispatches one `celanworksmithOntologyLoadRequest()` on mount.

`OntologyExplorer` continues to load and display object types and link types. Its initial mount no longer dispatches the Function/Action metadata request. Its existing error state keeps a Retry action that dispatches the same request, allowing a failed root load to be retried from the Ontology tab.

The existing ontology Saga remains the single owner of the Function/Action API calls and continues to atomically update the ontology reducer. The existing `TRIGGER_EVAL` dispatch remains after either success or failure.

`PostEvaluationSagas` adds a `CELANWORKSMITH_ONTOLOGY_LOAD_SUCCESS` watcher that invokes `refreshCelanworksmithTernDefinitions`. The refresh rebuilds the `DATA_TREE` definition from the current ontology state, so the Tern worker receives the latest `$functions` and `$actions` definitions.

## 3. Failure Behavior

- The editor renders independently of ontology metadata status.
- A failed initial request sets the ontology reducer to `error` and preserves any previous metadata.
- Opening the Ontology tab displays the existing bilingual failure state and Retry button.
- Retry dispatches a new metadata request; `takeLeading` prevents overlapping requests.
- A successful retry refreshes both DataTree evaluation and Tern autocomplete definitions.

## 4. Verification

- Root loader dispatches exactly once on mount and does not duplicate requests on rerender.
- OntologyExplorer does not request Function/Action metadata on its initial mount.
- OntologyExplorer retry dispatches the metadata request.
- Ontology success triggers Tern definition refresh.
- Existing ontology Saga, Explorer, selector, and autocomplete tests remain passing.
