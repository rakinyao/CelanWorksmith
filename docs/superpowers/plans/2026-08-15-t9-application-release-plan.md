# T9 Application Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Extend the native Appsmith publish path with immutable App Release snapshots, deterministic preflight validation, pinned Ontology Provider health gates, and manual activation/rollback in the development environment.

**Architecture:** Add a focused com.celanworksmith.release backend module backed by MongoDB. The module snapshots the App Draft and its native Datasource/Query dependencies, validates Ontology pins through the existing metadata snapshot and Provider compatibility services, and stores a separate active-release pointer. The existing Appsmith Query, JS, Action, Widget, and Datasource execution paths remain the only runtime paths.

**Tech Stack:** Java 21, Spring WebFlux, Reactor, Spring Data Mongo Reactive, Jackson, JUnit 5, AssertJ, React, Redux-Saga, TypeScript, existing Appsmith i18n, Playwright, MongoDB, Redis.

## Global Constraints

- Ontology remains a peer Datasource of DB and API Datasources; an App may bind multiple Datasources.
- Query and JS modes remain supported; no $objects, $functions, $actions, $variables, or Object-aware execution chain may be reintroduced.
- Every Ontology pin contains providerId, metadataSnapshotId, metadataDigest, and providerContractVersion.
- Release content is immutable; activation changes only an active-release pointer.
- Ontology versions are selected manually; Provider failures never trigger automatic fallback or version switching.
- Provider validation reuses RuntimeProviderCompatibilityValidator; release code must not duplicate its mapping rules.
- Action Server work is limited to adapter-reference shape validation; no request/response, async, retry, timeout, progress, authorization, or audit protocol is defined.
- Secret values are never written to snapshots, release manifests, logs, or user-facing diagnostics.
- All new user-facing strings use i18n resources and are English in both the active development UI and test expectations.
- Code changes are strictly serial: brief, implementation, scoped review, fix/re-review, and ledger update before the next dependent task.
- Each implementation task changes no more than four production files and three test files unless the task explicitly lists required constructor/configuration propagation.
- Each implementation task runs only its targeted tests, formatting/lint checks, and git diff --check; cross-task browser verification runs once at the T9 gate.
- No production deployment system, production ACL redesign, or Action Server implementation is included.

## Execution Ledger

Maintain the task ledger at:

~~~
.superpowers/sdd/2026-08-15-t9-application-release/progress.md
~~~

Each task report must contain exactly: status, files changed, targeted test result, and concerns. An implementation agent stops with BLOCKED when it cannot reach targeted testing within approximately 15 minutes and records the located files, attempted checks, blocker, and recommended narrower task.

## Existing Interfaces To Reuse

The implementation must consume these existing interfaces instead of adding parallel equivalents:

- Appsmith publish entry: ApplicationControllerCE.publish(...) and ApplicationPageService.publish(...).
- App and action data: ApplicationService, NewActionRepository, and DatasourceService.
- Ontology metadata: OntologyMetadataSnapshotRepository, OntologySnapshotService, and OntologyRuntimeGateway.
- Provider validation: RuntimeProviderCompatibilityValidator and ProviderValidationResult.
- Mongo configuration: CelanWorksmithMongoProperties and the existing reactive Mongo configuration.
- Current authenticated actor: SessionUserService.getCurrentUser().
- Existing application permission checks: ApplicationPermission and AclPermission.
- Existing client publish flow: ApplicationApi.publishApplication, publishApplicationSaga, and DeployButton.

## Task 1: Define Release Contract Models

**Files:**
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/model/ApplicationReleaseStatus.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/model/ReleaseDiagnostic.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/model/ReleaseDatasourcePin.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/model/ActionServerAdapterReference.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/model/ApplicationReleaseSnapshot.java
- Create: app/server/appsmith-server/src/test/java/com/celanworksmith/release/model/ApplicationReleaseSnapshotTest.java

**Interfaces:**
- ApplicationReleaseStatus values are SNAPSHOT_CREATED, PUBLISHED, SUPERSEDED, and ROLLED_BACK.
- ReleaseDiagnostic exposes Severity { BLOCKING, WARNING, INFO }, stable code, path, safe message, and details.
- ReleaseDatasourcePin exposes datasourceId, pluginId, kind, providerId, metadataSnapshotId, metadataDigest, and providerContractVersion; non-Ontology fields remain nullable and secret-free.
- ActionServerAdapterReference exposes adapterId, adapterVersion, and endpoint; it contains no protocol payload fields.
- ApplicationReleaseSnapshot exposes releaseId, applicationId, workspaceId, baseRevisionId, releaseSchemaVersion, createdBy, createdAt, releaseMessage, contentDigest, applicationContent, datasourcePins, diagnostics, and status.

- [ ] Step 1: Write failing model tests.

~~~
@Test
void copiesCollectionsAndRejectsMutableReleaseState() {
    ApplicationReleaseSnapshot snapshot = fixture();
    assertThatThrownBy(() -> snapshot.datasourcePins().add(null))
        .isInstanceOf(UnsupportedOperationException.class);
    assertThatThrownBy(() -> snapshot.diagnostics().add(null))
        .isInstanceOf(UnsupportedOperationException.class);
    assertThat(snapshot.contentDigest()).startsWith("sha256:");
}

@Test
void onlyAllowsDefinedLifecycleStates() {
    assertThat(ApplicationReleaseStatus.values())
        .containsExactly(SNAPSHOT_CREATED, PUBLISHED, SUPERSEDED, ROLLED_BACK);
}
~~~

- [ ] Step 2: Run the focused test and verify failure.

~~~
cd app/server
mvn -q -pl appsmith-server -Dtest=ApplicationReleaseSnapshotTest -Dsurefire.failIfNoSpecifiedTests=false test
~~~

Expected: compilation failure because the release model does not exist.

- [ ] Step 3: Implement immutable records with defensive copies and blank identity validation.

- [ ] Step 4: Run the focused test and diff check.

~~~
mvn -q -pl appsmith-server -Dtest=ApplicationReleaseSnapshotTest -Dsurefire.failIfNoSpecifiedTests=false test
git diff --check -- app/server/appsmith-server/src/main/java/com/celanworksmith/release app/server/appsmith-server/src/test/java/com/celanworksmith/release
~~~

## Task 2: Persist Immutable Releases and Active Pointer

**Files:**
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleaseRepository.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/MongoApplicationReleaseRepository.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/model/ApplicationReleasePointer.java
- Create: app/server/appsmith-server/src/test/java/com/celanworksmith/release/MongoApplicationReleaseRepositoryTest.java

**Interfaces:**
- save(ApplicationReleaseSnapshot) inserts into celanworksmith_application_releases and never updates an existing release.
- findById(String releaseId), findByApplicationId(String applicationId), and findActive(String applicationId) return immutable records.
- activate(String applicationId, String releaseId, String actor, Instant activatedAt) atomically replaces the pointer in celanworksmith_application_active_releases and returns the previous and new release IDs.
- transitionStatus(String releaseId, ApplicationReleaseStatus status) changes lifecycle status only; application content, pins, diagnostics, and digest remain unchanged.
- ApplicationReleasePointer contains applicationId, activeReleaseId, previousReleaseId, activatedBy, and activatedAt.

- [ ] Step 1: Write tests for insert-only releases, stable listing, pointer replacement, and cross-application activation rejection.
- [ ] Step 2: Run the focused repository test and verify failure.

~~~
cd app/server
mvn -q -pl appsmith-server -Dtest=MongoApplicationReleaseRepositoryTest -Dsurefire.failIfNoSpecifiedTests=false test
~~~

- [ ] Step 3: Implement the two Mongo collections, a unique releaseId index, an applicationId/createdAt index, and a unique active applicationId index. Use ReactiveMongoTemplate.insert for releases and conditional find-and-modify/upsert for the pointer.
- [ ] Step 4: Verify a failed activation leaves release status, digest, and content unchanged.

## Task 3: Build Canonical Snapshot Content and Redact Secrets

**Files:**
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleaseCandidate.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleaseSnapshotBuilder.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ReleaseContentCanonicalizer.java
- Create: app/server/appsmith-server/src/test/java/com/celanworksmith/release/ApplicationReleaseSnapshotBuilderTest.java

**Interfaces:**
- ApplicationReleaseCandidate carries the loaded Application, unpublished List<NewAction>, used List<Datasource>, and baseRevisionId.
- ApplicationReleaseSnapshotBuilder.build(ApplicationReleaseCandidate candidate, List<ReleaseDatasourcePin> datasourcePins, String actor, String message) returns Mono<ApplicationReleaseSnapshot> with status SNAPSHOT_CREATED.
- ReleaseContentCanonicalizer.canonicalize(JsonNode) sorts object keys recursively and preserves array order.
- The builder stores the unpublished App/page/widget/query content required for the release and removes credentials, datasource secret values, transient fields, and runtime-only user data.

- [ ] Step 1: Write tests for key-order-independent digest, binding changes, secret absence, and actor/base-revision provenance.
- [ ] Step 2: Run the focused test and verify failure.

~~~
cd app/server
mvn -q -pl appsmith-server -Dtest=ApplicationReleaseSnapshotBuilderTest -Dsurefire.failIfNoSpecifiedTests=false test
~~~

- [ ] Step 3: Implement canonical content and stable SHA-256 digest. The digest input is one canonical JSON object containing applicationContent and sorted datasourcePins, prefixed with sha256:. Remove keys matching token, password, secret, authorization, and apiKey case-insensitively before persistence.
- [ ] Step 4: Assert that no sensitive key or value appears in serialized snapshot fixtures.

## Task 4: Extract Datasource Pins and Dependencies

**Files:**
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ReleaseDatasourcePinExtractor.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/model/ReleaseDatasourcePinExtractionResult.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ReleaseDependencyScanner.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/model/ReleaseDependency.java
- Modify: app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceService.java
- Modify: app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceUpgradeService.java
- Create: app/server/appsmith-server/src/test/java/com/celanworksmith/release/ReleaseDatasourcePinExtractorTest.java
- Create: app/server/appsmith-server/src/test/java/com/celanworksmith/release/ReleaseDependencyScannerTest.java

**Interfaces:**
- ReleaseDatasourcePinExtractor.extract(ApplicationReleaseCandidate) returns Mono<ReleaseDatasourcePinExtractionResult>; the result contains one pin per Datasource referenced by the App's unpublished actions, sorted by datasourceId, plus stable extraction diagnostics.
- An Ontology pin reads projectId, projectVersion, metadataSnapshotId, metadataDigest, runtimeProviderId, and providerContractVersion from its configuration.
- DB/API pins contain only native plugin identity and datasource ID; their storage credentials are not copied.
- ReleaseDependencyScanner.scan(ApplicationReleaseCandidate, List<ReleaseDatasourcePin>) returns stable references for actions, queries, Datasources, Object Types, properties, Functions, Links, and Actions.
- Unknown or malformed Datasource values become ReleaseDiagnostic values with stable codes and JSON paths; the extractor does not throw raw IllegalArgumentException for user-owned release content.

- [ ] Step 1: Write tests for mixed DB/API/Ontology pins, exact snapshot identity, malformed configuration, native Query references, and a deleted-property reference.
- [ ] Step 2: Run the two focused test classes and verify failure.

~~~
cd app/server
mvn -q -pl appsmith-server -Dtest=ReleaseDatasourcePinExtractorTest,ReleaseDependencyScannerTest -Dsurefire.failIfNoSpecifiedTests=false test
~~~

- [ ] Step 3: Implement extraction from NewActionRepository.findByApplicationId(applicationId, AclPermission.READ_ACTIONS) and each action's unpublished configuration. Do not scan legacy CelanWorksmith state.
- [ ] Step 4: Sort pins and dependencies deterministically and run both focused test classes.

## Task 5: Implement Structural and Ontology Metadata Validation

**Files:**
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleaseValidationService.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/OntologyReleaseValidator.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/model/ReleaseValidationResult.java
- Create: app/server/appsmith-server/src/test/java/com/celanworksmith/release/ApplicationReleaseValidationServiceTest.java
- Create: app/server/appsmith-server/src/test/java/com/celanworksmith/release/OntologyReleaseValidatorTest.java

**Interfaces:**
- ApplicationReleaseValidationService.validate(ApplicationReleaseCandidate) returns Mono<ReleaseValidationResult> containing all diagnostics sorted by severity, code, and path.
- OntologyReleaseValidator.validate(ReleaseDatasourcePin, List<ReleaseDependency>) calls OntologySnapshotService.getRequiredSnapshot(metadataSnapshotId, metadataDigest) and checks each referenced Object, property, Function, Link, and Action.
- Missing plugin, missing Datasource, malformed Query JSON, missing snapshot, digest mismatch, and missing referenced metadata produce BLOCKING diagnostics.
- Deprecated but compatible metadata produces WARNING; informational project/version changes produce INFO.
- Parser and Provider errors are mapped to stable diagnostic codes instead of escaping to the controller.

- [ ] Step 1: Write tests for complete diagnostic collection, valid mixed Datasources, missing snapshot, digest mismatch, missing property, and deterministic sorting.
- [ ] Step 2: Run focused tests and verify failure.

~~~
cd app/server
mvn -q -pl appsmith-server -Dtest=ApplicationReleaseValidationServiceTest,OntologyReleaseValidatorTest -Dsurefire.failIfNoSpecifiedTests=false test
~~~

- [ ] Step 3: Call RuntimeProviderCompatibilityValidator.validate(snapshot, providerId) for Provider mapping errors and convert each error to a BLOCKING diagnostic. Do not duplicate object/property type rules.
- [ ] Step 4: Assert that diagnostics contain no secret-bearing messages and run both focused classes.

## Task 6: Add Provider Health Gate and Action Adapter Shape Validation

**Files:**
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleaseProviderHealthGate.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ActionServerAdapterConfigurationValidator.java
- Modify: app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithConfiguration.java
- Create: app/server/appsmith-server/src/test/java/com/celanworksmith/release/ApplicationReleaseProviderHealthGateTest.java

**Interfaces:**
- ApplicationReleaseProviderHealthGate.check(List<ReleaseDatasourcePin>) returns Mono<List<ReleaseDiagnostic>> and checks only Ontology pins.
- The gate resolves the exact providerId, exact metadataSnapshotId, and exact digest from each pin; a different available snapshot is never accepted.
- ActionServerAdapterConfigurationValidator.validate(ActionServerAdapterReference) checks adapter ID, adapter version, and endpoint syntax only.
- The configuration class exposes the gate and validator as Spring beans without changing OntologyActionServerClient or WorkspaceActionServerConfigurationResolver.

- [ ] Step 1: Write tests for the Mongo-backed Demo Provider, unavailable Provider, digest mismatch, and no Action Server protocol invocation.
- [ ] Step 2: Run the focused test and verify failure.

~~~
cd app/server
mvn -q -pl appsmith-server -Dtest=ApplicationReleaseProviderHealthGateTest -Dsurefire.failIfNoSpecifiedTests=false test
~~~

- [ ] Step 3: Map missing-provider and compatibility exceptions into PROVIDER_UNAVAILABLE and PROVIDER_INCOMPATIBLE diagnostics. Keep the gate read-only.
- [ ] Step 4: Run the focused test and CelanWorksmithConfigurationTest.

## Task 7: Implement Release Service and Server API

**Files:**
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleaseService.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleaseController.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/dto/ReleasePreflightResponse.java
- Create: app/server/appsmith-server/src/test/java/com/celanworksmith/release/ApplicationReleaseControllerTest.java

**Interfaces:**
- preflight(applicationId, actor, message) loads the current Draft, actions, and Datasources, builds a candidate, and returns diagnostics without persistence.
- createSnapshot(applicationId, actor, message) rejects BLOCKING diagnostics and persists a SNAPSHOT_CREATED snapshot.
- list(applicationId), getActive(applicationId), activate(applicationId, releaseId, actor), and rollback(applicationId, targetReleaseId, actor) expose immutable releases and the pointer operations.
- Activation and rollback run the final Provider health gate and preserve newer release records.
- Endpoints are:
  - POST /api/v1/celanworksmith/applications/{applicationId}/releases/preflight
  - POST /api/v1/celanworksmith/applications/{applicationId}/releases
  - GET /api/v1/celanworksmith/applications/{applicationId}/releases
  - GET /api/v1/celanworksmith/applications/{applicationId}/releases/active
  - POST /api/v1/celanworksmith/applications/{applicationId}/releases/{releaseId}/activate
  - POST /api/v1/celanworksmith/applications/{applicationId}/releases/{releaseId}/rollback
- The controller obtains the actor from SessionUserService, rejects cross-application release IDs, and returns ResponseDTO with structured diagnostics.

- [ ] Step 1: Write tests for non-persisting preflight, blocking create rejection, valid immutable create, final health gate, rollback, and cross-application rejection.
- [ ] Step 2: Run the focused controller test and verify failure.

~~~
cd app/server
mvn -q -pl appsmith-server -Dtest=ApplicationReleaseControllerTest -Dsurefire.failIfNoSpecifiedTests=false test
~~~

- [ ] Step 3: Use ApplicationService with existing edit/read permission, NewActionRepository.findByApplicationId, DatasourceService.getAllByWorkspaceIdWithStorages, and SessionUserService. Never accept App content or Datasource configuration from the client.
- [ ] Step 4: Run focused tests, CelanWorksmithConfigurationTest, and git diff --check.

## Task 8: Integrate the Existing Publish Entry Point

**Files:**
- Modify: app/server/appsmith-server/src/main/java/com/appsmith/server/controllers/ApplicationController.java
- Create: app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleasePublishCoordinator.java
- Create: app/server/appsmith-server/src/test/java/com/celanworksmith/release/ApplicationReleasePublishCoordinatorTest.java

**Interfaces:**
- ApplicationReleasePublishCoordinator.publishWithRelease(String applicationId, String actor, Supplier<Mono<ResponseDTO<Boolean>>> nativePublish) performs preflight, snapshot creation, the existing native publish callback, final Provider health gate, and atomic activation.
- A blocking preflight prevents the native publish callback.
- A native publish failure leaves the immutable snapshot unactivated and keeps the prior active release.
- A final health-gate failure keeps the prior active release and returns a structured release error.
- Override the inherited publish route in ApplicationController only to wrap the existing native publish call; preserve the existing permission check and response shape.

- [ ] Step 1: Write tests for blocked preflight, successful activation, native publish failure, final Provider failure, and absence of a second execution path.
- [ ] Step 2: Run the focused coordinator test and verify failure.

~~~
cd app/server
mvn -q -pl appsmith-server -Dtest=ApplicationReleasePublishCoordinatorTest -Dsurefire.failIfNoSpecifiedTests=false test
~~~

- [ ] Step 3: Inject the coordinator into ApplicationController and call super.publish(...) through a Supplier<Mono<ResponseDTO<Boolean>>>. Keep ApplicationControllerCE unchanged unless constructor propagation is required; if required, modify only the CE constructor and concrete constructor in this task.
- [ ] Step 4: Run the coordinator test and the existing publish regression test RefactoringServiceCETest.

## Task 9: Add Client Release API and State

**Files:**
- Create: app/client/src/api/ApplicationReleasesAPI.ts
- Create: app/client/src/actions/applicationReleaseActions.ts
- Create: app/client/src/reducers/uiReducers/applicationReleaseReducer.ts
- Modify: app/client/src/reducers/index.tsx
- Create: app/client/src/actions/applicationReleaseActions.test.ts

**Interfaces:**
- ApplicationReleasesAPI exposes preflight, create, list, getActive, activate, and rollback one-to-one with the server endpoints.
- Redux actions are APPLICATION_RELEASE_PREFLIGHT_INIT, APPLICATION_RELEASE_PREFLIGHT_SUCCESS, APPLICATION_RELEASE_PREFLIGHT_ERROR, APPLICATION_RELEASE_CREATE_INIT, APPLICATION_RELEASE_CREATE_SUCCESS, APPLICATION_RELEASE_CREATE_ERROR, APPLICATION_RELEASE_ACTIVATE_INIT, and APPLICATION_RELEASE_LIST_SUCCESS.
- The reducer stores loading, error, preflight, releases, and activeReleaseId; it does not store a second copy of App, Widget, or Ontology runtime data.
- Structured server severity, code, path, message, and details remain intact.

- [ ] Step 1: Write action/reducer tests for blocking diagnostics, failed activation retaining the old active ID, and successful history replacement.
- [ ] Step 2: Run the focused Jest test and verify failure.

~~~
cd app/client
npx jest src/actions/applicationReleaseActions.test.ts --runInBand
~~~

- [ ] Step 3: Implement typed API methods with the existing Api and ApiResponse conventions, then add the reducer to the existing reducer composition.
- [ ] Step 4: Run the focused Jest test and ESLint on the three changed source files.

## Task 10: Add Release Preflight and History UI

**Files:**
- Create: app/client/src/pages/AppIDE/components/ApplicationReleasePanel/index.tsx
- Create: app/client/src/pages/AppIDE/components/ApplicationReleasePanel/index.test.tsx
- Modify: app/client/src/pages/AppIDE/layouts/components/Header/DeployButton.tsx
- Modify: app/client/src/i18n/resources/en-US.ts
- Modify: app/client/src/i18n/resources/zh-CN.ts

**Interfaces:**
- ApplicationReleasePanel consumes the release reducer and dispatches preflight, create, activate, and rollback actions; it never evaluates Query or Ontology metadata locally.
- The panel displays release status, active release ID, diagnostic severity, resource path, and safe message.
- BLOCKING diagnostics disable create/activate; warnings require explicit acknowledgement; INFO diagnostics do not block.
- Release history shows immutable release IDs, creation time, status, digest prefix, and manual activate/rollback commands.
- DeployButton opens the preflight flow before the existing native publish action.
- All visible labels and messages use i18n keys. Add the same English values to en-US and zh-CN resources.

- [ ] Step 1: Write tests for blocking state, warning acknowledgement, release history, manual rollback, and i18n usage.
- [ ] Step 2: Run the focused Jest test and verify failure.

~~~
cd app/client
npx jest src/pages/AppIDE/components/ApplicationReleasePanel/index.test.tsx --runInBand
~~~

- [ ] Step 3: Implement the compact operational panel with loading, empty, blocking, warning, success, and request-failure states using existing ADS components and icons. Do not duplicate Ontology Explorer or change Table/Query rendering.
- [ ] Step 4: Run the focused Jest test and ESLint on the panel and DeployButton.

## Task 11: Add End-to-End Release Verification

**Files:**
- Create: app/client/playwright/tests/t9/application-release.spec.ts
- Modify: app/client/playwright/d0.config.ts only if the existing config cannot select the T9 project without changing default behavior.
- Create: docs/superpowers/verification/2026-08-15-t9-application-release.md

**Interfaces:**
- Browser verification uses the Demo Ontology Datasource and Mongo-backed runtime Provider.
- The test uses native Datasource/Query UI paths and never references removed legacy bindings.

- [ ] Step 1: Add one browser scenario covering editor open, Demo Ontology Datasource selection, successful preflight, snapshot creation, manual activation, a second release, manual rollback, and a mocked structured activation failure without automatic release change. Use a Playwright route interception for the activate endpoint to return a Provider compatibility diagnostic; do not mutate MongoDB from the browser test.
- [ ] Step 2: Run the focused Playwright test.

~~~
cd app/client
npx playwright test playwright/tests/t9/application-release.spec.ts --config=playwright/d0.config.ts
~~~

Expected: one passing scenario; harness warnings are recorded separately from functional failures.

- [ ] Step 3: Record branch state, server/client commands, browser result, Mongo/Redis prerequisites, active-release behavior, and deferred Action Server protocol in the verification document.

## Task 12: T9 Cross-Task Gate and Checkpoint

**Files:**
- Create: docs/superpowers/verification/2026-08-15-t9-application-release-checkpoint.md
- Modify: .superpowers/sdd/2026-08-15-t9-application-release/progress.md

**Interfaces:** This task adds no runtime behavior. It consolidates Tasks 1-11 evidence and records the final T9 gate decision.

- [ ] Step 1: Run the targeted server suite.

~~~
cd app/server
mvn -q -pl appsmith-server \
  -Dtest=ApplicationReleaseSnapshotTest,MongoApplicationReleaseRepositoryTest,ApplicationReleaseSnapshotBuilderTest,ReleaseDatasourcePinExtractorTest,ReleaseDependencyScannerTest,ApplicationReleaseValidationServiceTest,OntologyReleaseValidatorTest,ApplicationReleaseProviderHealthGateTest,ApplicationReleaseControllerTest,ApplicationReleasePublishCoordinatorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
~~~

- [ ] Step 2: Run the targeted client suites.

~~~
cd app/client
npx jest src/actions/applicationReleaseActions.test.ts src/pages/AppIDE/components/ApplicationReleasePanel/index.test.tsx --runInBand
~~~

- [ ] Step 3: Run browser verification and repository checks.

~~~
npx playwright test playwright/tests/t9/application-release.spec.ts --config=playwright/d0.config.ts
git diff --check
~~~

- [ ] Step 4: Write the checkpoint with PASSED, PARTIAL, or BLOCKED, every command/result, environment versus feature failures, legacy-path audit, and deferred Action Server contract.

## Dependency Order

Execute strictly in this order:

~~~
Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 5 -> Task 6 -> Task 7 -> Task 8 -> Task 9 -> Task 10 -> Task 11 -> Task 12
~~~

Task 4 depends on the candidate model from Task 3. Task 5 depends on pin and dependency extraction. Task 6 depends on validation diagnostics. Task 7 depends on persistence and validation. Task 8 depends on the service API. Tasks 9-10 depend on the server API. Task 11 depends on the complete client and server paths. Task 12 is the only cross-task gate.

## Explicit Non-Goals

- Do not modify or restore removed legacy Ontology loaders, reducers, Object Widget modes, or side-channel execution actions.
- Do not change the Action Server request/response contract.
- Do not add automatic Ontology upgrades, Provider failover, or background release activation.
- Do not add production deployment, production ACL policy, or secret-management replacement.
- Do not change native Table, Form, Search, pagination, or Query rendering behavior in T9; those remain native Widget concerns.
