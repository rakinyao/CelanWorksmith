# Task 1 Report

## Implementation

Added a dependency-free Node ESM generator driven only by the tracked ontology release and the fixed scenario JSON. It discovers entity fields and primary keys from release runtime bindings, uses a hashed seed plus `mulberry32`, emits deterministic supplier/customer/contract/purchase-order arrays, validates relationships, types, amount and timestamp invariants, and provides stable formatted JSON output via `writeRuntimeData`.

## Verification

RED command (before implementation):

```text
node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
```

Salient RED output: `ERR_MODULE_NOT_FOUND` for `scripts/celanworksmith/generate-business-core-runtime-data.mjs`.

GREEN command:

```text
node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
```

Salient GREEN output: `1` test passed, `0` failed.

Additional CLI verification generated four formatted files and confirmed 2026 signed/completed contract value of `CNY 116636501.48` (within the 110-120M design band).

## Changed Files

- `scripts/celanworksmith/generate-business-core-runtime-data.mjs`
- `scripts/celanworksmith/business-core-runtime-scenario.json`
- `scripts/celanworksmith/generate-business-core-runtime-data.test.mjs`

## Self-Review

The generator does not read production/reference data, alter the release, or modify runtime loaders/files. IDs are stable and `_id` mirrors each release primary key. All generated timestamps are bounded by the snapshot and relationship keys are selected from generated parent rows.

## Concerns

The release has many legacy string fields without controlled vocabularies; those receive deterministic Chinese placeholders. The focused test covers deterministic counts and representative values; dedicated negative tests for each validator invariant can be added in a later task.

## Fix Round 1

Added explicit test coverage for the 2026 annual signing target and snapshot signed/completed band. The generator now deterministically normalizes 2026 signed amounts into two groups: exactly CNY 172.5M overall and CNY 115M for completed/executing contracts, with the balance in draft contracts.

RED command/output after adding assertions:

```text
node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
AssertionError: 2026 total was 145013690.71000007
```

GREEN command/output after implementation:

```text
node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
1 test passed, 0 failed
```

Changed files: `scripts/celanworksmith/generate-business-core-runtime-data.mjs`, `scripts/celanworksmith/generate-business-core-runtime-data.test.mjs`, and this report.
