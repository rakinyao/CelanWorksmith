# Ontology Plugin Seam Audit

Date: 2026-08-13
Plan task: Task 1, Confirm native plugin extension seam
Scope: read-only audit; no production or test code changed.

## Decision

The ontology integration has a native Appsmith PF4J datasource seam. It should be implemented as a normal DB datasource plugin and use the existing datasource, action, execution, and DataTree lifecycles. No ontology-specific Widget mode, Redux state, Saga, AppIDE loader, or custom DataTree node is part of this seam. Any future UI copy must be supplied through English i18n keys.

## Closest exemplar: Mongo

`app/server/appsmith-plugins/mongoPlugin` is the closest structural exemplar because it is a DB plugin using the UQI editor resource format, conditional operation sections, dynamic datasource structure options, and the standard reactive executor lifecycle.

### Exact server registration and lifecycle

| Concern | Verified location and contract |
| --- | --- |
| Maven module | `app/server/appsmith-plugins/pom.xml` lists `<module>mongoPlugin</module>`. A future ontology module must be added to this reactor. |
| Module POM | `app/server/appsmith-plugins/mongoPlugin/pom.xml` inherits `com.appsmith:appsmith-plugins:1.0-SNAPSHOT`, has artifact `mongoPlugin`, and declares only its testcontainers Mongo dependency. |
| PF4J descriptor | `app/server/appsmith-plugins/mongoPlugin/src/main/resources/plugin.properties`: `plugin.id=mongo-plugin`, `plugin.class=com.external.plugins.MongoPlugin`, version, provider, and empty dependency list. |
| Plugin class | `com.external.plugins.MongoPlugin` extends `BasePlugin` and accepts `PluginWrapper` in its constructor. |
| Executor class | `com.external.plugins.MongoPlugin.MongoPluginExecutor` is the exact `@Extension` class. It implements `PluginExecutor<MongoClient>` and `SmartSubstitutionInterface`; its constructor receives `ObservationRegistry`. |
| Action execution | `executeParameterized(MongoClient, ExecuteActionDTO, DatasourceConfiguration, ActionConfiguration)` reads `actionConfiguration.formData`, performs substitution/normalization, and returns `Mono<ActionExecutionResult>`. The executor also implements the standard `datasourceCreate`, `datasourceDestroy`, `validateDatasource`, `testDatasource`, `getStructure`, `execute`, and native-query extraction hooks. |
| Packaging | Mongo's module POM has no module-local shade or dependency-copy plugin. The normal Maven jar/resource lifecycle is sufficient for this exemplar. Runtime-dependent DB exemplars such as `mysqlPlugin` add `maven-shade-plugin` plus `maven-dependency-plugin` copying runtime dependencies to `${project.build.directory}/lib`; the ontology module must add those only if its runtime dependencies require them. Server packaging copies plugin jars from `app/server/appsmith-plugins/*/target/*.jar`. |

### Exact PF4J resources

Mongo packages these resources under `app/server/appsmith-plugins/mongoPlugin/src/main/resources/`:

- `plugin.properties`
- `form.json` for datasource configuration
- `editor/root.json` for the UQI editor root
- `editor/aggregate.json`, `count.json`, `delete.json`, `distinct.json`, `find.json`, `insert.json`, `update.json`, and `raw.json` for operation sections referenced by `root.json.files`
- `setting.json` for run behavior, confirmation, substitution, and timeout
- `dependency.json` for form-field dependency evaluation
- `templates/meta.json` and `templates/CREATE.json`, `DELETE.json`, `READ.json`, `UPDATE.json` for optional query templates
- `dependency.json` and `setting.json` are optional by convention, but are included by this exemplar; `form.json` is required by the datasource form path.

The server loads `form.json`, `editor.json`, `setting.json`, and `dependency.json` in `PluginServiceCEImpl.getFormConfig`. For a UQI plugin, `loadPluginResource("editor.json")` detects `uiComponent == UQIDbEditorForm`, reads `editor/root.json` through the plugin classloader, appends a generated template section, and loads every file named in `root.json.files` from the editor resource folder.

## How configuration reaches the native query editor

The current frontend path is `app/client/src/PluginActionEditor/` (the brief's `app/client/src/pages/Editor/PluginActionEditor/` path does not exist in this checkout). `PluginActionEditor.tsx` selects the Action, Datasource, Plugin, editor config, settings config, and action response, then provides them through `PluginActionContextProvider`.

`PluginSagas` fetches each plugin's server form payload. Its `editor` member becomes `editorConfigs[pluginId]`; missing editor/settings/dependency resources use type defaults. A DB plugin's metadata selects `UIComponentTypes.DbEditorForm` or `UQIDbEditorForm`. `PluginActionForm` mounts `UQIEditorForm`, and `UQIEditorForm` passes the server editor config plus the Redux-form action data to `FormRender`.

Mongo's concrete field handoff is visible in `editor/root.json` and its operation files:

- the command selector writes to `actionConfiguration.formData.command.data`;
- operation fields write to paths such as `actionConfiguration.formData.find.query.data` and `actionConfiguration.formData.collection.data`;
- collection controls use `propertyName: "get_collections"`, `fetchOptionsConditionally: true`, and `_GET_STRUCTURE` to obtain normal datasource structure options;
- `FormRender` recursively maps `controlType`, conditionals, and each `configProperty` to the existing `FormControl`, which binds the value into the standard Redux form.

This is the native configuration boundary: plugin JSON describes fields, paths, conditions, and built-in control types; the action lifecycle persists and executes the resulting `ActionConfiguration`.

## JSON-only visual editor decision

Plugin JSON is sufficient for a first ontology editor containing static sections, built-in controls, conditional operation branches, binding-capable text inputs, and provider-backed options exposed through an existing control contract. It is not sufficient for a new bespoke visual query control that must fetch and render a pinned ontology snapshot with custom option behavior. If Tasks 2-8 require that behavior, the smallest extension is a focused native `PluginActionEditor` form-control/control-factory addition, with the control reading the datasource/action context through an existing API contract and writing ordinary `actionConfiguration.formData` paths. Do not add ontology Widget mode, ontology Redux/Saga state, a custom DataTree path, or a separate AppIDE loader.

## Tasks 2-8 registration checklist

1. Add the ontology plugin module to `app/server/appsmith-plugins/pom.xml`.
2. Add a module POM using the PF4J parent conventions; add shade/dependency-copy configuration only for non-provided runtime dependencies.
3. Add `plugin.properties`, `form.json`, UQI `editor/root.json` and referenced operation files, plus `setting.json`, `dependency.json`, and templates only where needed.
4. Implement one `BasePlugin` class and one nested or top-level `@Extension` executor implementing `PluginExecutor<ConnectionType>` and the standard datasource/action lifecycle.
5. Keep persisted configuration limited to stable datasource identity, pinned snapshot identity, provider references, and action form data; resolve runtime execution through the plugin/server contract.
6. Return standard `ActionExecutionResult` values. Object query results must be array-shaped for native bindings such as `{{QueryName.data}}`.
7. Keep all UI text in English i18n keys; do not create ontology-specific Widget, Redux, Saga, DataTree, or AppIDE paths.

## Verification scope

The brief-specified command was attempted exactly once:

```bash
cd app/server && ./mvnw -pl appsmith-plugins/mongoPlugin -am test -DskipTests
```

It exited `127` because this checkout has no `app/server/mvnw` wrapper. The repository's actual build entry uses the system Maven binary, so the equivalent single-reactor check was run:

```bash
cd app/server && mvn -pl appsmith-plugins/mongoPlugin -am test -DskipTests
```

It exited `0` with `BUILD SUCCESS` for `integrated`, `interfaces`, `appsmith-plugins`, and `mongoPlugin`. Tests were intentionally skipped by `-DskipTests`; this verification resolved the exemplar module without starting development services or parallel builds.
