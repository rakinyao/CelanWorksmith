# Task 1 / B0 Report

Date: 2026-08-07
Scope: freeze the Widget compatibility matrix only.

## Completed

- Added the frozen matrix at `docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md`.
- Recorded the required inventory: Table, TableV2, FilterList, ObjectDetail,
  JSONForm, Form, List, Select, Dropdown, MultiSelect, ActionButton, Button,
  Chart, Statbox, Progress, Text, and Input.
- Defined per-Widget Query input, planned Object input, Object Type/Property
  stable-ID mapping, Link/Action support, refresh policy, migration rule, and
  verification owner.
- Defined the exact shared states `loading`, `ready`, `empty`, `error`,
  `permissionDenied`, and `typeMismatch`, including shared-layer and Widget
  rendering ownership.
- Frozen the compatibility rules: legacy missing mode normalizes to `QUERY`,
  newly created ontology-capable Widgets default to `OBJECT`, display names are
  presentation-only, and existing public properties remain compatible.

## Changed Files

- `docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md`
- `.superpowers/sdd/2026-08-07-full-ontology-widget-compatibility-plan/task-1-report.md`

No implementation code was changed. Existing T-Foundation/T8 working-tree
changes were not staged or modified.

## Commands and Output

### Required category review

Command:

```bash
rg -n "Table|FilterList|ObjectDetail|JSONForm|Select|Dropdown|Chart|Statbox|Progress|Text|Input" docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md
```

Output: all required category names matched, including TableV2, Form, List,
MultiSelect, ActionButton, Button, and Input.

### Required whitespace check

Command:

```bash
git diff --check
```

Output: no output; exit code `0`.

Focused equivalent:

```bash
git diff --check -- docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md
```

Output: no output; exit code `0`.

### Markdown format check

Command:

```bash
app/client/node_modules/.bin/prettier --check docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md
```

Output:

```text
Checking formatting...
All matched files use Prettier code style!
```

### Focused matrix assertions

Command:

```bash
for s in loading ready empty error permissionDenied typeMismatch; do
  rg -q "\`$s\`" docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md
done
```

Output: all six states present.

No Jest test was added or run because this task deliberately changes only a
Markdown contract document and no implementation behavior.

## Manual Verification Checkpoints

- Confirmed the matrix has one row for every required Widget category.
- Confirmed every row includes native Query input and planned Object input.
- Confirmed every row includes a migration rule and a verification owner.
- Confirmed Object mappings use stable IDs (`objectTypeId`, Property IDs,
  `linkTypeId`, `actionId`) and explicitly separate display names.
- Confirmed the shared state table assigns all six exact states and the
  per-category table assigns Widget rendering responsibility.
- Confirmed the matrix references the T-Foundation checkpoint and the five
  Widget implementation files named by the brief.
- Confirmed `git status` still contains the pre-existing T-Foundation/T8
  changes and the only Task 1 additions are the matrix and this report.

## Risks / Questions

- FilterList currently has no explicit mode property. The matrix records its
  legacy normalization as `QUERY` while preserving its Object filter contract;
  Task 5 must implement this without breaking the existing structured output.
- The Object defaults and shared normalization described here are contracts for
  later tasks, not claims that all listed Widgets already implement Object
  mode.
- Form, List, selection, visualization, Text, and Input mappings require the
  shared adapter and metadata controls from later tasks; unsupported metadata
  types must remain explicit `typeMismatch` states.
- No browser verification is applicable to this document-only task. The
  existing T-Foundation manual scenarios remain the baseline for later Widget
  implementation gates.
