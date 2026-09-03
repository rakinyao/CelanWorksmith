# Task 3 Report: Idempotent Runtime-Asset MongoDB Loader

## Implementation

- Added four ontology runtime seeds to `scripts/celanworksmith/seed-runtime-mongodb.js`:
  `ont_supplier`, `ont_customer`, `ont_contract`, and `ont_purchase_order`.
- Preserved the existing `suppliers` and `purchase_orders` seeds and the shared
  `replaceOne(..., { upsert: true })` behavior. No drops, deletes, connection
  settings, or generation logic were added.
- Added `scripts/celanworksmith/seed-runtime-mongodb.test.mjs`, which executes the
  real loader source in `node:vm` with a fake Mongo Shell API and records calls.

## RED/GREEN Evidence

- RED: Before the loader change, the contract test failed because only
  `suppliers` and `purchase_orders` were observed; the four `ont_*` collections
  were missing.
- GREEN: `node --test scripts/celanworksmith/seed-runtime-mongodb.test.mjs`
  passed (1 test).
- GREEN: `node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs`
  passed (6 tests).

## Files Changed

- `scripts/celanworksmith/seed-runtime-mongodb.js`
- `scripts/celanworksmith/seed-runtime-mongodb.test.mjs`
- `.superpowers/sdd/2026-09-03-business-core-demo-runtime-data-plan/task-3-report.md`

## Self-Review

The test verifies behavior through fake `replaceOne` calls, checks the exact six
collection order, requires `upsert: true` for every call, and rejects destructive
operations. The loader change is limited to the four required seed calls.

## Concerns

None. Existing unrelated worktree files were left untouched.
