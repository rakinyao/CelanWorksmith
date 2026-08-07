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

Output: the original broad search matched all required names. The reviewer fix
also added the following per-category assertions, each returning `present`:

```text
Table: present
TableV2: present
FilterList: present
ObjectDetail: present
JSONForm: present
Form: present
List: present
Select: present
Dropdown: present
MultiSelect: present
ActionButton: present
Button: present
Chart: present
Statbox: present
Progress: present
Text: present
Input: present
```

Per-category assertion command:

```bash
for w in Table TableV2 FilterList ObjectDetail JSONForm Form List Select Dropdown MultiSelect ActionButton Button Chart Statbox Progress Text Input; do
  if rg -q "\|[[:space:]]*$w[[:space:]]*\|" docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md; then
    printf '%s: present\n' "$w"
  else
    printf '%s: missing\n' "$w"
    exit 1
  fi
done
```

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
- Confirmed in this Agent session that `git status --short` shows the existing
  T-Foundation/T8 implementation changes plus the two Task 1 documents; no
  unrelated path was staged for the follow-up commit.

## Risks / Questions

- FilterList now explicitly uses `dataMode`: new ontology-capable instances
  default to `OBJECT`; old DSL without the field normalizes to `QUERY` and
  preserves its legacy structured filter output without issuing an Object
  Query. Task 5 must implement this without breaking that output.
- The Object defaults and shared normalization described here are contracts for
  later tasks, not claims that all listed Widgets already implement Object
  mode.
- Form, List, selection, visualization, Text, and Input mappings require the
  shared adapter and metadata controls from later tasks; unsupported metadata
  types must remain explicit `typeMismatch` states.
- No browser verification is applicable to this document-only task. The
  existing T-Foundation manual scenarios remain the baseline for later Widget
  implementation gates.

## Reviewer Fix Follow-up

- Added a `Mode field / default` column to every inventory row. Each row now
  names its explicit mode field, old-DSL normalized value, and new-instance
  default.
- Defined FilterList as Object-capable with new-instance `OBJECT` default,
  legacy missing-field `QUERY` normalization, and a canonical internal Object
  binding.
- Added inherited state group contracts plus one owner, all six exact states,
  and a focused verification case for every listed Widget.
- Replaced the broad-only category evidence with explicit per-category
  assertion results and narrowed the status statement to this Agent session.

Follow-up commands:

```bash
rg -n "Mode field / default|FilterList Mode Semantics|Per-Widget Render Owner and Verification" docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md
git diff --check
app/client/node_modules/.bin/prettier --check \
  docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md \
  .superpowers/sdd/2026-08-07-full-ontology-widget-compatibility-plan/task-1-report.md
```

Recorded result: all three anchors matched, `git diff --check` returned no
output with exit code `0`, and Prettier reported `All matched files use
Prettier code style!`.
