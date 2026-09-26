# Task 3 Report

Status: DONE_WITH_CONCERNS (focused service verification complete; full environment acceptance unavailable).

## Implementation

- Native page creation now invokes `preparePageForCreate` before `createDefault`; enabled static settings allocate valid identifiers, including `page` fallbacks for Chinese names. Ordinary application settings and ordinary slugs are unchanged.
- Both new lifecycle methods are feature flagged and have matching CE-compatible no-op implementations. A real AspectJ proxy test covers the disabled feature flag, including reflection to the compatible superclass.
- Clone allocation fills missing identifiers, reserves draft and published identifiers, and queries the destination application's pages. Its projection now includes the published identifier.
- Import reserves existing application-scoped draft/published identifiers and every available identifier in the incoming batch before allocating missing/colliding values. Matching Git sync IDs retain their existing stable identifier, including recovery from their own published version. Pages from other application IDs, including other branches, do not consume identifiers.
- Publish preflight runs in the cached application pipeline before native publish writes. It rejects duplicate published ownership and conflicting draft ownership with the slug and page IDs in the diagnostic, rejects malformed missing drafts, and repairs only missing/invalid draft identifiers. A valid own published identifier is reused. Existing valid draft identifiers stay unchanged. Publication remains the native application/page/action/collection/theme workflow.
- Rename implementation needed no change: a focused native `updatePage` regression confirms name updates preserve page ID and static identifier.
- No index, lock, automatic static enablement, pinyin conversion, repair script, parallel state store, or business application mutation was introduced. No automatic retry on duplicate-key races was introduced.

## TDD Evidence

All commands ran in `app/server` using installed Maven and Java 25. No Maven Wrapper exists in this checkout.

1. RED: `mvn -q -pl appsmith-server -am -Dtest=StaticUrlServiceImplTest -Dsurefire.failIfNoSpecifiedTests=false test` produced 8 tests / 2 assertion failures: missing Chinese clone identifier expected `page-1`, actual null; import batch expected `page-2`, actual null.
2. New lifecycle tests initially could not compile because the new methods did not exist. After adding their necessary CE-compatible no-op signatures, the same command produced 11 tests / 3 assertion failures: create identifier null, repair persisted no draft, and duplicate published ownership did not throw. Log: `/tmp/task3-red.log`.
3. Native entrypoint RED: `mvn -q -pl appsmith-server -am -Dtest=PageStaticUrlLifecycleTest -Dsurefire.failIfNoSpecifiedTests=false test` produced 3 tests / 2 expected failures after completing the external dependency fixture: native create expected `page`, actual null; native publish conflict expected a throwable, but publishing completed. Log: `/tmp/task3-native-red2.log`. An earlier fixture iteration had an unstubbed persistence publisher; that infrastructure failure is not counted as behavioral RED evidence.
4. Edge RED: `mvn -q -pl appsmith-server -am -Dtest=PageStaticUrlLifecycleTest,StaticUrlServiceImplTest -Dsurefire.failIfNoSpecifiedTests=false test` produced 20 tests / 2 expected failures: Mongo-ID-shaped name did not use fallback and missing draft did not stop repair. Native rename passed unchanged. Log: `/tmp/task3-edge-red.log`.
5. GREEN: `mvn -q -pl appsmith-server -am -Dtest=PageSlugAllocatorTest,PageStaticUrlLifecycleTest,StaticUrlServiceImplTest -Dsurefire.failIfNoSpecifiedTests=false test` exited 0: allocator 3, static lifecycle 17, native lifecycle 4; total 24 tests, zero failures/errors/skips. Includes real feature-flag proxy fallback. Log: `/tmp/task3-final-green.log`.

The native lifecycle fixture captures objects at the persistence boundary, checks the saved Chinese page identifier, and records publication publisher subscriptions. On a published ownership conflict there are no page, action, collection, or application publication subscriptions. Repair fixtures inspect saved draft objects and unchanged published DTOs. Controlled missing mapping: page `a`, draft identifier null, published `published-a`, repaired draft `published-a`. Controlled duplicate mapping: pages `a` and `b`, published `published-a`; rejected before draft writes. These are controlled test objects, not business application records.

Formatting: scoped `spotless:apply` for the six touched Java files. `git diff --check` passes. Existing Unsafe, dynamic Java-agent and multiple SLF4J-provider warnings remain; expected negative tests also log their rejected operations. Output is not warning-free.

Post-format verification repeated the GREEN command and exited 0 with the same 24/24 passing result; log `/tmp/task3-verified.log`.

## Concurrency Evidence

Controller independently inspected Migration074 and reran its index semantics on the isolated Mongo at `mongodb://127.0.0.1:27129`, dbpath `/tmp/celan-page-slug-tests.y0s6A5`; business Mongo 27017 was untouched. Controller-reported reproduction uses the client Node MongoDB driver and disposable `celan_slug_concurrency` collections:

- Index keys: `{applicationId:1, [mode+'.uniqueSlug']:1, ...(edit ? {[mode+'.deletedAt']:1} : {}), deletedAt:1}`.
- Options: `{unique:true, partialFilterExpression:{[mode+'.uniqueSlug']:{$exists:true}}}`.
- `Promise.allSettled` runs two `insertOne({applicationId:'app-a', [mode]:{uniqueSlug:'page'}})` operations, then inserts the same slug for `app-b`.
- Both edit and published modes returned exactly one success, one duplicate-key error 11000, and acceptance for the other application. Exit 0. Original evidence is also in `progress.md`.

This proves application-scoped index behavior in isolation. In-memory reservation does not provide concurrency safety by itself. A concurrent loser can still receive the native duplicate-key error; there is no retry or new locking. Deployed migration state and the complete service race were not verified.

## Files

- `app/server/appsmith-server/src/main/java/com/appsmith/server/services/ce/ApplicationPageServiceCEImpl.java`
- `app/server/appsmith-server/src/main/java/com/appsmith/server/staticurl/StaticUrlServiceCECompatible.java`
- `app/server/appsmith-server/src/main/java/com/appsmith/server/staticurl/StaticUrlServiceCECompatibleImpl.java`
- `app/server/appsmith-server/src/main/java/com/appsmith/server/staticurl/StaticUrlServiceImpl.java`
- `app/server/appsmith-server/src/test/java/com/appsmith/server/services/ce/PageStaticUrlLifecycleTest.java`
- `app/server/appsmith-server/src/test/java/com/appsmith/server/staticurl/StaticUrlServiceImplTest.java`

## Self-review and Remaining Limits

- Fixed invalid generated preferred values and malformed draft preflight during review, with RED/GREEN evidence above. Removed the now-unused allocation wrapper; no unrelated refactoring.
- Existing service files are large; lifecycle changes stay in their existing ownership boundaries. New tests use mocked external persistence, not a Spring application context.
- The requested broader Spring `NewPageServiceTest` / `ApplicationPageServiceTest` command was not rerun in this task: controller already established production-context initialization failure and unavailable Docker/Redis Testcontainers. No business database fallback was attempted. Import persistence and successful end-to-end publication with real infrastructure remain unverified.
- No authenticated browser/static-mode acceptance was possible; a dedicated test application and working feature flag are still required. Duplicate historical address ownership is diagnosed, never automatically assigned. Existing valid static addresses are retained; no historical address migration is claimed.
