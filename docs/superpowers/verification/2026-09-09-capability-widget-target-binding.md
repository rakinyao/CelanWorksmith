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
