# H6 Localization, Diagnostics, and Release Readiness Verification

Date: 2026-08-15
Branch: `feat/ontology-datasource-plugin`

## Gate Decision

`PASSED` for the development baseline. H0-H6 native Ontology Datasource work
is documented and reproducible. T9 publishing and production release behavior
remain explicitly deferred.

## Localization Audit

- The active Ontology Datasource import UI uses `useTranslation` for all
  visible labels, helper text, validation, loading, success, and error copy.
- The corresponding `en-US` resource provides English strings under the
  `ontologyDatasource` namespace.
- No Chinese characters were found in the reviewed active import/API/state
  files or the new native regression tests.
- No new bilingual UI strings were introduced.

## Diagnostic Audit

- Import failures retain structured response traversal through the existing
  native API client.
- User-facing import diagnostics redact `token`, `password`, `secret`,
  `authorization`, and `apiKey` values before display.
- Ontology metadata and runtime failures retain native structured response
  fields for debugger presentation; Worksmith does not expose Provider
  credentials or implement Action Server authorization.

## Complete Verification

### Plugin

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -Dtest=OntologyConfigurationTest,OntologyObjectQueryExecutorTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: `PASS`, exit code `0`.

### Server

```bash
cd app/server
mvn -q -pl appsmith-server \
  -Dtest=OntologyDatasourceControllerTest,OntologyDatasourceServiceTest,OntologyDatasourceUpgradeServiceTest,OntologyMetadataSnapshotRepositoryWiringTest,OntologyProjectImportTest,OntologyProjectYamlImporterTest,OntologySnapshotRuntimeGatewayTest,OntologySnapshotServiceTest,RuntimeProviderCompatibilityValidatorTest,MongoOntologyProjectRegistryTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: `PASS`, exit code `0`; MongoDB connected at `localhost:27017`.

### Client

Result: `PASS`, 12 suites and 34 tests. Covered import UI, autocomplete,
native Widget paths, native action state, and native execution helpers.
Existing React `act`, Dropdown DOM-property, and Browserslist age warnings are
non-blocking and pre-existing test-harness/tooling warnings.

### Browser

- Playwright: `1 passed` in 12.2 seconds; Demo Datasource import and
  persistence path passed.
- Cypress: `1 passing` in 1 minute 34 seconds; native Table binding caused no
  duplicate execution and one explicit Run caused exactly one execution.
- Runtime health after the gate: nginx HTTP `200`, backend HTTP `200`.

## T9 Boundary

`docs/superpowers/plans/2026-08-15-t9-application-release-plan.md` records the
deferred release project. H0-H6 do not implement production ACL, production
Provider rollout, Action Server authorization/audit storage, automatic version
switching, publishing, or deployment runtime behavior.

## Files

- `.superpowers/sdd/2026-08-15-native-ontology-next-phase/h6-release-brief.md`
- `docs/superpowers/plans/2026-08-15-t9-application-release-plan.md`
