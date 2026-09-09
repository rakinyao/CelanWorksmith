# Task 5: Capability Target Runtime Fix

Date: 2026-09-09

## Root Cause

The Builder target control was registered against `actionConfiguration.formData.target.data` and wrote editor metadata (`mode`, `widgetId`, `cardinality`, and `expression`) into the runtime target field. The ontology plugin copies that field at the runtime boundary, so Builder metadata reached canonical target validation and was rejected. The Advanced definition mirror did not correct the runtime field.

## TDD Evidence

RED was recorded before the production correction with:

```text
yarn g:jest src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts src/entities/Action/actionProperties.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts
```

The expected failures were:

- Advanced hydration returned Builder metadata at `target.data` instead of canonical runtime data plus separate metadata.
- The capability target reactive path was `config.formData.targetBinding.data` instead of the canonical `target.objectIds` leaf.
- The editor resource test could not find a `targetBinding.data` control because both resources still used `target.data`.

A legacy canonical-target control regression was then added and independently observed RED: canonical `{ source: "SINGLE_OBJECT", objectId: "PO002" }` rendered an empty manual expression.

## Correction

- Editor resources now bind the target control to `formData.targetBinding.data`.
- `formData.target.data` is canonical runtime data: `SINGLE_OBJECT/objectId` or `OBJECT_SET/objectIds`.
- Capability serialization prefers separate Builder metadata while retaining legacy canonical-target compatibility.
- Advanced-to-Builder hydration writes both canonical runtime target and manual Builder metadata.
- The synchronizer mirrors Builder metadata into canonical runtime target data and resets both fields when owner/capability selection changes.
- Action binding paths resolve to `config.formData.target.objectId` or `config.formData.target.objectIds`; the metadata object is never a dynamic runtime path.
- The control recognizes legacy canonical targets and displays them as manual bindings.
- MANY JSON array expressions are preserved as arrays at the canonical target seam; dynamic expressions remain expression strings for native evaluation.

## GREEN Evidence

```text
yarn g:jest src/components/formControls/CapabilityTargetBindingControl.test.tsx src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts src/entities/Action/actionProperties.test.ts

Test Suites: 4 passed, 4 total
Tests:       70 passed, 70 total
Snapshots:   0 total
```

`git diff --check` also passed.

## Scope / Concerns

Only the capability control, serializer/hydrator, synchronizer, action path resolver, editor resources, focused tests, and this report were changed. The backend build/Maven suite and manual runtime health check were not run in this task; Task 4's server boundary remains the authoritative validator.

## Round 1 Review Correction

The first review identified two compatibility gaps. The connected control now falls back from the new `targetBinding.data` property to legacy canonical `target.data`, so persisted canonical targets render as manual bindings through the actual editor resource path. Capability synchronizer identity now includes operation, so switching Function to Action (or vice versa) resets target binding, canonical target, parameters, and definition even when owner and capability IDs happen to match.

Round 1 RED evidence:

```text
yarn g:jest src/components/formControls/CapabilityTargetBindingControl.test.tsx src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts

2 failed: connected legacy target rendered an empty expression; same-ID Function-to-Action change dispatched zero resets.
```

Round 1 GREEN evidence:

```text
yarn g:jest src/components/formControls/CapabilityTargetBindingControl.test.tsx src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts

Test Suites: 2 passed, 2 total
Tests:       44 passed, 44 total
```
