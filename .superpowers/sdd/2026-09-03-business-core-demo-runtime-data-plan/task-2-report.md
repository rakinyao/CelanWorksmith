# Task 2 Report: Dataset Integrity Validator And Checked-In Fixtures

## Result

Extended `validateRuntimeData` to enforce release-driven field presence and
types, exact scenario counts, unique primary keys, relationship integrity,
amount equations, temporal ordering and snapshot cutoff, declared contract
states, source systems, receipt/arrival consistency, and annual contract target
bands. Purchase-order generation now emits a receipt state consistent with a
nullable arrival date. Generated and checked in the four requested runtime
fixtures.

## TDD Evidence

- RED: after adding the three requested negative tests, the existing validator
  failed the payment test because its error did not identify `paid_amount`.
  The other two mutations were already rejected by partial validation.
- GREEN: after implementation, `node --test
  scripts/celanworksmith/generate-business-core-runtime-data.test.mjs` passes
  all 4 tests.
- CLI generation succeeds, and a second CLI run produces identical SHA-256
  hashes for all four fixture files.

## Changed Files

- `scripts/celanworksmith/generate-business-core-runtime-data.mjs`
- `scripts/celanworksmith/generate-business-core-runtime-data.test.mjs`
- `scripts/celanworksmith/runtime-data/ont_supplier.json`
- `scripts/celanworksmith/runtime-data/ont_customer.json`
- `scripts/celanworksmith/runtime-data/ont_contract.json`
- `scripts/celanworksmith/runtime-data/ont_purchase_order.json`

## Self-review

Validation remains release-driven through entity schemas and runtime binding
primary-key mappings. Decimal arithmetic is compared at cent precision and all
timestamps are parsed as dates before ordering/cutoff checks. The validator
does not read `ref/`, alter the release, or touch seed/legacy fixture paths.

## Concerns

Annual bands for 2024 and 2025 use a 10% tolerance around scenario targets,
while 2026 is exact to one cent and its completed/executing subset is required
to remain within CNY 110-120m. Existing unrelated worktree files were left
untouched.

## Review Round 1 Fix Evidence

Removed the cancelled-contract exception from the current-amount equation.
Timestamp fields now require strict ISO-8601 syntax with valid calendar/time
components before parsing. Purchase-order receipt states are restricted to
`未收货`, `部分收货`, `已收货`, or `拒收`, with both arrival/state directions
validated. Added regression tests covering each review finding.

Exact verification command:

`node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs`

Result: `6` tests passed, `0` failed. Regeneration verification also passed:
all four fixture SHA-256 checks returned `OK` after a second CLI run.
