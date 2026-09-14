# Demo Handler Functions Design

## Scope

This is a provisional demonstration extension for the business-core ontology.
Release `1.0.0` remains immutable and has no capabilities. A new `1.1.0`
fixture may declare a small set of read-only Functions for the current Supplier,
Customer, Contract, and PurchaseOrder data. Actions and production execution
bindings are out of scope.

## Function Contract

Every Function declares an owner object type, a homogeneous target
`OntologyObjectSet<T>`, `maxItems`, parameter definitions, return type,
`sideEffectFree: true`, and an implementation reference. Target selection and
filtering happen outside the Function. A target count above `maxItems` is an
argument error; an empty target set returns the operator's documented neutral
result or a validation error, never an arbitrary value.

The only executable implementation kind is `DEMO_HANDLER`. Its reference is a
stable registry key, not a class name or source location. The registry contains
explicit handlers only; it never evaluates Python, CEL, JavaScript, reflection,
or network callbacks.

## Initial Demo Functions

- `CalculateSupplierRisk`: one Supplier target, returns a risk label derived
  from state, tax rate, and match state.
- `CalculateContractChangeRate`: one Contract target, returns
  `change_amount / original_amount` as DECIMAL with deterministic rounding.
- `CalculateContractGrossAmount`: one or more Contract targets, returns the
  sum of `current_amount` as DECIMAL.
- `CalculateCustomerContractTotal`: one or more Customer targets, resolves
  verified contract links from the snapshot and returns the total current
  contract amount as DECIMAL.

The implementation reads only the pinned snapshot/runtime provider and returns
ordinary native Function Query results. It does not expose implementation
details to the client.

## Compatibility Boundary

The provisional fields belong in `FunctionDTO`, Release parser/mapper, and the
runtime handler registry. When the modelling team finalizes the contract,
replace those seams and preserve `FUNCTION_QUERY`, snapshot pinning,
`OntologyObjectSet`, and native Appsmith response handling.

## Verification

Automated tests must cover handler dispatch, target type and `maxItems`
validation, decimal/null/empty semantics, Release `1.1.0` parsing and digest,
and native Function Query execution. Manual verification imports `1.1.0`,
selects a Function in Builder mode, supplies a filtered ObjectSet, runs it,
and binds the result to a native Text or Table widget.
