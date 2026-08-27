# Ontology Capability Target Cardinality Design

## Goal

Make the target Object Set a uniform, system-managed execution context for
every Ontology Function and Action, while allowing each capability to declare
the number of homogeneous target objects it accepts. Add a Supplier Function
that sums the `amount` property of multiple Supplier objects to exercise the
batch contract.

## Decisions

- Every object-bound Function and Action receives one typed
  `ObjectSet<OwnerType>` as execution context. It is not a user-declared
  business parameter and cannot be replaced through Advanced JSON.
- Capability metadata declares required `minItems` and `maxItems`. These
  constrain the resolved, immutable Object Set snapshot, not the editor's
  source control.
- `maxItems: 1` is the `SINGLE` capability form; a larger finite maximum is
  the `MANY` form. The external contract uses numeric bounds rather than a
  separate target input type.
- The platform resolves a target source, freezes its members for that
  execution, then validates the cardinality before calling the runtime or
  Action Server. A source that is dynamic may be configured only when it can
  satisfy the selected capability's bounds; runtime validation remains
  authoritative.
- This phase continues to implement only `SINGLE_OBJECT` target authoring.
  The model must support multi-target Object Sets at the plugin and runtime
  boundary so later Table-selection, Object Query, and Filter sources reuse
  the same contract. Their editor controls, cursor protocol, and batch
  scheduling are out of scope.
- Frozen membership supports auditability and replay. This phase carries an
  ordered materialized ID list. Query-backed cursor/snapshot handles are a
  future representation of the same Object Set contract and are not invented
  before an execution service needs them.

## Metadata Contract

Functions and Actions gain required positive target bounds:

```yaml
functions:
  - id: CalculateDelayDays
    ownerObjectTypeIds: [PurchaseOrder]
    minItems: 1
    maxItems: 1
    parameters: []
  - id: SumSupplierAmounts
    ownerObjectTypeIds: [Supplier]
    minItems: 1
    maxItems: 100
    parameters: []
actions:
  - id: UpdateProductionSchedule
    ownerObjectTypeIds: [PurchaseOrder]
    minItems: 1
    maxItems: 1
    atomic: false
```

The ontology-project importer and validator reject missing, zero, negative,
or inverted bounds. Runtime snapshot metadata exposes the same values to the
plugin. Existing in-memory mock metadata remains aligned with the project
definition.

`CalculateDelayDays` explicitly accepts exactly one PurchaseOrder and returns
an integer. `SumSupplierAmounts` accepts one through one hundred Suppliers,
loads each selected Supplier, and returns the decimal sum of its `amount`
values. It has no business parameters.

## Runtime and Validation

Capability Query validation obtains the selected metadata, validates ownership,
normalizes the configured target into an `OntologyObjectSet`, and validates
the count against the capability bounds. Validation errors state whether the
target set is below the minimum or above the maximum and occur before Function
or Action execution.

Both Mock and Mongo runtime providers enforce the same metadata-derived
target cardinality before object lookup. They retain input target order when a
multi-target Function produces per-target data. The Supplier aggregate returns
one numeric result for the whole set, so its result does not vary by source
shape.

Actions continue to derive transaction semantics only from `atomic`; target
cardinality does not relax an Action's atomicity declaration.

## Editor and Query Contract

The persisted capability definition remains structurally separate:

```json
{
  "functionId": "SumSupplierAmounts",
  "objectTypeId": "Supplier",
  "target": {
    "source": "SINGLE_OBJECT",
    "objectId": "{{SupplierTable.selectedRow.id}}"
  },
  "parameters": {}
}
```

The capability selector displays target acceptance using i18n-backed UI copy.
For a `maxItems: 1` capability, Builder continues to offer a single-object
target. Multi-target source controls are deferred. The editor must not imply
that the application developer may choose a larger target set than the
selected capability permits.

Advanced mode still permits syntactically valid target and business parameter
editing, but cannot override the selected capability, owner type, or metadata
bounds. Plugin validation remains the enforcement point for native Appsmith
execution.

## Demo Data

The demo ontology adds `amount` to Supplier definitions and seeded Supplier
instances with deterministic numeric values. `SumSupplierAmounts` is included
in both the monolithic demo YAML and the bundled project import, and in the
bootstrap manifest. The demo data is sufficient to run the Function against
one Supplier and against an injected multi-ID Object Set in automated tests;
the UI remains single-target until multi-target source authoring is designed.

## Verification

Focused automated coverage proves:

1. Project import and snapshot projection preserve valid target bounds and
   reject invalid bounds.
2. A single-target Function rejects a manually supplied Object Set with more
   than one ID before runtime work begins.
3. The new Supplier Function accepts more than one Supplier, returns the
   expected amount sum, rejects missing Suppliers, and rejects more than its
   maximum target count.
4. Mock and Mongo providers apply the same target-cardinality validation.
5. Query editor metadata shows the selected capability's target acceptance and
   keeps its existing Builder/Advanced invariant tests green.

## Scope

This phase does not add Filter, Object Query, Table multi-selection, cursor
transport, batch job scheduling, progress reporting, retries, or generic
server-side Object Set handles. Those features will consume the typed target
cardinality and frozen-set contract defined here.
