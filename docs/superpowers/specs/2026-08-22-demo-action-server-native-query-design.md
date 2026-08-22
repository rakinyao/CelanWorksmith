# Demo Action Server and Native Query Design

## Goal

Enable the development environment to execute Ontology `ACTION_QUERY` actions
against mutable Demo data while preserving a replaceable, workspace-scoped
Action Server boundary. Reuse Appsmith's existing Query and Widget event
pipeline; do not reintroduce legacy `$actions` state or an Action Widget.

This stage also makes the existing `CalculateDelayDays` Function Query operate
against the Mongo-backed Demo data rather than the empty legacy mock store.

## Context and Decisions

The current Ontology Plugin already validates an Action Query from its pinned
snapshot and creates `OntologyActionServerClient.Request`. Its workspace
resolver deliberately has no implementation, so every Action Query currently
fails before execution. The plugin must remain a caller of an Action Server,
not become a business-write implementation.

The Demo Action Server is a development-only, independently deployable
component in this repository. It is not the eventual shared public Action
Server project. Its HTTP protocol and the Worksmith client adapter are the
replaceable contract boundary: a later public server is substituted through
workspace configuration, without changing Widgets, saved Queries, or the
Ontology Plugin's business behavior.

The initial Demo handler is `UpdateProductionSchedule`. The handler registry
is deliberately extensible so later manual-testing scenarios can add bounded
handlers for bulk Demo-data generation, Supplier lead-time changes, derived
customer delivery-date changes, and production-schedule updates. Those later
business workflows are not implemented in this stage.

## Architecture

```text
Native Button / Table / Form event
              |
       {{ ActionQuery.run() }}
              |
     Ontology ACTION_QUERY Plugin
              |
OntologyActionServerClient HTTP adapter
              |
      Demo Action Server process
       |                      |
 execution audit         handler registry
                              |
                   Demo runtime Mongo database
```

### Worksmith responsibilities

- Continue using the native `ACTION_QUERY` configuration, snapshot validation,
  parameter validation, generated idempotency key, and normal Appsmith action
  success/error result path.
- Resolve an Action Server client from a workspace-scoped development
  configuration. No endpoint, credential, or Demo database detail belongs in
  datasource configuration or Widget state.
- Implement an HTTP `OntologyActionServerClient` adapter. It maps transport
  success to `Result` and a server-declared domain failure to `DomainException`
  with its audit ID.
- Apply a bounded request timeout. Transport unavailability, malformed
  responses, and timeout failures remain regular native Query errors.
- Do not write runtime data, retain action execution state, or automatically
  refresh other Queries.

### Demo Action Server responsibilities

- Expose one versioned, synchronous execution endpoint for the initial
  contract, accepting the existing request identity fields: workspace, project,
  project version, datasource, action, target object, parameters, snapshot
  context, and idempotency key.
- Validate request shape and verify that the pinned project/action/target
  combination is supported by the Demo handler. It must reject unknown action
  IDs and invalid parameters as domain errors.
- Create an audit record before executing, update it to `SUCCEEDED` or
  `FAILED`, and return the same audit ID in every completed domain outcome.
- Deduplicate a repeated idempotency key: a completed request returns its
  stored terminal result and must not repeat a mutation.
- Dispatch by `actionId` to small, explicit handler classes. A handler reads
  and writes the Demo runtime Mongo database and returns a structured summary;
  it does not receive any Appsmith Widget or query state.

The server has its own process and configuration, even when launched alongside
the current Win11/WSL development stack. This preserves deployment and
replacement independence without claiming that the development server is a
production Action Server.

## Initial Action Contract

The HTTP adapter serializes the fields already represented by
`OntologyActionServerClient.Request`; callers cannot override datasource
project identity or snapshot context because the Plugin creates those values.

A successful response has this logical shape:

```json
{
  "contractVersion": "v1",
  "auditId": "act-...",
  "status": "SUCCEEDED",
  "message": "Production schedule updated.",
  "changedObjects": [
    { "objectTypeId": "ProductionOrder", "objectId": "..." }
  ],
  "changedProperties": [
    {
      "objectTypeId": "ProductionOrder",
      "objectId": "...",
      "propertyId": "scheduleDate",
      "newValue": "2026-..."
    }
  ]
}
```

The Plugin adds `auditId` to the normal Query response body as it already does.
A domain failure returns a stable English message and audit ID; the HTTP
adapter maps it to `DomainException`, and the native Query error includes the
audit ID. Authentication/authorization policy, asynchronous execution,
progress, retries, and a general remote-server discovery protocol are out of
scope for this initial development contract. The contract version is explicit
so later implementations can negotiate or reject incompatible versions.

The initial `UpdateProductionSchedule` handler accepts the metadata-defined
`PurchaseOrder` target and required `newScheduleDate`. It resolves the target
PurchaseOrder, updates its referenced ProductionOrder schedule and status in
the Demo runtime Mongo database, and returns only the changed-object/property
summary needed by callers. The exact Demo records remain seedable and may be
expanded for test scenarios.

Audit records must retain request identity, idempotency key, action/target,
timestamps, terminal status, a safe result/error summary, and changed-object
references. They must not persist secrets or arbitrary caller context.

## Native Widget Use

No Action Widget, `$actions` DataTree namespace, Redux/Saga execution flow, or
parallel Ontology state is added. A user saves an Ontology Action Query and
uses existing native behavior:

- Button `onClick`, Table row event, Form submit, or another standard action
  invokes `{{ ActionQuery.run() }}`.
- Existing `ActionQuery.isRunning`, `ActionQuery.data`, and native error
  handling provide disabled/loading/success/failure behavior.
- A success event may explicitly invoke related Object Queries to show changed
  Demo data. This is visible, ordered application logic.

`requiresConfirmation` remains metadata for this stage. It does not
automatically rewrite a Widget event. A page author may use the existing
Widget confirmation capability where it fits; automatic metadata-driven
confirmation requires a separate native-UI design.

## Mongo-backed Function Query

Functions remain read-only Runtime Provider work. `MongoRuntimeDataProvider`
must override the inherited mock Function implementation for supported Demo
functions. The first supported implementation, `CalculateDelayDays`, loads the
specified PurchaseOrder from the same Mongo runtime mapping used by Object
Queries and calculates the result from that object. Unsupported function IDs
fail clearly. The Action Server is not involved in Function Query execution.

## Error and Consistency Rules

- Validation failure, an unsupported action, an absent target object, and an
  invalid Demo-data transition are domain failures with an audit ID once an
  audit entry exists.
- A repeated idempotency key returns the original terminal response. A request
  whose key is currently executing fails as a retriable conflict and does not
  start another execution.
- `UpdateProductionSchedule` updates its affected Demo records atomically
  where Mongo supports it. The audit record distinguishes a rejected request
  from an execution failure; a mutation is never reported as successful until
  its write has completed.
- The client timeout must be longer than normal local Demo execution but
  bounded. The caller sees a normal Query error; no automatic retry is made,
  because the idempotency key only protects a retry that retains the same key.

## Scope Boundaries

Included:

- Workspace-configured HTTP Action Server client and the Demo Action Server.
- Synchronous execution, audit persistence, idempotency, and one mutable Demo
  action handler.
- Existing Widget event reuse and normal Query response/error behavior.
- Mongo-backed `CalculateDelayDays` Function Query.
- Focused automated and manual verification documentation.

Excluded:

- A shared public Action Server project, production credentials, authorization,
  remote deployment/discovery, retries, async jobs, progress streaming, or
  automatic Query invalidation.
- A generic workflow/rules engine or the future Supplier-to-customer-order
  business loop.
- Legacy Builder Function/Action state compatibility and a standalone Action
  Widget.

## Verification

Focused tests will cover:

1. The HTTP client request mapping, timeout/malformed-response behavior, and
   mapping of server domain failures with audit IDs.
2. Workspace resolution of the development Demo client while other unconfigured
   workspaces remain rejected.
3. Demo Server request validation, `UpdateProductionSchedule` mutation,
   success and failure audit records, and repeated-key deduplication.
4. Ontology Plugin propagation of result bodies and audit IDs through the
   existing native Query contract, with no direct Mongo write path.
5. Mongo `CalculateDelayDays` against seeded PurchaseOrder data and rejection
   of unsupported Function IDs.
6. Manual verification through an existing Button, Table row event, or Form:
   trigger an Action Query, observe the result/audit ID, explicitly rerun an
   Object Query, and verify the changed ProductionOrder. Also verify a bad date
   or missing target reports a Query error and leaves the data unchanged.

The implementation plan must specify the Demo Server module/process location,
development launch configuration, Mongo collection/index details for audits and
idempotency, and exact request/response DTO names before code is written.
