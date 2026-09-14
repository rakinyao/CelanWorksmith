# Capability Widget Target Binding Verification

Date: 2026-09-09 (Asia/Shanghai)

This record contains evidence collected in the current session after the
capability target binding integration. The automated checks covered these
changes:

- Task 1: `5bc33b07c0`
- Task 2: `07f68b3ed5`
- Task 3: `83a5b7f33a`, `d2ca8eafe3`
- Task 4: `f42df695fb`, `1eeac24ded`
- Integration corrections: `f7aebdb128`, `134c5735aa`

## Automated Verification

### Focused Jest

Command:

```text
cd app/client && yarn g:jest src/PluginActionEditor/components/CapabilityTargetBinding/ontologyTargetWidgetAdapters.test.ts src/components/formControls/CapabilityTargetBindingControl.test.tsx src/entities/Action/actionProperties.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts
```

Result: exit code `0`.

```text
Test Suites: 5 passed, 5 total
Tests:       83 passed, 83 total
Snapshots:   0 total
```

### Focused Maven

Command:

```text
cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologyActionConfigurationTest,OntologyQueryValidatorTest,OntologyFunctionLinkActionExecutorTest -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: exit code `0`. Surefire reports from this run:

```text
OntologyActionConfigurationTest       tests="39" errors="0" skipped="0" failures="0"
OntologyQueryValidatorTest           tests="10" errors="0" skipped="0" failures="0"
OntologyFunctionLinkActionExecutorTest tests="37" errors="0" skipped="0" failures="0"
```

### Diff Check

Command:

```text
git diff --check
```

Result: exit code `0`, no output.

### Backend Build

Command:

```text
cd app/server && ./build.sh -DskipTests
```

Result: exit code `0`. The command reported `BUILD SUCCESS`; all 33 reactor
modules reported `SUCCESS`, and the final line was `mvn Successful`.

### Backend Restart And Health

Command:

```text
systemctl --user restart cw-backend && systemctl --user is-active cw-backend && for attempt in $(seq 1 30); do if curl -fsS http://127.0.0.1:8081/api/v1/health; then printf '\nhealth_attempt=%s\n' "$attempt"; exit 0; fi; sleep 2; done; printf 'health_attempts_exhausted\n'; exit 1
```

Result: exit code `0`. The service reported `active`; the health request
succeeded on attempt 9 with:

```json
{"responseMeta":{"status":200,"success":true},"data":"All systems are up","errorDisplay":""}
```

The subsequent `systemctl --user status cw-backend --no-pager -n 20` showed
the service active and Netty listening on port `8081`.

### Release Fixture Inspection

Command:

```text
node -e 'const fs=require("fs"); const r=JSON.parse(fs.readFileSync("docs/superpowers/fixtures/ontology-model-release-demo-functions-1.1.0.json","utf8")); console.log(JSON.stringify({version:r.release.version, functions:(r.elements||[]).filter(x=>x.kind==="function").map(x=>({name:x.name,maxItems:x.spec&&x.spec.target&&x.spec.target.max_items}))}));'
```

Result: exit code `0`.

```json
{"version":"1.1.0","functions":[{"name":"CalculateSupplierRisk","maxItems":1},{"name":"CalculateContractChangeRate","maxItems":1},{"name":"CalculateContractGrossAmount","maxItems":1000},{"name":"CalculateCustomerContractTotal","maxItems":1000}]}
```

## Manual GUI Verification Required

The following scenarios require a human browser session against Release
`1.1.0`. They were not executed in this non-interactive verification session;
the health check and automated suites above do not substitute for these GUI
observations.

1. Import/open Release `1.1.0`, create a Function Query in Builder mode, and
   bind a single Function target from a Table whose canonical-ID column is
   hidden. Confirm the target expression uses the hidden canonical ID and the
   query saves and runs.
2. Bind a single Function target from a Select. Confirm the canonical option
   value is used, not the display label, and the query saves and runs.
3. Select `CalculateContractGrossAmount` and bind Table multi-selection, then
   MultiSelect. Confirm both produce an object-set target and execute with the
   selected IDs.
4. Enter a fixed nonexistent manual ID. Confirm execution returns the native
   target-not-found error rather than an editor or provider lookup error.
5. Open a legacy Query Builder definition and an Advanced JSON definition, then
   round-trip each through Builder and Advanced modes. Confirm target and
   parameters remain semantically equivalent and no `widgetId` is written to
   Advanced JSON.
6. Choose a known incompatible source. Confirm the editor shows a target
   compatibility warning while manual input remains editable and saveable.

## Final Reverification (2026-09-10)

This rerun was performed at `25219c3519` (`Fix malformed Function metadata
handling`). The worktree contained unrelated user changes; no unrelated files
were modified for this record.

### Focused Jest

Command:

```text
cd app/client && yarn g:jest src/PluginActionEditor/components/CapabilityTargetBinding/ontologyTargetWidgetAdapters.test.ts src/components/formControls/CapabilityTargetBindingControl.test.tsx src/entities/Action/actionProperties.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts
```

Result: exit code `0`.

```text
Test Suites: 5 passed, 5 total
Tests:       92 passed, 92 total
Snapshots:   0 total
```

The adapter and control suites include the current dynamic `maxItems` cases.

### Focused Maven

Command:

```text
cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin,appsmith-server -am -Dtest=OntologyActionConfigurationTest,OntologyQueryValidatorTest,OntologyFunctionLinkActionExecutorTest,OntologySnapshotRuntimeGatewayTest,RuntimeProviderDefinitionBindingTest -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: exit code `0`. Surefire reports:

```text
OntologyActionConfigurationTest        tests="40" errors="0" skipped="0" failures="0"
OntologyQueryValidatorTest            tests="10" errors="0" skipped="0" failures="0"
OntologyFunctionLinkActionExecutorTest tests="41" errors="0" skipped="0" failures="0"
OntologySnapshotRuntimeGatewayTest    tests="7"  errors="0" skipped="0" failures="0"
RuntimeProviderDefinitionBindingTest  tests="1"  errors="0" skipped="0" failures="0"
```

### Diff Check

Command:

```text
git diff --check
```

Result: exit code `0`, no output.

### Backend Build

The literal root-relative command `app/server/./build.sh -DskipTests` exited
`1` before Maven because `build.sh` resolves
`scripts/check-field-constants.mjs` relative to its working directory; that
path does not exist from the repository root. The documented invocation was
then run from the server directory:

```text
cd app/server && ./build.sh -DskipTests
```

Result: exit code `0`; all 33 reactor modules reported `SUCCESS`, Maven
reported `BUILD SUCCESS`, and the script ended with `mvn Successful`.

### Backend Restart And Health

Command:

```text
systemctl --user restart cw-backend && systemctl --user is-active cw-backend && for attempt in $(seq 1 30); do if curl -fsS http://127.0.0.1:8081/api/v1/health; then printf '\nhealth_attempt=%s\n' "$attempt"; exit 0; fi; sleep 2; done; printf 'health_attempts_exhausted\n'; exit 1
```

The original rerun identified two local dependency prerequisites: Redis on
`127.0.0.1:6379`, and MongoDB running as a single-node replica set because
the migration client requests replica-set topology. After those local
development services were configured, the following current-session health
command was run:

```text
systemctl --user start cw-backend && for attempt in $(seq 1 36); do response=$(curl -fsS --max-time 3 http://127.0.0.1:8081/api/v1/health) && { printf '%s\\n' "$response"; exit 0; }; sleep 5; done; exit 1
```

Result: exit code `0`, with:

```json
{"responseMeta":{"status":200,"success":true},"data":"All systems are up","errorDisplay":""}
```

The Redis and MongoDB service setup is local environment configuration only;
it is not part of the repository changes for this feature.

### Manual GUI Verification

The six GUI scenarios listed above were not executed. This remains a manual
browser task; the successful health check enables that session, but automated
tests and a successful build do not substitute for those observations.

## Table Query Provenance And Primary-Key Guardrail (2026-09-10)

This provisional extension adds an explicit boundary between a Table's native
configuration and an ontology target source. A Table is offered to a Function
or Action only when its data expression is exactly `{{QueryName.data}}`, the
named current-page Query is an `OBJECT_QUERY`, the Query object type matches
the capability owner, and `ONTOLOGY_OBJECT_PROPERTIES` reports an explicitly
declared Release primary key. `primaryColumnId` is not treated as ontology
identity metadata.

Builder Object Queries add a declared Release primary key to the runtime
projection when it is absent. This does not rewrite Advanced JSON, and the
key's schema name remains a provisional Release-contract seam. The Builder
mode marker is retained by `OntologyActionConfiguration` solely to make that
execution distinction explicit.

Focused verification completed in this session:

```text
cd app/client && yarn g:jest \
  src/sagas/OneClickBindingSaga.test.ts \
  src/PluginActionEditor/components/CapabilityTargetBinding/ontologyTableTargetProvenance.test.ts \
  src/components/formControls/CapabilityTargetBindingControl.test.tsx \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts \
  --maxWorkers=1

5 suites passed, 96 tests passed.

cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=OntologyActionConfigurationTest,OntologyConfigurationTest,OntologyObjectQueryExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test

92 tests passed.
```

The plugin package was rebuilt and copied to `app/server/dist/plugins`; the
locally started backend answered `200` from `/api/v1/health` after restart.

Manual verification still required: create a Builder Object Query whose
visible projection omits its Release primary key, bind it directly to a Table,
then verify the matching Function/Action Target picker offers that Table and
successfully runs from its selected row(s). Confirm that an Advanced Object
Query omitting the primary key remains runnable but is not offered as an
automatic Table source.

## Final Review Corrections (2026-09-10)

Final review found and the follow-up commit `920a139c5a` corrected two Builder
guardrails: an empty or malformed binding now clears the prior canonical target
instead of leaving it executable, and a Table now needs explicit canonical-key
provenance. A known `ownerObjectTypeId` mismatch produces a localized,
non-blocking warning while manual input remains available. The scoped rereview
passed; its record is in the SDD workspace.

### Final Focused Jest

Command:

```text
cd app/client && yarn g:jest src/PluginActionEditor/components/CapabilityTargetBinding/ontologyTargetWidgetAdapters.test.ts src/components/formControls/CapabilityTargetBindingControl.test.tsx src/entities/Action/actionProperties.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts --watch=false
```

Result: exit code `0`.

```text
Test Suites: 5 passed, 5 total
Tests:       98 passed, 98 total
```

### Final Backend Build And Health

`cd app/server && ./build.sh -DskipTests` completed successfully after the
editor-resource update. The backend was then restarted and
`GET http://127.0.0.1:8081/api/v1/health` returned status `200` with
`"data":"All systems are up"`.

### Primary-Key Visibility Regression

The Table form configuration retains available columns even when a column is
not included in the query projection. The one-click binding visibility rule
therefore treats a primary key as selected only when its column has
`isSelected: true`; a Release primary key that is present in metadata but not
selected remains hidden after the Builder runtime injects it.

```text
cd app/client && yarn g:jest \
  src/sagas/OneClickBindingSaga.test.ts \
  src/PluginActionEditor/components/CapabilityTargetBinding/ontologyTableTargetProvenance.test.ts \
  src/components/formControls/CapabilityTargetBindingControl.test.tsx \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts

Test Suites: 5 passed, 5 total
Tests:       97 passed, 97 total
```

An independent scoped re-review found no remaining P1/P2 issue in this rule.

## Function/Action Advanced JSON Formatting (2026-09-11)

Function and Action Builder-to-Advanced drafts now use the same two-space JSON
formatting as Object Query Advanced definitions. The compact serializer remains
available for canonical/runtime-oriented callers; the synchronizer formats the
draft only when entering Advanced or initializing an empty definition. JSON
content is compared semantically to avoid repeated updates caused only by
whitespace differences.

```text
cd app/client && yarn g:jest \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts \
  --watch=false

Test Suites: 2 passed, 2 total
Tests:       61 passed, 61 total
```

Prettier checks for the four changed synchronizer files and `git diff --check`
also passed.

## Function Advanced Builder Envelope Regression (2026-09-14)

The Builder's parameter field can be present as an editor-only view envelope
(`{ "viewType": "component" }`) when a Function has no writable
parameters. It is now normalized to an empty parameter object before an
Advanced draft is created, so that UI metadata never reaches the ontology
runtime. Entering Advanced also rewrites an equivalent compact capability
definition into its two-space formatted draft; semantic equality suppresses
only subsequent no-op updates while already editing Advanced JSON.

```text
cd app/client && yarn g:jest \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts \
  --watch=false

Test Suites: 2 passed, 2 total
Tests:       63 passed, 63 total
```

## Builder Target Binding Round Trip (2026-09-14)

Switching a Function or Action Query from Builder to Advanced now snapshots
the Builder target and its source binding. When the validated Advanced target
is unchanged, switching back restores the original `WIDGET` binding, including
the selected widget, target cardinality, and expression. This retains the
component-selection presentation rather than incorrectly converting it to a
manual expression or ID.

If the Advanced target was changed, the editor deliberately uses the existing
manual fallback. It must not present a stale widget binding whose expression no
longer represents the saved target.

```text
cd app/client && yarn g:jest \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts \
  --watch=false

Test Suites: 2 passed, 2 total
Tests:       65 passed, 65 total
```

Prettier passed for the four changed synchronizer files, and `git diff --check`
completed with no output.

Manual verification: configure a Function or Action target from a Table,
Select, or MultiSelect; switch to Advanced without changing the JSON; then
return to Builder. The original component mode and selected widget should
remain visible. Change `target` in the Advanced JSON and return to Builder to
confirm the mode falls back to manual input instead.

## Advanced Single-Object Target Substitution (2026-09-14)

An Advanced Function or Action definition may contain a canonical Table target
such as `{{Table1.selectedRow["id"]}}`. JSON serialization escapes the inner
quotes before the generic template renderer runs, so this expression must be
substituted structurally on the parsed `target.objectId` leaf. The capability
definition substitutor now performs that substitution before serializing the
definition for execution. Object-set array substitution remains unchanged.

```text
cd app/server && mvn -q \
  -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -am \
  -Dtest=OntologyCapabilityDefinitionSubstitutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test

OntologyCapabilityDefinitionSubstitutorTest
tests="3" errors="0" skipped="0" failures="0"
```

The ontology plugin was rebuilt, copied to `app/server/dist/plugins`, and
`cw-backend` was restarted. Its health endpoint returned HTTP 200 on startup.
