# Ontology Native Path Stabilization Design

## Status

Proposed D0 design for the development-environment closure phase.

This document stabilizes the standard Appsmith Datasource path before adding
more ontology capabilities. It does not restore the legacy Object Widget path,
the `$objects`/`$functions`/`$actions`/`$variables` DataTree roots, or any
ontology-specific parallel execution state.

## Goal

Establish a reliable, observable, and automatically verifiable native path:

```text
Datasource import
  -> workspace Datasource
  -> native Query/Action
  -> PF4J ontology plugin
  -> pinned ontology snapshot and Runtime Provider
  -> native DataTree
  -> native Widget
```

D0 has two blocking outcomes:

1. A Demo Ontology Datasource can be imported, persisted, reloaded, and used
   by a native Query.
2. Binding a native Table Widget to an ontology Query does not cause repeated
   execution after the page reaches a stable state.

The implementation remains scoped to the development environment. Production
Runtime Providers, production Action Server integration, Datasource ACL, and
release deployment are later phases.

## Scope

### In scope

- Demo Datasource import through the ordinary Datasource surface.
- Plugin document ID resolution and Datasource configuration persistence.
- Import failure cleanup and incomplete Datasource prevention.
- Native ontology Query execution and result-shape compatibility.
- Request correlation and execution diagnostics across client, server, and
  PF4J plugin boundaries.
- Automated tests for import, persistence, execution, and repeated refresh.
- Headless browser or equivalent integration coverage where the existing test
  infrastructure supports it.

### Out of scope

- New Object Widget mode or ontology-specific Widget rendering path.
- Restoration of legacy ontology loaders, reducers, sagas, or DataTree roots.
- Production ontology-platform client implementation.
- Business write-back logic in Worksmith.
- Production authorization or multi-tenant permission redesign.
- Broad Widget usability redesign planned after the native path is stable.

## Architecture Contracts

### Datasource import contract

The import request is handled by the normal Datasource management path. The
backend must:

1. Authorize workspace Datasource administration.
2. Resolve the registered Mongo/PF4J plugin document ID from the plugin
   package name.
3. Import and validate the selected ontology project snapshot.
4. Validate the Runtime Provider against the snapshot metadata.
5. Create a normal workspace Datasource with the resolved plugin document ID.
6. Persist the generated Datasource ID into its stored configuration.
7. Return a summary that can be used to refresh the normal Datasource list.

The stored configuration must contain the immutable runtime identity tuple:

```text
projectId
projectVersion
metadataSnapshotId
metadataDigest
runtimeProviderId
workspaceId
datasourceId
```

An import failure must not leave an active, partially configured Datasource.
If the underlying Datasource service cannot provide an atomic operation for a
failure point, the implementation must explicitly clean up the created record
and cover that behavior with a test.

### Native Query contract

Ontology Queries are ordinary Appsmith Actions created from an ordinary
Datasource. The plugin validates the pinned snapshot and operation metadata,
executes through the Runtime Provider, and returns the normal Action execution
result shape.

The Query path must remain compatible with:

- `Query.data` bindings.
- `Query.run()` execution.
- native Widget evaluation.
- native loading, empty, and error states.
- native pagination and query controls where supported by the Widget.

No ontology-specific refresh coordinator or parallel Redux/Saga execution path
may be introduced.

### Single-execution contract

For a fixed page state and fixed Query configuration:

- initial automatic execution produces one provider request;
- binding a Table Widget does not itself create an execution loop;
- a manual Run creates exactly one additional execution;
- writing a normal success, empty, or error result into DataTree does not
  trigger an execution solely because the result changed;
- any repeated execution must be attributable to a distinct native Appsmith
  trigger or an explicit user action.

The test harness must compare ontology Query behavior with an equivalent native
DB/API Query rather than asserting an ontology-specific behavior in isolation.

## Diagnostic Design

Diagnostics are observational only and must not create a second execution
model. The current Appsmith `PluginExecutor` interface passes
`DatasourceConfiguration` and `ActionConfiguration` to a plugin, but does not
pass `ActionExecutionRequest`. D0 therefore does not modify the shared
Appsmith execution interface merely to add correlation fields.

D0 uses two non-invasive evidence layers instead:

1. Cypress intercepts the native `POST /api/v1/actions/execute` boundary and
   counts requests by datasource and action/query identity where those fields
   are available.
2. Plugin tests use a Recording Runtime Gateway to count provider calls and
   classify success, empty, validation-error, and provider-error results.

The Cypress scenario verifies that binding a Table does not execute a manual
Query by itself, then verifies one execution for one explicit Run. Empty and
error result classification is verified at the plugin contract layer; a
browser-specific empty/error loop test is deferred until a compatible browser
runner is available.

When an existing request context is available outside the plugin boundary, it
may be logged using existing Appsmith facilities. No new cross-component
correlation protocol is introduced in D0.

The observable request path is:

```text
client request
  -> server request
  -> Datasource action
  -> PF4J executor
  -> Runtime Provider
```

Each test or existing diagnostic event may record:

- request/action identity when available;
- Datasource ID;
- Appsmith action/query ID;
- ontology operation;
- metadata snapshot ID;
- start and end timestamps;
- success/failure classification;
- result count where available.

Diagnostics must not record business payloads, credentials, action
parameters, or other sensitive values. Existing Appsmith logging and request
context facilities should be reused where possible.

The first investigation must distinguish these possible sources of repeated
execution instead of assuming a plugin defect:

1. unstable Datasource or Query configuration identity;
2. plugin result shape causing a DataTree update loop;
3. native automatic-run behavior interacting with plugin editor metadata;
4. duplicate frontend binding or lifecycle dispatch;
5. duplicate server/provider processing of one request.

## Test Strategy

### Backend tests

- Controller request and response contract.
- Plugin document ID lookup and missing-plugin failure.
- Demo import and snapshot/provider compatibility validation.
- Datasource configuration persistence after creation.
- Cleanup or rejection of incomplete import results.
- Datasource reload and summary behavior.

### Plugin tests

- Configuration decoding and immutable pin validation.
- Object, Function, Link, and Action operation validation.
- Native success, empty, and error result shapes.
- Provider call count for one plugin execution.
- Rejection of caller attempts to override pinned context.

### Client tests

- Demo import request payload and success handling.
- Import error rendering without ambiguous `[object Object]` output.
- Datasource refresh after successful import.
- No legacy ontology DataTree entity or Object Widget path references in the
  active integration surface.

### Integration or headless browser tests

The preferred scenario is:

1. Open an App with the Demo Ontology Datasource.
2. Create or load an ontology Object Query.
3. Bind a native Table Widget to `Query.data`.
4. Observe request and provider execution counts during initial stabilization.
5. Trigger Run explicitly and verify one additional execution.
6. Verify normal data, empty data, and error behavior.

The test should use request interception or correlation IDs, not timing alone,
to count executions. A short quiet period may be used only after all native
initialization events have completed.

## D0 Acceptance Gate

D0 is complete only when all of the following are true:

- Demo import succeeds from the Datasource surface.
- Reloaded Datasource configuration remains executable.
- Datasource import failures do not leave an active partial record.
- Native ontology Query results render through `Query.data`.
- Table initial binding does not produce an execution loop.
- Manual Query Run produces one intentional execution.
- Empty and error results remain within the native result contract.
- Native DB/API Datasource regression tests pass.
- No legacy ontology DataTree or Object Widget path is active.
- Backend, plugin, client, and integration checks are recorded in a D0
  verification document.

Failure of any item blocks D1 Metadata/Native Query work.

## Subsequent Roadmap

After D0 passes, implementation proceeds through independent gates:

1. **D1 Metadata and Native Query**: stable semantic metadata, query editor
   configuration, projection, filtering, sorting, pagination, and completion.
2. **D2 Native Widget Compatibility**: Table, List, Form, Select, Input, and
   Chart consumption through native Query results.
3. **D3 Action Server Protocol**: workspace-level configuration and protocol
   mapping for synchronous, asynchronous, failure, audit, and idempotency
   responses.
4. **D4 Ontology Project Engineering**: YAML exchange, platform release
   import, version pinning, upgrade reports, and Provider health checks.
5. **D5 Developer Experience**: English UI states, semantic display names,
   field metadata, autocomplete, binding guidance, and debugging support using
   the existing i18n and Datasource patterns.
6. **D6 Development Checkpoint**: full automated regression and a documented
   manual verification list.

Production planning starts only after D6:

- production read-only Runtime Provider;
- real Action Server and coordinated authorization;
- Datasource ACL and ontology-domain permissions;
- release snapshot, upgrade, rollback, and compatibility validation;
- production build, deployment, and release checks.

## Constraints

- Ontology remains a first-class Datasource beside DB and API sources.
- Multiple Apps may share one Ontology Datasource.
- Native Query/JS mode remains available.
- All new visible UI text is English and uses the existing i18n mechanism.
- One App must not bind multiple active versions of the same Ontology Project.
- Action Server business execution remains outside Worksmith.
- Subtasks must be short, serial for shared files, and validated with focused
  tests before broader checks.
