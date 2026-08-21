# Ontology Builder Definition Mirror Fix

## Root Cause

The Builder-mode canonical `definition` mirror contains the same Table
expressions as the active Builder controls. It was incorrectly registered as
an Action dynamic dependency, so Table state updates could trigger repeated
form evaluation and action saves.

## Change

- Builder mode excludes `formData.definition.data` from reactive paths and
  `run` dependencies, including persisted Actions created before this fix.
- Builder edits remove the stale path from the persisted dynamic binding list.
- Advanced JSON mode retains template evaluation for `definition`.

## Verification

- Frontend focused Jest suites: 7 suites, 64 tests passed.
- Ontology plugin focused Maven tests passed:
  `OntologyConfigurationTest` and `OntologyObjectQueryExecutorTest`.
- The deployed plugin JAR contains the Builder-only hidden condition and
  `cw-backend` health returned HTTP 200 after restart.

## Manual Follow-up

Open an existing Builder query with a bound Table, click Next, and confirm the
rows change with the page number. Add `delayDays > 0`, run once, and confirm
the request count remains stable with no repeated trigger or layout-save calls.
