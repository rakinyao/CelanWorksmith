# Final Review Fix Report

Status: DONE_WITH_CONCERNS. One consolidated final-review fix wave complete; final re-review and environment acceptance remain pending.

## Implementation

- Manual static page slug availability now projects and checks both draft and published identifiers within the queried application, excluding the current page. Root cause was a draft-only query/projection while native publish preflight already reserved published ownership.
- Manual update conflicts use a page-specific native `AppsmithError` message with the existing HTTP 409 and `UNIQUE_SLUG_UNAVAILABLE` application error code. Guidance says to choose a different slug and, conditionally when another page still publishes the address, publish its new slug or removal first, then assign the released address. Draft-only conflicts do not unconditionally require publishing.
- Existing publish preflight remains conservative. A cross-page transfer in one publication could conflict with the existing published unique index because native bulk writes and archiving do not guarantee the necessary order. There are no new indexes, locks, retries, execution paths, or published writes outside native publication.
- `manualSlugTransferRequiresPublishingOriginalPagesMoveFirst` performs A's draft move, confirms A can still use its own published address, checks B's availability and manual update rejection before saving, models a separate native publication releasing A's old address, then confirms B can save that address. The test checks the application-scoped query and requested published projection. Publication release is modeled in controlled test data; this is not a real persistence/publish integration test.
- `nativeCloneReservesDestinationPublishedSlugAndRequestsItsProjection` calls the real `clonePageGivenApplicationId` path across applications. Destination draft `existing` and published `page` produce persisted `page-1`; the requested destination projection must include `publishedPage_uniqueSlug`. Only external persistence and unrelated dependent entity cloning are mocked. The native clone implementation was already correct and required no production edit in this wave.
- `NewPageServiceTest.updatePage_DuplicateChineseName_IsRejected` now creates and asserts both fixture pages successfully before separately asserting that only the rename fails. This test compiled but was not executed in this wave.
- Updated the approved design with staged publication semantics and the plan/spec counts to 30 focused server tests, marking final re-review pending.

## TDD Evidence

All Maven commands ran from `app/server`, using installed Java 25 and Maven.

RED command:

```bash
mvn -q -pl appsmith-server -am -Dtest=StaticUrlServiceImplTest,PageStaticUrlLifecycleTest -Dsurefire.failIfNoSpecifiedTests=false test
```

- Initial run: `/tmp/page-url-final-fix-red.log`, exit 1. The staged-transfer test failed with `Expecting value to be false but was true`. A separate clone fixture assertion initially expected `page-1` but got `copy`, because the supplied ` Copy` suffix was a valid fallback name. This was a fixture mistake, not a product regression; the fixture was corrected to use the actual cross-application clone without a suffix.
- Confirmed RED: `/tmp/page-url-final-fix-red2.log`, exit 1; 23 tests, 1 failure, 0 errors/skips. The only failure was the expected staged-transfer availability assertion. The native clone regression passed against the existing correct implementation.

GREEN and final post-format verification command:

```bash
mvn -q -pl appsmith-server -am -Dtest=PageSlugAllocatorTest,StaticUrlServiceImplTest,PageStaticUrlLifecycleTest,NewPageNameValidationTest -Dsurefire.failIfNoSpecifiedTests=false test
```

- `/tmp/page-url-final-fix-green.log`, exit 0.
- `/tmp/page-url-final-fix-verified.log`, exit 0 after formatting and adding the explicit same-page published-address assertion after its draft moved.
- Surefire reports inspected: allocator 3, static service 18, native lifecycle 5, name validation 4. Total 30 tests; 0 failures, 0 errors, 0 skips.
- Existing ordinary application creation and real feature-flag proxy/CE fallback tests pass as part of these suites.

Formatting:

```bash
mvn -q -pl appsmith-server spotless:apply '-DspotlessFiles=.*(AppsmithError|StaticUrlServiceImpl|StaticUrlServiceImplTest|PageStaticUrlLifecycleTest|NewPageServiceTest)\.java'
mvn -q -pl appsmith-server spotless:check '-DspotlessFiles=.*(AppsmithError|StaticUrlServiceImpl|StaticUrlServiceImplTest|PageStaticUrlLifecycleTest|NewPageServiceTest)\.java'
git diff --check
```

Both Maven formatting commands and the diff check exited 0. Logs: `/tmp/page-url-final-fix-format.log`, `/tmp/page-url-final-fix-format-check.log`. Existing Unsafe, dynamic agent, and SLF4J warnings remain; expected negative tests log rejected operations. Output is not warning-free.

## Files Changed

- `app/server/appsmith-server/src/main/java/com/appsmith/server/exceptions/AppsmithError.java`
- `app/server/appsmith-server/src/main/java/com/appsmith/server/staticurl/StaticUrlServiceImpl.java`
- `app/server/appsmith-server/src/test/java/com/appsmith/server/staticurl/StaticUrlServiceImplTest.java`
- `app/server/appsmith-server/src/test/java/com/appsmith/server/services/ce/PageStaticUrlLifecycleTest.java`
- `app/server/appsmith-server/src/test/java/com/appsmith/server/services/NewPageServiceTest.java`
- `docs/superpowers/specs/2026-09-26-chinese-page-name-url-design.md`
- `docs/superpowers/plans/2026-09-26-chinese-page-name-url-plan.md`
- This report.

## Self-Review and Remaining Limits

- Scoped diff reviewed: application query isolation and current-page exclusion remain, the availability endpoint retains its Boolean response, draft conflicts still reject, and no application-wide generic error text changed. No frontend edits or new localization pipeline were needed.
- The clone regression would fail for either a source-application lookup (which has no reservation in the fixture) or removal of the published projection. It asserts the saved identifier rather than only verifying a mock invocation.
- Full Spring `NewPageServiceTest` / `ApplicationPageServiceTest` were not rerun: the previously established missing Mongo configuration and unavailable Docker/Redis infrastructure remain. In particular, the revised duplicate-Chinese-name integration test was compiled by Maven but its test body was not run. Unit `NewPageNameValidationTest` passed separately; this does not replace database integration coverage.
- No business database access, authentication bypass, application mutation, isolated Mongo restart, push, or merge occurred. Unrelated pre-existing untracked files were preserved.
- Authenticated browser acceptance, real persisted import/publication, deployed index state, complete service concurrency, and non-atomic display-name check/write remain the previously recorded limitations. Final re-review is pending.
