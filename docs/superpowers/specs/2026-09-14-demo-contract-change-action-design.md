# Demo Contract Change Action Design

## Goal

Add one provisional but fully executable Ontology Action that changes local
Demo Runtime contract data through the existing Action Server v1 boundary.
The implementation validates the complete native `ACTION_QUERY` path without
introducing a parallel client state or allowing the Worksmith Plugin or Runtime
Provider to write business data directly.

The Action is development-only. The eventual ontology Release and Action
Server contracts remain subject to agreement with the modelling and Action
Server teams. The boundaries introduced here must make replacement localized.

## Scope and Release Versioning

The existing `ontology-model-release-demo-functions-1.1.0.json` is immutable.
The Action is published in a new fixture,
`ontology-model-release-demo-actions-1.2.0.json`, which copies the 1.1.0
domain definition and Functions unchanged, then adds one Action. Its
`previous_release_digest` points to 1.1.0 and its canonical `release_digest`
is recalculated after all content is final.

The Action has the following provisional metadata:

| Field | Value |
| --- | --- |
| Action ID | `ApplyContractChange` |
| Owner Object Type | `contract` |
| Target bound | exactly one object (`maxItems: 1`) |
| Atomic | `true` |
| Confirmation hint | `requiresConfirmation: true` |
| `changeAmount` | required non-zero `DECIMAL`; positive or negative |
| `changeReason` | required non-blank `STRING` |

No new contract attribute is invented for the reason. It is an Action business
parameter retained in the Action Server audit record. This preserves fidelity
to the modelling-team definition.

## Execution Model

The saved Action Query uses the existing capability query model:

```json
{
  "target": {
    "objectTypeId": "contract",
    "source": "SINGLE_OBJECT",
    "objectId": "{{ContractsTable.selectedRow.id}}"
  },
  "parameters": {
    "changeAmount": 120000,
    "changeReason": "Scope expansion"
  }
}
```

The native execution flow remains:

```text
ACTION_QUERY
  -> Ontology Plugin snapshot/metadata validation
  -> workspace-scoped OntologyActionServerClient
  -> POST /api/v1/actions/execute
  -> Demo Action Server audit and Mongo transaction
  -> native Action Query result
```

The Plugin determines the pinned workspace, project, Release version,
metadata snapshot, and datasource identity. User-editable Query fields cannot
override them. The Runtime Provider remains read-only.

## Demo Action Server Behavior

`ApplyContractChangeHandler` is a small registered Demo Action Server handler.
It accepts only the local configured workspace/project/Release 1.2.0 pin and
one `contract` target. It validates, in order:

1. Target cardinality and owner type.
2. Target contract exists.
3. `changeAmount` is a finite non-zero decimal value.
4. `changeReason` is a non-blank string.
5. `current_amount + changeAmount` is not negative.

Within the server's Mongo transaction, it changes only the selected contract:

- `change_amount` becomes its previous value plus `changeAmount`.
- `current_amount` becomes its previous value plus `changeAmount`.
- `latest_change_at` becomes the server execution time.

The Action Server creates and completes the audit record in the same execution
model already used for Demo Actions. The audit retains request identity,
idempotency key, action and target identity, the safe business-parameter
summary including `changeReason`, status, timestamps, changed references, and
safe failure information. It must not store unrelated request context or
secrets.

The request's existing idempotency key defines replay semantics. A completed
matching request returns the recorded terminal target outcome and never applies
the amount twice. Because the Action is atomic and single-target, a validation
or write failure leaves both contract amounts unchanged.

## Result and UI Behavior

Success returns the normal v1 `outcomes` envelope with its `auditId`, the
target `contract` changed object, and `changedProperties` for
`change_amount`, `current_amount`, and `latest_change_at`. Domain failures
return the native Action Query error path with a stable code, safe English
message, and audit ID when one exists.

`requiresConfirmation` is metadata, not an automatic widget rewrite. The
Action editor exposes the hint through its existing metadata path. A page
author chooses the relevant native Button confirmation configuration. After a
successful Action, the page explicitly invokes its contract Object Query to
refresh a Table or other widget; no hidden client-side cache is added.

The existing generic Function/Action Builder and Advanced definition controls
remain the sole configuration path. The Action's exact-one cardinality makes
only compatible single-object targets selectable. Manual expressions remain
allowed and are validated by the backend at execution time.

## Replacement Points and Non-Goals

The following are deliberately provisional and localized for replacement once
the external contracts are finalized:

- The fixture's Action metadata structure and canonical Release format.
- The Demo Action Server's fixed local Release pin and Mongo collection mapping.
- The synchronous v1 Action Server request/response protocol and audit schema.
- The current confirmation metadata presentation.

This phase does not add batch contract changes, partial-success behavior,
asynchronous Actions, retries, progress, authorization/ACL policy, a generic
mutation interpreter, direct Plugin writes, or a dedicated Action Widget.

## Verification

Automated verification covers:

1. Release 1.2.0 parser/mapper output, Action metadata, previous digest, and
   canonical digest validation.
2. Plugin validation of owner type, one-target bound, parameters, and atomic
   metadata before calling the Action Server.
3. Action Server success result, changed-property summary, failure without
   mutation, repeated idempotency-key replay, and transaction behavior.
4. Existing HTTP client mapping and standard native Action Query result/error
   conventions.

Manual verification uses seedable Chinese Demo Runtime data: select one
contract, run a positive and then a negative change, refresh the Contract
query, verify the three updated fields and audit ID, repeat a saved request to
prove it does not increment twice, then verify invalid amount/reason and a
negative resulting balance fail without mutation. Original data can be
restored by the existing Demo Runtime reimport process.
