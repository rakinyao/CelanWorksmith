# Demo Action Server Registration Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any workspace that imports the Demo 1.2.0 Action Release resolve the single deployment-level Demo Action Server through the Release-declared adapter identity, without a workspace-specific endpoint entry.

**Architecture:** The Action element declares an immutable `implementation` with `adapter_id` and `adapter_version`; it never includes an endpoint, credential, or workspace identity. Release parsing and mapping carry that declaration to `ActionTypeDTO`. The Plugin resolves an Action Server with `(workspaceId, adapterId, adapterVersion)`, while the local resolver maps the adapter tuple to one configured endpoint. The workspace argument remains available for a future external registration service but the Demo resolver deliberately does not require a preconfigured workspace row. The independent Demo Action Server accepts requests from arbitrary locally imported workspaces for its explicitly supported Demo Release version; request identity remains present in audit records.

**Tech Stack:** Java 25, Maven reactor, Spring Boot/WebFlux, Reactor, JUnit 5, Mockito, AssertJ, PF4J Ontology plugin.

## Global Constraints

- This is `DEMO_HANDLER`-era routing only; no external registration API, credentials, or remote side effects are introduced.
- A Release declares only `adapter_id` and strict-SemVer `adapter_version`; it never declares Action Server URLs or workspace IDs.
- The deployment configuration maps one adapter tuple to an HTTP endpoint and timeout.
- Preserve the native `ACTION_QUERY -> Plugin -> OntologyActionServerClient` execution path.
- Do not modify business runtime data or create a parallel Action execution path.
- Recalculate and assert the canonical Release digest after fixture metadata changes.
- Work directly on the current branch as explicitly authorized by the user.

---

### Task 1: Carry Release Action Adapter Metadata

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelRelease.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseParser.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapper.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/ActionTypeDTO.java`
- Modify: `docs/superpowers/fixtures/ontology-model-release-demo-actions-1.2.0.json`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/release/OntologyModelReleaseParserTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapperTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/LocalReleaseJsonOntologyProjectImporterTest.java`

**Interfaces:**
- Produces `OntologyModelRelease.Action(..., ActionImplementation implementation, ...)`, where `ActionImplementation` has `adapterId()` and `adapterVersion()`.
- Produces `ActionTypeDTO(..., String adapterId, String adapterVersion)`.
- The 1.2.0 fixture Action `ApplyContractChange` declares `{"adapter_id":"demo-action-server","adapter_version":"1.0.0"}` under `spec.implementation`.

- [ ] **Step 1: Write failing parser and mapper tests**

Assert parsing and mapping expose `demo-action-server` and `1.0.0`. Clone the fixture document, remove `spec.implementation`, recompute no digest, and assert parsing fails with `Release Action implementation is required`. Clone it again with `adapter_version` set to `v1` and assert strict-SemVer validation fails.

- [ ] **Step 2: Run the targeted tests and verify RED**

Run:

```bash
cd app/server
mvn -q -pl appsmith-server -Dtest=OntologyModelReleaseParserTest,OntologyModelReleaseMapperTest,LocalReleaseJsonOntologyProjectImporterTest test
```

Expected: compilation or assertion failures because Action adapter metadata is not represented.

- [ ] **Step 3: Add the strict Action implementation contract**

Add `implementation` to the Action parser allow-list. Require exactly `adapter_id` and `adapter_version`; require a non-blank adapter ID and strict SemVer adapter version. Add immutable model/DTO fields, map them exactly, update the fixture, remove its old `release.release_digest`, calculate the JCS SHA-256 digest, and write the replacement value back.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelRelease.java app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseParser.java app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapper.java app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/ActionTypeDTO.java app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/release/OntologyModelReleaseParserTest.java app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapperTest.java app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/LocalReleaseJsonOntologyProjectImporterTest.java docs/superpowers/fixtures/ontology-model-release-demo-actions-1.2.0.json
git commit -m "feat(ontology): declare action server adapter in release"
```

### Task 2: Resolve Deployment-Level Adapter Endpoints for Every Imported Workspace

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/WorkspaceActionServerConfigurationResolver.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/actionserver/WorkspaceActionServerProperties.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithConfiguration.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Modify: `app/server/appsmith-server/src/main/resources/application-ce.properties`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/actionserver/WorkspaceActionServerPropertiesTest.java`
- Test: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`

**Interfaces:**
- `WorkspaceActionServerConfigurationResolver.resolveRequired(String workspaceId, String adapterId, String adapterVersion)` returns a configured `OntologyActionServerClient` or a safe adapter-specific error.
- Deployment properties use `celanworksmith.action-server.adapters.<adapter-id>.versions.<adapter-version>.url` and `.timeout-millis`.
- Plugin obtains `adapterId` and `adapterVersion` from the validated Action metadata before resolving the client.

- [ ] **Step 1: Write failing resolver and Plugin tests**

Assert an endpoint configured under `adapters.demo-action-server.versions.1.0.0` resolves for both `workspace-a` and `workspace-b`. Assert an unknown adapter/version rejects with `Ontology Action Server adapter is not configured: <adapterId>@<adapterVersion>`. Update the Action Query execution test to prove the resolver receives the Release Action tuple rather than only a workspace ID.

- [ ] **Step 2: Run the targeted tests and verify RED**

Run:

```bash
cd app/server
mvn -q -pl appsmith-server,appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=WorkspaceActionServerPropertiesTest,OntologyFunctionLinkActionExecutorTest test
```

Expected: compile or assertion failures because the resolver is workspace-keyed.

- [ ] **Step 3: Implement tuple-based Demo routing**

Replace the mutable `workspaces` property map with `adapters -> versions -> endpoint`. Keep endpoint validation unchanged. Update the resolver interface and configuration bean so it ignores the workspace for the Demo lookup but accepts it for the future registration boundary. In `OntologyPlugin.executeActionQuery`, obtain the action metadata selected by the validated query and call the new resolver method. Replace the commented sample properties with the adapter/version configuration syntax.

- [ ] **Step 4: Run the targeted tests and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/WorkspaceActionServerConfigurationResolver.java app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/actionserver/WorkspaceActionServerProperties.java app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithConfiguration.java app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java app/server/appsmith-server/src/main/resources/application-ce.properties app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/actionserver/WorkspaceActionServerPropertiesTest.java app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java
git commit -m "feat(ontology): route actions by release adapter"
```

### Task 3: Allow the Demo Action Server to Serve Imported Workspaces

**Files:**
- Modify: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/config/DemoActionServerRequestProperties.java`
- Modify: `app/server/demo-action-server/src/main/resources/application.properties`
- Test: `app/server/demo-action-server/src/test/java/com/celanworksmith/demoactionserver/config/DemoActionServerRequestPropertiesTest.java`

**Interfaces:**
- `DemoActionServerRequestProperties.supports(ExecuteRequest request)` accepts `ApplyContractChange` only for Release `1.2.0`, while treating workspace ID, datasource ID, and metadata snapshot ID as request/audit identity rather than a single-server static allow-list.
- The server does not accept another action ID or a different project version.

- [ ] **Step 1: Write failing request-admission tests**

Construct two otherwise valid `ApplyContractChange` requests with distinct workspace, datasource, and metadata snapshot IDs. Assert both are supported. Assert a request with `1.1.0` is rejected and a request using an unregistered action ID is rejected.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd app/server
mvn -q -pl demo-action-server -am -Dtest=DemoActionServerRequestPropertiesTest test
```

Expected: the second workspace request is rejected by the fixed workspace pin.

- [ ] **Step 3: Restrict admission by Demo capability, not workspace identity**

Remove the configured workspace/project/datasource/snapshot pin fields and their application properties. Preserve strict `ApplyContractChange` and `1.2.0` checks. Reject blank request identity fields through the existing protocol boundary rather than by a server-specific workspace allow-list. Update the class documentation to identify this as a development-only compatibility gate.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/config/DemoActionServerRequestProperties.java app/server/demo-action-server/src/main/resources/application.properties app/server/demo-action-server/src/test/java/com/celanworksmith/demoactionserver/config/DemoActionServerRequestPropertiesTest.java
git commit -m "feat(demo): accept registered release workspaces"
```

### Task 4: Verify Import-to-Action Execution Across a New Workspace

**Files:**
- Modify: `docs/superpowers/verification/2026-09-14-demo-contract-change-action.md`
- Test: existing focused suites from Tasks 1-3

**Interfaces:**
- A newly created workspace that imports the unchanged logical 1.2.0 Demo Release resolves `demo-action-server@1.0.0` without editing backend workspace configuration.

- [ ] **Step 1: Run all focused automated verification**

```bash
cd app/server
mvn -q -pl appsmith-server,appsmith-plugins/celanworksmithOntologyPlugin,demo-action-server -am -Dtest=OntologyModelReleaseParserTest,OntologyModelReleaseMapperTest,LocalReleaseJsonOntologyProjectImporterTest,WorkspaceActionServerPropertiesTest,OntologyFunctionLinkActionExecutorTest,DemoActionServerRequestPropertiesTest test
mvn -q -pl appsmith-server,appsmith-plugins/celanworksmithOntologyPlugin,demo-action-server -am spotless:check
git diff --check
```

Expected: all commands succeed.

- [ ] **Step 2: Record reproducible manual acceptance**

Document: configure `demo-action-server@1.0.0` once through environment-backed deployment properties; start the backend and Demo Action Server; create a new workspace and app; import the 1.2.0 fixture; seed the Demo Runtime data; create and run `ApplyContractChange`; confirm no workspace-specific Action Server property was added, the Action result includes an audit ID, and the refreshed contract shows the mutation.

- [ ] **Step 3: Commit Task 4**

```bash
git add docs/superpowers/verification/2026-09-14-demo-contract-change-action.md
git commit -m "docs(ontology): verify adapter-routed demo action"
```
