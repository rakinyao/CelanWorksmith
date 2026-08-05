# T5 Function and Action Execution Design

**Date:** 2026-08-04

**Status:** Design approved; implementation plan pending review

**Scope:** CelanWorksmith T5, Function execution, Action execution, execution state, and object data refresh

## 1. Goal

Extend the T4 read-only object binding with asynchronous Function and Action execution while keeping network calls outside the synchronous expression evaluator. Execution results, status, errors, and Action changes must be observable through DataTree and must not regress native Appsmith Query Action behavior.

The T5 implementation is limited to the existing Mock Provider and the existing CelanWorksmith runtime API. New Object-aware Widgets, including `ActionButton`, remain in T6.

## 2. Design Decisions

### 2.1 Asynchronous DataTree Nodes

Functions and Actions are exposed under independent namespaces:

```text
$functions.<functionId>
$actions.<actionId>
```

Function usage:

```text
$functions.CalculateDelayDays.run({ poId: "PO001" })
$functions.CalculateDelayDays.data
$functions.CalculateDelayDays._meta
```

Action usage:

```text
$actions.UpdateProductionSchedule.run({
  objectId: "PO001",
  newScheduleDate: "2026-03-15"
})
$actions.UpdateProductionSchedule.data
$actions.UpdateProductionSchedule._meta
```

`run()` dispatches a Redux request. It does not synchronously wait for a network response inside the worker evaluator. The Saga performs the API call and dispatches the result back to Redux, followed by `TRIGGER_EVAL`.

### 2.2 Existing Runtime API Contracts

The T5 frontend uses the existing Celanworksmith API client and backend endpoints:

```text
POST /api/v1/celanworksmith/runtime/functions/{functionId}/execute
Body: { "parameters": { ... } }

POST /api/v1/celanworksmith/runtime/actions/{actionId}/execute
Body: {
  "objectTypeId": "PurchaseOrder",
  "objectId": "PO001",
  "parameters": { ... }
}
```

Function responses remain wrapped by Appsmith `ResponseDTO` and expose an arbitrary `data` value. Action responses expose `success`, `message`, `executionId`, `changedObjects`, and `sideEffects`.

The current Action request remains single-object based. Multi-object execution is outside T5 and requires a later versioned contract.

### 2.3 Separate Execution State

Execution state is kept in a new CelanWorksmith execution state layer rather than being mixed into the T4 object reducer. The state contains:

```text
functions[functionId]
actions[actionId]
requests[requestId]
```

Metadata is loaded from the existing ontology endpoints and stored globally, rather than remaining only in `OntologyExplorer` React local state:

```text
GET /api/v1/celanworksmith/ontology/functions
GET /api/v1/celanworksmith/ontology/actions
```

This global metadata supports DataTree generation, autocomplete, client-side parameter validation, and future T6 controls.

## 3. DataTree Contract

### 3.1 Function Entity

Each Function entity exposes:

```text
{
  run,
  data,
  _meta,
  ENTITY_TYPE: "CELANWORKSMITH_FUNCTION"
}
```

`data` contains the most recent successful result. It remains unchanged when a later request fails, while `_meta` reports the latest request status and error. A future implementation may expose a separate `lastSuccessfulRequestId` if consumers need to distinguish the data version.

### 3.2 Action Entity

Each Action entity exposes:

```text
{
  run,
  data,
  changedObjects,
  sideEffects,
  _meta,
  ENTITY_TYPE: "CELANWORKSMITH_ACTION"
}
```

`data` contains the Action result. `changedObjects` and `sideEffects` are copied into the entity, while `executionId` is stored in `_meta`.

The public paths are fixed for T5:

```text
$actions.<id>.data
$actions.<id>.changedObjects
$actions.<id>.sideEffects
$actions.<id>._meta.executionId
```

### 3.3 Execution Metadata

Both Function and Action `_meta` use the following state machine:

```text
IDLE -> QUEUED -> RUNNING -> SUCCEEDED
                    |-> FAILED
                    |-> CANCELLED
```

The metadata records:

```text
{
  status,
  requestId,
  executionId,
  startedAt,
  completedAt,
  error: { code, message },
  parametersHash
}
```

`executionId` is available when the backend returns one. Function requests may not have an execution ID and must continue to expose a valid request ID.

## 4. Execution Flow

```text
Widget or JS event
  -> DataTree run dispatcher
  -> Redux execution request
  -> Celanworksmith Function/Action Saga
  -> CelanworksmithAPI
  -> RuntimeController
  -> RuntimeProvider
  -> Redux success/error state
  -> Object refresh when Action changes data
  -> TRIGGER_EVAL
  -> Widget/DataTree update
```

The implementation must not make an HTTP call directly from a React render function, a synchronous DataTree evaluator, or a Widget render method.

## 5. Validation and Error Handling

### 5.1 Two Validation Layers

The frontend validates Function and Action requests using ontology metadata:

- Required parameter presence.
- Basic parameter type compatibility.
- Action object type compatibility.
- Known Function and Action IDs.

The backend remains the final authority:

- Authentication and authorization.
- Provider availability.
- Unknown Function and Action handling.
- Object existence and object type checks.
- Business parameter validation.
- Provider-side errors.

Client validation must not replace backend validation or imply that a request is authorized.

### 5.2 Error Mapping

The frontend maps API errors into structured `_meta.error` values. User-facing messages must not include Java stack traces. At minimum, the implementation distinguishes:

- Invalid arguments.
- Unknown object type or object.
- Unknown Function or Action.
- Provider unavailable.
- Timeout.
- Network failure.
- Backend business failure.

Successful prior Function data is retained when a later call fails; the failure remains visible in `_meta`.

### 5.3 Cancellation and Duplicate Submission

Function and Action requests have request IDs. The client prevents duplicate Action submission while the same Action is `RUNNING`. Failed Actions can be explicitly retried.

Cancellation must transition the client request to `CANCELLED` and prevent a cancelled request from triggering a success refresh. The API client methods will accept an optional `AbortSignal`, and the Saga will abort the corresponding request when cancellation is dispatched. The backend is not required to roll back an operation after the HTTP connection is closed; Action idempotency and rollback are outside T5.

Side-effecting Actions are never cached. Side-effect-free Functions may use a bounded cache keyed by `functionId + parametersHash`; the cache policy must be explicit in implementation, with a default TTL of 30 seconds unless a later requirement changes it.

## 6. Refresh and Input Preservation

### 6.1 Refresh Triggers

T5 supports these refresh triggers:

1. Initial page or editor load.
2. Explicit user refresh or retry.
3. Successful Action completion.
4. A successful Action response containing `changedObjects`.
5. One controlled retry for a transient request failure, followed by explicit user retry.

T5 does not add polling, WebSocket subscriptions, or global real-time invalidation.

`TRIGGER_EVAL` only recomputes expressions after data changes. It does not initiate another object query.

### 6.2 Action Refresh Scope

After a successful Action:

1. Apply or identify the returned `changedObjects`.
2. Determine affected Object Types from `changedObjects[*].typeId`.
3. Update or invalidate only those Object Types.
4. Re-fetch affected Object Types when consistency requires it.
5. Dispatch `TRIGGER_EVAL` once the Redux data is coherent.

T5 does not implement a global intelligent dependency graph. Object Type-level invalidation is the correctness boundary.

### 6.3 Unsaved Input Policy

Refresh updates backing object data but does not silently discard unsubmitted user input.

| Input state | Refresh behavior |
|---|---|
| Read-only display | Re-evaluate from the latest object data |
| Unmodified input | Use the latest object data |
| Modified but not submitted | Keep the local value |
| Modified and unfocused but not submitted | Keep the local value; focus is not the dirty criterion |
| Successful submission | Use the server response and clear dirty state |
| Failed submission | Keep the local value and expose the failure |
| External refresh conflicts with local edits | Keep local input and mark a conflict; do not silently overwrite |

T5 does not add a complete conflict-resolution UI. The initial implementation must preserve the local value and expose enough state for a later Form/Object-aware Widget to present Keep Local, Reload Remote, or Compare choices.

## 7. Implementation Boundaries

The implementation plan will primarily touch:

- Celanworksmith API client and API tests.
- New execution actions, reducer, selectors, and Saga.
- DataTree entity types and generator definitions.
- Existing `OntologyExplorer` loading path, moving metadata into global state while preserving its display behavior.
- Existing Appsmith event/action dispatch integration, without changing native Query Action protocols.
- Backend runtime validation and tests only where current contracts do not enforce T5 requirements.

No T6 Widget implementation is included. Existing Button, Text, Table, and JS expression surfaces are sufficient for T5 manual validation.

## 8. Verification Plan

### 8.1 Backend Tests

- Function success and return value tests.
- Function unknown ID and invalid parameter tests.
- Action success response including `executionId`, `changedObjects`, and `sideEffects`.
- Action unknown ID, missing parameter, object not found, and object type mismatch tests.
- Runtime Controller response/error mapping tests.

### 8.2 Frontend Tests

- API request body and response parsing tests.
- Metadata reducer and DataTree generation tests.
- Function and Action state transitions.
- Success, failure, timeout, cancellation, retry, and duplicate submission tests.
- Side-effect-free Function cache tests.
- Action success invalidation and Object Type refresh tests.
- Input preservation tests for unsubmitted local values.
- Autocomplete definitions for `$functions` and `$actions`.
- Existing native Query Action regression tests.

### 8.3 Manual Verification

Use existing Appsmith widgets:

```text
Button onClick:
$functions.CalculateDelayDays.run({ poId: "PO001" })

Text:
$functions.CalculateDelayDays.data
```

Then verify:

1. Function state progresses to `SUCCEEDED` and Text displays the result.
2. Invalid parameters produce a visible failure state without stale success reporting.
3. Action execution updates the affected ProductionOrder or DeliveryOrder.
4. Action execution shows `RUNNING`, then `SUCCEEDED` or `FAILED`.
5. Repeated Action clicks while running do not create duplicate requests.
6. Failed Actions can be retried.
7. Unsubmitted Input values survive an Action-driven refresh.
8. `$objects.<type>.all` and Table data reflect the successful change.
9. Native Query Action execution remains functional.

## 9. Acceptance Criteria

T5 is complete only when:

- Functions and Actions are accessible through asynchronous DataTree nodes.
- Network calls run through Redux/Saga and not synchronous expression evaluation.
- Function and Action states, errors, request IDs, and Action execution IDs are observable.
- Frontend metadata validation and backend validation both remain active.
- Action success refreshes affected object types and triggers one coherent evaluation update.
- Unsaved local input is not silently overwritten by refresh.
- Function cache behavior is limited to side-effect-free Functions.
- Success, failure, timeout, cancellation, duplicate submission, retry, and native Action regressions are tested.
- Manual Button/Text/Table verification passes against the running Mock Provider.

## 10. Out of Scope

- T6 `ActionButton`, `ObjectDetail`, or `FilterList` Widgets.
- Multi-object Action request contracts.
- Polling, WebSocket subscriptions, or global real-time synchronization.
- Global intelligent dependency graphs.
- Full conflict-resolution UI.
- Reasoning UI or `$reason` integration.
