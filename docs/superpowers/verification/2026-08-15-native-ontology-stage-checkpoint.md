# Native Ontology Datasource Stage Checkpoint

Date: 2026-08-15
Branch: `feat/ontology-datasource-plugin`
Status: development checkpoint, uncommitted by request

## Executive Summary

The project has completed the transition from a side-channel ontology
prototype to a native Appsmith Datasource integration. Ontology is now exposed
as a reusable PF4J Datasource alongside DB and API Datasources. Native Query,
Action, DataTree, evaluation, and Widget paths are used for the active runtime
flow.

The development baseline is suitable for continuing native-path hardening and
usability work. It is not a T9 production/release baseline: the production
ontology platform adapter, production Runtime Provider, Action Server
authorization, datasource ACL policy, and release validation remain outside
the current scope.

## Target Comparison

| Project target | Current result | Evidence or boundary |
| --- | --- | --- |
| Ontology is a first-class Datasource beside DB/API | Achieved in development | PF4J plugin registration, normal Datasource import, native Query execution |
| One reusable Datasource can be used by multiple Apps | Achieved by service contract and tests | Datasource is workspace-scoped; App-specific ontology binding path is retired |
| YAML is an exchange/version format, not the runtime execution store | Achieved in development | Importers normalize to immutable snapshots; runtime uses the pinned snapshot and Provider |
| Runtime data is separate from semantic metadata | Achieved for the Demo Provider | Mongo-backed read-only Provider is resolved by stable `runtimeProviderId` |
| Object, Function, Link, and Action operations use native Query/Action paths | Achieved for the current contract | Plugin validation, Provider gateway, Action Server adapter, and native results are covered |
| Widgets consume ordinary Query results | Achieved for the active path | Widgets bind `{{Query.data}}` or use `{{Query.run()}}`; no active Object mode remains |
| Metadata is pinned and version-controlled | Achieved | Project/version/snapshot/digest/provider identity is persisted and validated |
| Action business execution stays in Action Server | Achieved as an integration boundary | Worksmith validates/maps requests and does not implement business write-back |
| New UI copy is prepared for future localization | Partially achieved | New import/diagnostic copy uses English i18n; complete application internationalization is future work |
| Application publish/release compatibility | Deferred intentionally | T9 was not entered |

## Active Architecture

```text
Ontology Project import (Demo YAML / Local YAML / Platform adapter)
  -> workspace Datasource
  -> immutable metadata snapshot + pinned Runtime Provider
  -> native Appsmith Query / Action
  -> PF4J ontology plugin
  -> Runtime Provider or workspace Action Server
  -> standard Action result / DataTree
  -> native Widget and Query/JS binding
```

The following retired paths are not active production code:

- `$objects`, `$functions`, `$actions`, and `$variables` DataTree roots;
- ontology-specific Object Widget modes;
- ontology-specific Redux/Saga loading and execution chains;
- AppIDE ontology loaders and legacy runtime controllers;
- Widget-private ontology pagination, filtering, or refresh protocols.

## Completed Work

### Native Datasource replacement

- Registered `celanworksmith-ontology-plugin` as a standard PF4J Datasource
  plugin.
- Added normal Datasource import for Demo, Local YAML, and Platform Release
  adapter inputs.
- Persisted immutable project/version/snapshot/digest/provider identity.
- Added Provider compatibility checks, explicit upgrade analysis, rollback,
  uniqueness enforcement, and audit records.
- Kept MongoDB behind the development-only read-only Runtime Provider.

### Native Query and Action path

- Implemented Object, Function, Link, and Action operation validation against
  the pinned snapshot.
- Added metadata-driven native query editor resources.
- Routed Actions through one workspace Action Server boundary.
- Preserved standard Appsmith success/error results and Action Server audit IDs.
- Rejected caller attempts to override trusted pinned context.

### Native Widget compatibility

- Preserved native Table, JSONForm, Button, MenuButton, Text, Chart, Dropdown,
  List, Select, and Form paths.
- Added targeted regressions for ordinary Query data, loading/error behavior,
  and native action execution.
- Did not add an ontology-specific Widget mode.

### Legacy-path cleanup

- Removed the retired ontology loaders, reducers, Sagas, DataTree helpers,
  Object-mode Widgets, and obsolete server routes from active source.
- Moved readable superseded material to the ignored archive area with a
  relocation ledger.
- Removed generated build artifacts where appropriate; source history remains
  available through Git.

## Verification Evidence

The D0-D6 ledger is recorded at
`.superpowers/sdd/2026-08-14-ontology-native-path-d1-d6/progress.md`.

- D0 authenticated Playwright import/persistence gate: 1 test passed.
- D0 authenticated Cypress native Table gate: 1 test passed; zero native
  execute requests after binding stabilization and one request after explicit
  Query Run.
- D1 focused plugin suite: 37 tests passed.
- D2 native Widget regressions and Table family: passed as recorded in the D2
  verification document.
- D3 focused Action Server/plugin suite: 37 tests passed.
- D4 focused server suite: 81 tests across 10 suites passed.
- D5 focused client run: 6 suites and 16 tests passed; non-blocking React
  `act` warnings remain in the harness.
- D6 service checks: backend and nginx returned HTTP 200; active legacy-path
  audit returned no matches.
- `git diff --check`: passed.

The reproducible browser command requires the development service, Xvfb, the
local base URL, and the temporary development test credentials documented in
`docs/superpowers/verification/2026-08-14-ontology-native-path-stabilization.md`.

## Known Boundaries and Risks

1. The external Action Server team has not supplied a final asynchronous
   acknowledgement, progress, timeout, or transport schema. The current
   synchronous adapter is complete for the available contract; async support
   must be added only after that contract is fixed.
2. The production ontology management-platform importer and production Runtime
   Provider are adapter boundaries, not current implementations.
3. Datasource-level ACL, ontology-domain authorization, and Action Server
   authorization are deferred to the authorization iteration.
4. Query editor metadata controls still need usability work: display names,
   field descriptions, property grouping, and clearer binding guidance.
5. Native Table search, pagination, columns, and visual behavior must be
   validated against the final Demo data after further editor changes. Any
   defects must be fixed in the native Query/Widget path, never by restoring a
   side-channel object path.
6. The optimized frontend production build previously exited with code 137 on
   this development host. The development server is healthy, but a release
   build requires a host with sufficient memory.
7. The working tree intentionally contains the uncommitted replacement
   changes. No commit was created.

## Checkpoint Decision

The native Datasource architecture is accepted as the development baseline.
The next work should improve native Query authoring, Widget compatibility,
runtime state handling, and diagnostics. It should not enter T9 or add a second
ontology execution architecture.
