# Task 13 Legacy Path Inventory

**Date:** 2026-08-14
**Scope:** Read-only inventory for Task 13 preparation
**Repository:** `/home/gavin/workspace/projects/CelanWorksmith`
**Constraint:** No code, service, build, or artifact changes were performed for this inventory.
## Classification

- **remove:** Active ontology-specific runtime path that duplicates the native Datasource/Query/DataTree path. Remove only after the native end-to-end gate is accepted.
- **retain-native:** Required by the standard Appsmith Datasource, Action, Query, plugin, or shared DataTree infrastructure. Do not remove because it contains ontology-specific names.
- **archive-readable:** Historical/experimental implementation, verification material, generated deployment output, or readable test material that should not participate in the active runtime path. Move or clean according to the removal ledger; do not delete source history.

## DataTree

| Path | Decision | Reason / native reference |
|---|---|---|
| `app/client/src/entities/DataTree/dataTreeCelanworksmith.ts` | remove | Creates the `$objects` DataTree root and ontology-specific entity definitions. Native queries already enter the ordinary Action/DataTree result path. |
| `app/client/src/entities/DataTree/dataTreeCelanworksmithVariables.ts` | remove | Builds object-set variables from the legacy object state and `$objects` model. |
| `app/client/src/entities/DataTree/dataTreeCelanworksmithExecution.ts` | remove | Legacy ontology execution projection; native Action execution owns result projection. |
| `app/client/src/entities/DataTree/dataTreeCelanworksmith.test.ts` | archive-readable | Tests the legacy `$objects` projection; retain as migration/reference evidence, not active coverage. |
| `app/client/src/entities/DataTree/dataTreeCelanworksmithVariables.test.ts` | archive-readable | Tests legacy object variables. |
| `app/client/src/entities/DataTree/dataTreeCelanworksmithExecution.test.ts` | archive-readable | Tests legacy execution projection. |
| `app/client/src/ce/entities/DataTree/types.ts` | retain-native | Shared DataTree type contract used by ordinary Query/Action evaluation; inspect only for ontology-only extensions. |
| `app/client/src/ce/utils/autocomplete/entityDefGeneratorMap.ts` | retain-native | Shared autocomplete generator; remove only ontology-specific registration, not the native map. |

## AppIDE Loaders

| Path | Decision | Reason |
|---|---|---|
| `app/client/src/pages/AppIDE/components/CelanworksmithOntologyLoader.tsx` | remove | AppIDE-root loader for the old ontology metadata/object DataTree path. Native plugin metadata is loaded through Datasource/Query infrastructure. |
| `app/client/src/pages/AppIDE/components/CelanworksmithOntologyLoader.test.tsx` | archive-readable | Legacy loader tests. |
| `app/client/src/pages/AppIDE/AppIDE.tsx` | retain-native | Shared editor root. Remove only imports/effects/registration for `Celanworksmith*Loader`; keep normal AppIDE initialization. |
| `app/client/src/pages/AppIDE/components/OntologyExplorer/index.tsx` | retain-native, then narrow | Explorer/binding UI remains useful for project discovery and is not itself a native query executor. Remove runtime object-loading side effects; retain only if it is converted to navigation/import metadata. |
| `app/client/src/pages/AppIDE/layouts/components/Explorer.tsx` | retain-native | Shared Explorer layout; remove only legacy Ontology Explorer registration if no longer required. |
| `app/client/src/sagas/CelanworksmithOntologySaga.ts` | remove | Legacy AppIDE ontology metadata loading saga. |
| `app/client/src/sagas/CelanworksmithLoadRetrySaga.ts` | remove ontology branches | Shared retry infrastructure may remain, but `$objects`/ontology-loader retry targets must be removed. |

## Redux / Reducers / Sagas / Actions / Selectors

| Path | Decision | Reason |
|---|---|---|
| `app/client/src/reducers/celanworksmithObjectsReducer.ts` | remove | Dedicated legacy object cache and `$objects` state. |
| `app/client/src/reducers/celanworksmithObjectQueryReducer.ts` | remove | Dedicated ontology object-query cache duplicates native Query Action state. |
| `app/client/src/reducers/celanworksmithOntologyReducer.ts` | remove ontology state | Legacy metadata/load state; native datasource metadata is authoritative. |
| `app/client/src/actions/celanworksmithObjectActions.ts` | remove | Legacy object load/refresh actions. |
| `app/client/src/actions/celanworksmithObjectQueryActions.ts` | remove | Legacy object query actions. |
| `app/client/src/actions/celanworksmithOntologyActions.ts` | remove ontology load actions | Retain no AppIDE-side ontology fetch actions after native datasource integration. |
| `app/client/src/sagas/CelanworksmithObjectsSaga.ts` | remove | Fetches runtime objects directly for `$objects`. |
| `app/client/src/sagas/CelanworksmithObjectQuerySaga.ts` | remove | Fetches object queries outside native Query execution. |
| `app/client/src/sagas/CelanworksmithExecutionSaga.ts` | remove ontology branches | Shared execution saga remains; remove legacy object/function/action dispatch branches only. |
| `app/client/src/sagas/CelanworksmithLinksSaga.ts` | remove | Legacy link query path. Native `LINK_QUERY` is provided by the ontology plugin. |
| `app/client/src/sagas/CelanworksmithExecutionSaga.ts` and `app/client/src/reducers/celanworksmithExecutionReducer.ts` | retain-native with narrowing | Shared execution contracts may be reused, but ontology-specific side-channel state and refresh logic must be removed. |
| `app/client/src/selectors/celanworksmithSelectors.ts` | remove legacy selectors | Selectors for `$objects`, `$functions`, `$actions`, variables, and legacy ontology load state are obsolete. |
| `app/client/src/selectors/dataTreeSelectors.ts` | retain-native with narrowing | Shared DataTree selectors remain native; remove selectors whose only consumer is the legacy object state. |
| `app/client/src/utils/autocomplete/celanworksmithObjectDefinitions.ts` | remove | Generates legacy `$objects` autocomplete definitions. |
| `app/client/src/utils/celanworksmithObjectBindings.ts` | remove | Normalizes legacy widget object bindings. |
| `app/client/src/celanworksmith/**` | archive-readable, except shared contracts | Legacy object binding, variable loading, action validation, and load-state helpers are historical. Keep only types/utilities demonstrably consumed by native plugin/query paths. |

**Redux registration cross-reference:** `app/client/src/ce/reducers/index.tsx` and `app/client/src/ce/sagas/index.tsx` are **retain-native** shared registries. They still reference legacy ontology reducers/sagas and are Task 13 edit points, not removal targets themselves.

## Object-Mode Widgets

| Path / group | Decision | Reason |
|---|---|---|
| `app/client/src/widgets/TableWidget/widget/objectBinding.test.ts` | archive-readable | Explicit legacy Table Object-mode behavior. |
| `app/client/src/widgets/ObjectDetailWidget/**` | remove | Dedicated ontology Object widget and its property/runtime binding path. |
| `app/client/src/widgets/ActionButtonWidget/**` | remove ontology mode | Native Button + Action Query replaces ontology-specific ActionButton behavior; preserve unrelated shared Button behavior. |
| `app/client/src/widgets/FilterListWidget/**` | remove ontology mode | Legacy object/filter side channel; native Query parameters/filtering are authoritative. |
| `app/client/src/widgets/JSONFormWidget/component/ObjectFormMode.tsx` | remove | Dedicated ontology Object form mode. |
| `app/client/src/widgets/FormWidget/widget/objectBinding.test.tsx` | archive-readable | Legacy object form coverage. |
| `app/client/src/widgets/InputWidget/widget/index.tsx` and `ProgressWidget/widget/index.tsx` | retain-native with narrowing | Remove only ontology-specific Object-mode properties/imports; retain ordinary widget behavior. |
| `app/client/src/widgets/TableWidget/widget/index.tsx` and `TableWidgetV2/**` | retain-native with narrowing | Keep native table/query rendering and columns/search/pagination; remove Object-mode property controls and direct object loaders. |
| `app/client/src/components/propertyControls/celanworksmith*` | remove | Object metadata retry, Object Type, Object Data, filter/action controls are legacy widget controls. |

## Ontology Explorer / Binding UI

| Path | Decision | Reason |
|---|---|---|
| `app/client/src/pages/AppIDE/components/OntologyExplorer/**` | retain-native, narrow | Keep project discovery/binding only if it delegates to the normal Datasource import/selection flow. Remove direct object/function/action DataTree loading. |
| `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.tsx` | retain-native | Current native Datasource import UI. It creates an ordinary datasource and must remain the preferred import route. |
| `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx` | retain-native | Native import coverage. The observed Demo import failure is a Task 13 follow-up defect. |
| `app/client/src/api/OntologyDatasourceApi.ts` | retain-native | Native datasource import API client. |
| `app/client/src/pages/Editor/IntegrationEditor/CreateNewDatasourceTab.tsx` | retain-native | Shared datasource creation surface; ontology entry must remain integrated here. |

## API / Server Legacy Routes

| Path / group | Decision | Reason |
|---|---|---|
| `app/client/src/api/CelanworksmithAPI.ts` object/link/function/action methods | remove | Direct legacy runtime endpoints used by `$objects` and side-channel execution. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/controller/RuntimeController.java` legacy object/function/link/action endpoints | archive-readable initially, then remove | Old runtime API is not the native plugin query route. Keep temporarily for evidence/rollback until native gate and browser verification are closed. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/controller/OntologyController.java` | archive-readable / narrow | Old Ontology Explorer metadata/binding API. Retain only endpoints still needed by native datasource import compatibility; remove direct widget/runtime endpoints. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/controller/OntologyProjectController.java` | retain-native | Project listing/import metadata may support datasource import and version pinning. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceController.java` | retain-native | Native datasource lifecycle/import endpoint. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/**` | retain-native | Snapshot, provider validation, import, upgrade, and datasource lifecycle support the plugin path. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/adapter/**` and `runtime/adapter/**` | retain-native | Provider boundary and Mongo development runtime implementation used by the plugin. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/**` | retain-native | Standard PF4J Datasource plugin, query forms, validators, and executors. |

## Tests

| Group | Decision | Reason |
|---|---|---|
| `app/client/src/sagas/__tests__/Celanworksmith*` object/ontology saga tests | archive-readable | Cover paths scheduled for removal. |
| `app/client/src/reducers/celanworksmith*` object/ontology reducer tests | archive-readable | Preserve behavior evidence while deleting active reducers. |
| `app/client/src/celanworksmith/**` tests and object-binding tests | archive-readable | Legacy object-mode contract evidence. |
| `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx` | retain-native | Native import test; currently the Demo import failure is an open defect. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/**` | retain-native | Plugin configuration/executor contract tests. |
| `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/**` | retain-native | Native datasource lifecycle/provider/snapshot tests. |
| `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/OntologyControllerBindingTest.java` and legacy runtime controller tests | archive-readable / narrow | Keep only tests for endpoints retained by the native import path. |

## Generated Artifacts

| Path / group | Decision | Reason |
|---|---|---|
| `app/client/build/` | archive-readable / regenerate | Generated frontend deployment output; never source authority. |
| `app/server/dist/` | archive-readable / regenerate | Generated server/plugin deployment output; never source authority. |
| `app/client/build.pre-native-20260814-1130/` | archive-readable | Rollback artifact. |
| `app/server/dist.pre-native-20260814-1130/` | archive-readable | Rollback artifact. |
| `app/server/dist.pre-constructor-fix-20260814-1142/` | archive-readable | Pre-fix rollback artifact. |
| `app/client/**/node_modules`, `app/server/**/target` | archive-readable / cleanable | Generated dependencies/build products; do not inspect as source. |
| `scripts/celanworksmith/ontology-projects/celanworksmith-demo-1.0.0.zip` | retain-native fixture | Demo project import fixture, not a compiled artifact. |

## Native Datasource Cross-References

The following active files must not be removed because the native Datasource path still uses or is expected to use them:

1. `app/client/src/pages/Editor/IntegrationEditor/CreateNewDatasourceTab.tsx` imports and renders `OntologyDatasourceImport`.
2. `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.tsx` calls `OntologyDatasourceApi` and native datasource refresh/create actions.
3. `app/client/src/api/OntologyDatasourceApi.ts` calls the server datasource import/list/summary endpoints.
4. `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceController.java` delegates to `OntologyDatasourceService`.
5. `OntologyDatasourceService`, `OntologySnapshotService`, `RuntimeProviderRegistry`, `RuntimeProviderCompatibilityValidator`, and `OntologySnapshotRuntimeGateway` supply the plugin's pinned metadata/provider path.
6. `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/**` is loaded by PF4J and executes ordinary Appsmith Datasource Actions.
7. `app/client/src/ce/reducers/index.tsx`, `app/client/src/ce/sagas/index.tsx`, and ordinary Appsmith Action/DataTree selectors remain shared native registries; only their legacy ontology registrations should be removed.
8. `app/server/appsmith-server/src/main/java/com/appsmith/server/migrations/db/ce/Migration076AddOntologyDatasourcePlugin.java` and its test are native plugin registration/migration support.

## Open Findings For Task 13+

- **Demo import failure:** Datasource-management import of Demo fails while the older Ontology page import succeeds. This is a native import defect, not evidence that the legacy path should be retained. Trace and fix the Datasource import request/response contract before removing the old import UI.
- **Repeated Table refresh:** Native Object Query data renders, but the Table refreshes repeatedly. Inspect query execution identity, reducer/result equality, and DataTree evaluation dependencies. Do not restore the old `$objects` loader as a workaround.
- **Task 12 gate:** The available verification record is not equivalent to a successful current browser gate because the user observed the two defects above. Legacy removal should therefore be staged: classify now, remove only after native import and stable result identity are fixed.
- **Current worktree:** There are uncommitted source changes and rollback directories. This inventory does not alter or normalize them.

## Recommended Removal Order

1. Remove active AppIDE/DataTree loader registration and ontology-specific Redux registration after native import is fixed.
2. Remove object-mode widget controls and direct object APIs while preserving native Table/Form/Action behavior.
3. Remove legacy client sagas/actions/selectors and then server runtime routes with focused tests.
4. Move readable legacy tests/docs to `docs/superpowers/archive/ontology-widget-mode-2026-08-13/` and write the removal ledger.
5. Regenerate deployment artifacts from source; do not use old build/dist directories as source.
