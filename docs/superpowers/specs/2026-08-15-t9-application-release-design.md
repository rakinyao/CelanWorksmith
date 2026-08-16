# T9 Application Release Design

## Status

Approved design boundary. This document defines the development-environment
release foundation for CelanWorksmith. It does not implement production
deployment or an Action Server protocol.

## Goal

Add an Appsmith-native release lifecycle that can validate an App, capture an
immutable release snapshot, manually activate a validated release, and roll
back to a previous release without changing the Ontology Datasource execution
path.

## Background and Constraints

The H0-H6 baseline already provides a native Ontology Datasource path. An
Ontology Datasource is a peer of DB and API Datasources and an App may use
multiple Datasources at the same time. Query and JS modes remain supported.

The existing native path already has the concepts required to pin Ontology
metadata, including `providerId`, `metadataSnapshotId`, metadata digest, and
Provider compatibility validation. T9 must reuse these capabilities rather
than recreate a parallel object state, execution chain, or runtime loader.

The following constraints are mandatory:

- The active release is selected manually and remains immutable.
- Ontology versions are never switched automatically.
- Release validation must run before activation.
- Runtime Provider data may be replaced only when it satisfies the pinned
  Provider and metadata contract.
- Action Server behavior is represented by an adapter boundary only. T9 must
  not infer or define asynchronous confirmation, progress, retry, timeout,
  audit, or authorization semantics.
- New user-facing UI text uses the existing i18n system and English resources.
- Secrets are never copied into a release snapshot or exposed in diagnostics.
- The implementation is limited to the current development environment; no
  production deployment system is required.

## Alternatives Considered

### Native Appsmith Release Pipeline Extension

Extend the existing Appsmith publish flow with Ontology-specific validation,
release metadata, and manual release activation. This keeps one App lifecycle,
one runtime selection mechanism, and the existing Datasource model.

**Decision:** Selected. It minimizes coupling and prevents a second release
state machine from diverging from Appsmith behavior.

### Independent CelanWorksmith Release Service

Create a separate release service responsible for snapshots, validation,
activation, and rollback. This would isolate CelanWorksmith logic but would
create a second publishing state and require synchronization with Appsmith.

**Decision:** Rejected for T9. The isolation benefit does not justify the
additional state and integration surface at this stage.

### External CLI Release Tool

Export and validate release files outside the editor. This is useful for
future automation but cannot provide an integrated editor workflow or enforce
runtime activation semantics.

**Decision:** Deferred. A future CLI may consume the same release manifest,
but it is not part of T9.

## Release Lifecycle

An App has an editable Draft and zero or more immutable Releases. A release
must move through the following states:

```text
Draft
  -> Preflight Validation
  -> Snapshot Created
  -> Published
  -> Superseded
  -> Rolled Back
```

The state meanings are:

- `Draft`: the current editable Appsmith App state.
- `Preflight Validation`: dependency, metadata, Provider, and configuration
  checks are running or have failed.
- `Snapshot Created`: an immutable, content-addressed release record exists
  but is not active.
- `Published`: the release is the active runtime release for the App.
- `Superseded`: a later release became active; the record remains available.
- `Rolled Back`: the release was previously active and was replaced by a
  selected earlier release. The record remains immutable.

Activation updates one active-release pointer atomically. It does not mutate
the release content or rewrite the App Draft.

## Release Snapshot Model

Each release snapshot contains the following logical sections.

### Identity and provenance

- `releaseId`
- `applicationId`
- `workspaceId`
- `baseRevisionId`
- `releaseSchemaVersion`
- `createdBy`
- `createdAt`
- `releaseMessage`
- `contentDigest`

### App content

- Published App, Page, and Widget definitions.
- Widget property values and bindings.
- Query and JS configuration required by the published App.
- Action and Link configuration references.
- Referenced plugin identifiers and versions.

The snapshot records the exact published configuration, not a live pointer to
the editable Draft.

### Datasource pins

Every Datasource used by the App is represented as a typed pin. The model
supports multiple Datasources and does not make Ontology special at the App
level.

An Ontology Datasource pin includes:

- `datasourceId`
- `pluginId`
- `providerId`
- `metadataSnapshotId`
- `metadataDigest`
- `providerContractVersion`
- required object, property, Function, Link, and Action metadata references

DB and API Datasources retain their native Appsmith configuration references.
Credentials and secret values are stored through the existing secret
mechanism and are not copied into the release content.

### Validation record

The snapshot records the validation result that allowed its creation:

- validator version;
- check identifier;
- severity: `BLOCKING`, `WARNING`, or `INFO`;
- stable diagnostic code;
- safe display message;
- affected App, Datasource, Query, Widget, or metadata reference;
- validation timestamp.

Diagnostics must preserve structured server fields for debugging while
redacting values matching `token`, `password`, `secret`, `authorization`, and
`apiKey` patterns.

### Action Server adapter reference

The snapshot may contain a workspace-level Action Server adapter reference and
its adapter version. It may contain endpoint identity and non-secret
configuration needed to select an adapter.

It must not contain a guessed Action Server request or response schema. T9
only validates that the configured adapter reference is syntactically valid
and available. Protocol-level validation is deferred until the external
contract is fixed.

## Preflight Validation

Preflight validation runs against the exact Draft revision that is about to be
released. The validator returns a complete deterministic result rather than
stopping after the first failure.

### Structural checks

Structural checks must detect:

- missing Datasource or plugin references;
- malformed Query or JS configuration;
- missing Query, Widget, Action, or Link dependencies;
- references to deleted object types, properties, Functions, or Links;
- unsupported plugin or Datasource configuration versions;
- duplicate or invalid release references.

### Ontology metadata checks

For each Ontology Datasource, validation must confirm:

- the pinned `metadataSnapshotId` exists;
- the stored digest matches the snapshot content;
- the `providerId` matches the snapshot Provider;
- all referenced metadata is present and visible;
- Function and Link query definitions are compatible with the pinned snapshot;
- Action definitions are structurally valid without assuming Action Server
  execution semantics.

### Provider compatibility checks

The existing Provider compatibility validator is the single source of truth
for these checks. T9 invokes it through a release-validation boundary and
does not duplicate its rules.

The check covers:

- Provider reachability;
- Provider identity;
- metadata snapshot availability;
- metadata digest equality;
- Provider contract-version compatibility;
- required Object, Function, Link, and Action metadata.

Provider failure is a blocking error for release activation. No fallback
Provider or automatic metadata version is selected.

### Diagnostic severity

- `BLOCKING`: release snapshot creation or activation is rejected.
- `WARNING`: release may be created only after the user explicitly acknowledges
  the warning; the warning remains in the release record.
- `INFO`: release may proceed and the result remains available for audit.

## Provider Health Gate

Provider health is checked at preflight and again immediately before manual
activation. The second check prevents a release from activating after the
Provider became unavailable between validation and activation.

The health result is scoped to the pinned Provider and metadata snapshot. It
must not silently validate a different snapshot. Health checks are read-only
and must not mutate Provider or App state.

For the current development environment, the Mongo-backed simulated Provider
is the reference implementation. The same interface must support a future
Ontology management platform Provider without changing the App release model.

## Activation, Upgrade, and Rollback

### Activation

1. Select a Draft revision or an existing immutable Release.
2. Run preflight validation.
3. Run the final Provider health gate.
4. Create or select the immutable Release.
5. Atomically update the App active-release pointer.
6. Record the activation event and validation result.

Activation is rejected if any blocking result exists or if the final Provider
health check fails.

### Upgrade

Upgrade is always a manual selection of a target Release. The system displays
the difference between the current active Release and the target before the
activation request. The diff includes App content, Datasource pins, Ontology
metadata snapshot, Provider identity, and validation diagnostics.

### Rollback

Rollback selects a previously validated Release and follows the same final
Provider health gate as an upgrade. Rollback changes only the active-release
pointer. It does not delete newer releases and does not modify the Draft.

### Automatic switching prohibition

Runtime errors, Provider health changes, metadata publication, and Action
Server availability must never trigger an automatic release or Ontology
version switch.

## Runtime Boundary

The runtime resolves the App's active Release first, then supplies the pinned
Datasource configuration to the existing native Datasource execution path.

The runtime must not:

- load Ontology metadata from the editable Draft;
- refresh or replace the pinned metadata snapshot implicitly;
- use the legacy `$objects`, `$functions`, `$actions`, or `$variables` paths;
- create a second Object-aware execution chain;
- bypass the normal Appsmith Query, JS, Action, or Widget path.

If an active Release is unavailable or invalid, runtime behavior must return a
structured release error and must not select another release silently.

## Action Server Boundary

T9 defines only an internal adapter interface with these responsibilities:

- identify the workspace Action Server configuration;
- expose the adapter version;
- validate non-secret configuration shape;
- provide a future extension point for protocol compatibility checks.

T9 does not define or implement:

- Action Server request or response payloads;
- asynchronous confirmation states;
- progress reporting;
- retry or timeout policy;
- authorization decisions;
- audit storage or audit event schema;
- execution routing semantics.

Those responsibilities remain with the Action Server team and will be added
through a separately approved contract.

## API and Component Boundaries

The implementation plan should keep the following boundaries explicit:

### Server

- Release snapshot model and repository.
- Preflight validation service.
- Release manifest and diagnostic DTOs.
- Provider health gate adapter using the existing compatibility validator.
- Activation and rollback service with atomic active-release updates.
- Action Server adapter configuration validator.

### Client

- Release preflight result view.
- Release history and active-release indicator.
- Manual upgrade and rollback confirmation flow.
- Safe diagnostic rendering using existing i18n resources.

The client must not reproduce server validation rules. It renders structured
diagnostics returned by the server.

### Plugin and shared interfaces

- Continue using the native Ontology Datasource plugin.
- Continue resolving metadata through the pinned snapshot gateway.
- Add only the smallest shared interface needed by the server release
  validator and plugin compatibility checks.

## Error Handling and Security

- Every rejected release returns a stable diagnostic code and affected
  resource reference.
- Provider failures include availability and compatibility cause categories,
  not credentials or raw secret-bearing configuration.
- Release records are immutable after creation.
- Activation events record actor, source release, target release, result, and
  timestamp.
- Secret values remain in Appsmith's existing secret storage path.
- Release and diagnostic APIs enforce the existing workspace and App access
  boundaries; a new production ACL model is out of scope.
- Unexpected errors are converted into structured server responses and do not
  cause an implicit fallback release.

## Verification Strategy

Each implementation task must have an independent verification target.

### Unit and service tests

- release snapshot digest stability;
- immutable snapshot behavior;
- Datasource pin serialization and secret redaction;
- missing metadata, digest mismatch, Provider mismatch, and unsupported
  contract failures;
- blocking, warning, and info severity behavior;
- deterministic release diff;
- atomic activation and rollback;
- no automatic release switching;
- Action Server adapter configuration validation without protocol assumptions.

### Integration tests

- App with DB, API, and Ontology Datasources in one release;
- Query and JS references resolved against the pinned Ontology snapshot;
- simulated Mongo-backed Provider health gate;
- failed Provider gate prevents activation;
- rollback restores an earlier immutable snapshot;
- active release remains independent from later Draft edits.

### Browser verification

- create a release from an App containing an Ontology Datasource;
- display successful preflight results;
- display blocking diagnostics in English;
- activate a validated release;
- create a second release and manually switch between releases;
- roll back to the previous release;
- verify no automatic version switch occurs after a Provider failure.

## T9 Deliverables

The T9 implementation cycle is complete only when the repository contains:

1. Release snapshot and manifest model with immutable persistence.
2. Preflight validation and Provider health gate integration.
3. Manual activation, upgrade, and rollback behavior.
4. Action Server adapter boundary without guessed protocol behavior.
5. Editor release diagnostics and history UI using English i18n strings.
6. Unit, integration, and browser verification records.
7. A T9 checkpoint documenting known limitations and the deferred Action
   Server contract.

## Deferred Follow-up

After the Action Server contract is approved, a separate design must define
protocol negotiation, authorization, audit, asynchronous execution state,
retry, timeout, and progress behavior. That work must extend the adapter
boundary without changing the release snapshot or native Datasource model.
