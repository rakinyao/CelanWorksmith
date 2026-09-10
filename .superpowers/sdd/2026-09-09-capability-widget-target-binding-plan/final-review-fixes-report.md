# Final Review Fixes: Capability Widget Target Binding

Date: 2026-09-10

## Findings addressed

### P1: stale canonical targets after invalid Builder input

`getCapabilityBuilderTargetUpdate` now returns an explicit invalid canonical
target (`SINGLE_OBJECT` with an empty `objectId`) whenever a present Builder
binding is empty, malformed, or uses an unsupported source. The synchronizer
therefore replaces a previously executable target instead of silently leaving
it active. Existing legacy canonical targets and valid Builder/Advanced
round-trips remain unchanged.

Regression coverage includes empty expressions, malformed mode/cardinality,
and the existing synchronizer dispatch behavior.

### P2: Table provenance and owner awareness

Table adapter key discovery no longer treats arbitrary `primaryColumnId` as a
verified ontology key. Verified adapter expressions require an explicit
canonical-key seam (`canonicalKey`, `ontologyCanonicalKey`, or configured
Table key); otherwise the Table is not offered as a verified Widget source and
manual input remains available.

The control accepts optional `ownerObjectTypeId` metadata on Table widgets and
an owner-object-type form property. Known mismatches render a non-blocking,
bilingual warning while leaving Widget selection and manual expressions
available. Editor resources provide the owner form-property seam for both
Function and Action controls.

## Test-first evidence

The new P1/P2 assertions were run before production edits and failed as
expected:

- P1 received `undefined` instead of the required invalid target update.
- P2 still offered a Table derived only from `primaryColumnId` and rendered no
  incompatibility status.

After implementation, the focused client verification passed:

```text
3 suites passed, 75 tests passed
```

Command:

```text
cd app/client && yarn g:jest \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts \
  src/components/formControls/CapabilityTargetBindingControl.test.tsx
```

`git diff --check` also passed. The repository-wide Prettier check reports
unrelated pre-existing formatting changes in other dirty files; only the
files touched by this fix were formatted directly.
