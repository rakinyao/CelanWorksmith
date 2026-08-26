# Ontology Object Set Function and Action Design

## Goal

Make every Ontology Function and Action a member capability of one or more
Ontology object types. Separate what a capability does from the homogeneous
set of objects to which a Query applies it.

This phase replaces the current Function `poId` parameter and Action top-level
`objectId` convention with a typed target Object Set. It also completes the
missing Action Query Builder and Advanced editor modes.

## Decisions

- A Function or Action has one or more `ownerObjectTypeIds`; global,
  unowned capabilities are not supported.
- One execution has one selected owner type and a homogeneous
  `ObjectSet<OwnerType>` target. Object types must never be mixed in a target
  set.
- A target set is execution context, not a business parameter. It is produced
  from a single object, selected Table rows, an Object Query result, or an
  Object Query filter.
- Every Function and Action is atomic in business intent: the capability says
  what to do, never whether IDs, a filter, or a Table selection supplied the
  target set.
- Action metadata declares `atomic: true|false`. The default is `false`.
  Non-atomic Actions report a result per target; atomic Actions require a
  whole-set transaction and fail before any mutation when that guarantee is
  unavailable.
- Builder and Advanced modes edit only the selected capability's business
  parameters and its target-set input. They cannot override capability IDs,
  owner type, target type, or transaction requirements.

## Metadata Contract

Function and Action metadata gains ordered `ownerObjectTypeIds`. Existing
Action `objectTypeId` becomes a one-item owner list for the current Demo
Action. Functions gain the same declaration.

Actions additionally gain `atomic`, defaulting to `false`. The first Demo
Action remains non-atomic. No batch scheduling, retry policy, progress stream,
or Filter DSL expansion is included in this phase.

The Demo metadata becomes conceptually:

```yaml
functions:
  - id: CalculateDelayDays
    ownerObjectTypeIds: [PurchaseOrder]
    parameters: []
actions:
  - id: UpdateProductionSchedule
    ownerObjectTypeIds: [PurchaseOrder]
    atomic: false
    parameters:
      - id: newScheduleDate
```

`CalculateDelayDays` no longer exposes `poId`: its PurchaseOrder target comes
from the Object Set context.

## Query Contract and Runtime

The canonical Function and Action Query definition has separate capability,
target, and business-parameter sections:

```json
{
  "functionId": "CalculateDelayDays",
  "target": {
    "objectTypeId": "PurchaseOrder",
    "source": "SINGLE_OBJECT",
    "objectId": "{{Table1.selectedRow.id}}"
  },
  "parameters": {}
}
```

The final runtime request contains the resolved, typed Object Set rather than
an untrusted cross-type ID list. A single object is normalized to a one-item
set. Target resolution validates the owner type, enforces configured limits,
and returns native Query errors for empty, malformed, mismatched, or oversized
inputs.

The existing native Appsmith datasource/query/action pipeline remains the only
execution path. No Action Widget, client-side ontology state, or parallel
Action runtime is introduced.

## Editor Interaction

The editor uses one ordering for Function and Action Queries:

```text
Object type -> Function or Action -> Target object set -> Business parameters
```

Selecting an object type fetches only capabilities that declare that owner.
Selecting a capability resets its target and business parameters in this
release. Switching Builder and Advanced preserves the selected type,
capability, target, and values.

Builder presents a target-source control and typed parameter fields. Advanced
edits a JSON object containing only target-source details and `parameters`.
The capability selector and owner type remain distinct controls in both modes.

This phase supports `SINGLE_OBJECT` first. Object Query result, Table selected
rows, and Filter sources share the same target-set contract but are implemented
only when their editor controls and limit semantics are separately specified.

## Results and Auditing

Function results retain the native `Query.data` path and preserve target order.
Non-atomic Action results return per-target status, changes, errors, and audit
identity. Atomic Actions return one whole-set outcome.

The Demo Action Server continues to own Action mutation and audit persistence.
Its v1 request contract evolves with the target-set representation; the
Worksmith HTTP client stays workspace-scoped and replaceable.

## Migration and Scope

There are no production Builder Queries. Existing development-only Function
and Action Queries may be recreated; backward compatibility is not required.

The work includes only the metadata, editor, plugin validation, runtime
boundary, Demo Action Server contract, Demo fixtures, and focused automated
coverage necessary for the two PurchaseOrder examples. It explicitly excludes
heterogeneous Object Sets, arbitrary global capabilities, batch scheduling,
retry, progress, full Filter authoring, and broader Demo business data.

## Verification

Focused automated and isolated local tests must prove:

1. Functions and Actions reject missing or incompatible owner types.
2. A single PurchaseOrder object resolves to `ObjectSet<PurchaseOrder>`.
3. `CalculateDelayDays` uses target context and has no `poId` business input.
4. Action Builder and Advanced expose the same target/parameter contract and
   cannot override selected metadata.
5. Cross-type, empty, and over-limit targets fail through the native Query
   error path before execution.
6. Non-atomic Action execution records per-target outcomes and audit records.
7. An Action declared atomic fails before mutation if the Demo server cannot
   provide a whole-set transaction.
