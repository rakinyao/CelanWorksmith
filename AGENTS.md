# CelanWorksmith Agent Workflow

Use the smallest workflow that provides sufficient engineering confidence.
Skills are process guidance; task scope determines which parts are required.

## Task Routing

- **Questions, explanations, status checks:** answer or inspect directly. Do not create a plan or edit files unless requested.
- **Small documentation, configuration, or localized maintenance:** inspect the relevant files, make the focused change, and run a proportional check. Do not create a design document, implementation plan, or subagent task.
- **Small isolated bug:** reproduce or trace the root cause, add or update a focused regression test when practical, make the smallest fix, and run targeted verification. Use systematic debugging, but do not add full brainstorming/spec/plan ceremony.
- **Normal feature or cross-module bug:** use the applicable design, TDD, focused review, and verification workflows. Add a written spec/plan when the change has meaningful interfaces or sequencing.
- **Architecture changes, multi-phase features, or explicit plan requests:** use the full brainstorming -> design -> plan -> implementation/review workflow.

## Subagents

- Use subagents only when the user requests them, an approved plan has independent tasks, or an isolated review materially improves confidence.
- Do not dispatch a subagent for a one-file or one-fix task that can be completed and verified in the current context.
- Keep implementation tasks short and bounded; never use a subagent as a substitute for understanding the affected code.

## Verification

- Match verification effort to blast radius: focused tests for localized changes, broader suites for shared contracts or cross-module behavior.
- Never claim a fix without evidence, but do not run memory-heavy repository-wide checks for a narrow change without a reason.
- For bugs, root-cause investigation remains mandatory; full design documentation is not.

## Documentation and UI

- Keep user-facing application text in English and route new UI copy through i18n.
- Record a short verification note only when the change affects a checkpoint, migration, architecture contract, or manual test procedure.
- Preserve the native Appsmith datasource/query/action pipeline; do not introduce parallel ontology state or execution paths.
