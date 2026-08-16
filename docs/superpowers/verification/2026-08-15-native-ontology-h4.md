# H4 Native Action and Link Verification

Date: 2026-08-15
Branch: `feat/ontology-datasource-plugin`

## Gate Decision

`PASSED` for the current synchronous Action Server contract. No production
Action, Link, Provider, or client execution code was changed in H4.

The native plugin path verifies:

- Function and Link stable-ID validation before Provider calls;
- source-type validation for Link queries;
- successful empty Link results;
- readable Link Provider failures;
- pinned workspace/project/version/snapshot/digest/provider context;
- generated idempotency key and protected-context override rejection;
- Action Server success with retained audit ID;
- domain, malformed-response, and transport failure mapping.

## Focused Verification

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -Dtest=OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: `PASS`, exit code `0`. Maven emitted only existing Lombok Unsafe,
multiple SLF4J provider, and Log4j configuration warnings.

The test class covers the current native result contract without creating a
second Action/Link execution path.

## Deferred External Protocol

`OntologyActionServerClient` currently models a synchronous `Result(body,
auditId)` response. Async acknowledgement, progress, timeout, retry, and
idempotency replay semantics remain an Action Server team contract prerequisite.
This phase deliberately does not guess those fields or implement business
execution in Worksmith. When the protocol is frozen, it can be mapped through
the same native Action result/error path.

## Files

- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`
- `.superpowers/sdd/2026-08-15-native-ontology-next-phase/h4-action-link-brief.md`
