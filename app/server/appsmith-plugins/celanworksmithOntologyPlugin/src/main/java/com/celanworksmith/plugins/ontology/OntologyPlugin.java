package com.celanworksmith.plugins.ontology;

import com.appsmith.external.exceptions.pluginExceptions.AppsmithPluginError;
import com.appsmith.external.exceptions.pluginExceptions.AppsmithPluginException;
import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionExecutionResult;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStructure;
import com.appsmith.external.models.DatasourceTestResult;
import com.appsmith.external.plugins.BasePlugin;
import com.appsmith.external.plugins.PluginExecutor;
import com.celanworksmith.ontology.datasource.OntologyActionServerClient;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.ObjectQueryResult;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.Snapshot;
import com.celanworksmith.ontology.datasource.WorkspaceActionServerConfigurationResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.pf4j.Extension;
import org.pf4j.PluginWrapper;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class OntologyPlugin extends BasePlugin {

    public OntologyPlugin(PluginWrapper wrapper) {
        super(wrapper);
    }

    @Extension
    public static class OntologyPluginExecutor implements PluginExecutor<OntologyDatasourceConfiguration> {
        private final OntologyRuntimeGateway runtimeGateway;
        private final WorkspaceActionServerConfigurationResolver actionServerResolver;
        private final OntologyQueryValidator queryValidator;

        public OntologyPluginExecutor(OntologyRuntimeGateway runtimeGateway) {
            this(
                    runtimeGateway,
                    workspaceId -> Mono.error(new IllegalStateException(
                            "Ontology Action Server is not configured for workspace: " + workspaceId)));
        }

        public OntologyPluginExecutor(
                OntologyRuntimeGateway runtimeGateway,
                WorkspaceActionServerConfigurationResolver actionServerResolver) {
            this.runtimeGateway = runtimeGateway;
            this.actionServerResolver = actionServerResolver;
            this.queryValidator = new OntologyQueryValidator(new ObjectMapper());
        }

        @Override
        public Mono<OntologyDatasourceConfiguration> datasourceCreate(DatasourceConfiguration datasourceConfiguration) {
            return Mono.fromSupplier(() -> OntologyDatasourceConfiguration.from(datasourceConfiguration));
        }

        @Override
        public void datasourceDestroy(OntologyDatasourceConfiguration datasourceConfiguration) {
            // The pinned datasource configuration has no runtime connection in the skeleton.
        }

        @Override
        public Set<String> validateDatasource(DatasourceConfiguration datasourceConfiguration) {
            try {
                OntologyDatasourceConfiguration.from(datasourceConfiguration);
                return Set.of();
            } catch (IllegalArgumentException exception) {
                return Set.of(exception.getMessage());
            }
        }

        @Override
        public Mono<DatasourceTestResult> testDatasource(OntologyDatasourceConfiguration datasourceConfiguration) {
            return Mono.just(new DatasourceTestResult());
        }

        @Override
        public Mono<DatasourceStructure> getStructure(
                OntologyDatasourceConfiguration datasourceConfiguration,
                DatasourceConfiguration datasourceConfigurationInput) {
            return runtimeGateway
                    .getRequiredSnapshot(
                            datasourceConfiguration.metadataSnapshotId(), datasourceConfiguration.metadataDigest())
                    .map(snapshot -> datasourceStructure(datasourceConfiguration, snapshot));
        }

        @Override
        public Mono<ActionExecutionResult> execute(
                OntologyDatasourceConfiguration datasourceConfiguration,
                DatasourceConfiguration datasourceConfigurationInput,
                ActionConfiguration actionConfiguration) {
            return Mono.defer(() -> executeQuery(datasourceConfiguration, actionConfiguration))
                    .onErrorResume(this::failedResult);
        }

        private Mono<ActionExecutionResult> executeQuery(
                OntologyDatasourceConfiguration datasourceConfiguration, ActionConfiguration actionConfiguration) {
            OntologyActionConfiguration configuration = OntologyActionConfiguration.from(actionConfiguration);
            return runtimeGateway
                    .getRequiredSnapshot(
                            datasourceConfiguration.metadataSnapshotId(), datasourceConfiguration.metadataDigest())
                    .flatMap(snapshot -> switch (configuration.operation()) {
                        case OBJECT_QUERY ->
                            executeValidatedObjectQuery(datasourceConfiguration, configuration, snapshot);
                        case FUNCTION_QUERY -> executeFunctionQuery(datasourceConfiguration, configuration, snapshot);
                        case LINK_QUERY -> executeLinkQuery(datasourceConfiguration, configuration, snapshot);
                        case ACTION_QUERY -> executeActionQuery(datasourceConfiguration, configuration, snapshot);
                    });
        }

        private DatasourceStructure datasourceStructure(
                OntologyDatasourceConfiguration datasourceConfiguration, Snapshot snapshot) {
            validateSnapshotPin(datasourceConfiguration, snapshot);
            return new DatasourceStructure(snapshot.objectTypes().stream()
                    .map(objectType -> new DatasourceStructure.Table(
                            DatasourceStructure.TableType.TABLE,
                            null,
                            objectType.id(),
                            objectType.properties().stream()
                                    .filter(property -> !property.hidden())
                                    .map(property -> new DatasourceStructure.Column(
                                            property.id(), property.dataType(), null, false))
                                    .toList(),
                            java.util.List.of(),
                            java.util.List.of()))
                    .toList());
        }

        private Mono<ActionExecutionResult> executeValidatedObjectQuery(
                OntologyDatasourceConfiguration datasourceConfiguration,
                OntologyActionConfiguration configuration,
                Snapshot snapshot) {
            if (!datasourceConfiguration.metadataSnapshotId().equals(snapshot.id())
                    || !datasourceConfiguration.metadataDigest().equals(snapshot.digest())) {
                return Mono.error(
                        new IllegalArgumentException("Ontology metadata snapshot does not match datasource pin"));
            }
            OntologyRuntimeGateway.ObjectQuery query = queryValidator.validateObjectQuery(configuration, snapshot);
            String objectTypeId = (String) configuration.definition().get("objectTypeId");
            return runtimeGateway
                    .queryObjects(datasourceConfiguration.runtimeProviderId(), snapshot, objectTypeId, query)
                    .map(result -> successResult(result, query));
        }

        private ActionExecutionResult successResult(
                ObjectQueryResult result, OntologyRuntimeGateway.ObjectQuery query) {
            ActionExecutionResult executionResult = new ActionExecutionResult();
            executionResult.setBody(result.items().stream()
                    .map(item -> projectedItem(item, query.projection()))
                    .toList());
            executionResult.setIsExecutionSuccess(true);
            return executionResult;
        }

        private Mono<ActionExecutionResult> executeFunctionQuery(
                OntologyDatasourceConfiguration datasourceConfiguration,
                OntologyActionConfiguration configuration,
                Snapshot snapshot) {
            validateSnapshotPin(datasourceConfiguration, snapshot);
            Map<String, Object> parameters = queryValidator.validateFunctionParameters(configuration, snapshot);
            String functionId = (String) configuration.definition().get("functionId");
            return runtimeGateway
                    .executeFunction(datasourceConfiguration.runtimeProviderId(), snapshot, functionId, parameters)
                    .map(this::successResult);
        }

        private Mono<ActionExecutionResult> executeLinkQuery(
                OntologyDatasourceConfiguration datasourceConfiguration,
                OntologyActionConfiguration configuration,
                Snapshot snapshot) {
            validateSnapshotPin(datasourceConfiguration, snapshot);
            queryValidator.validateLink(configuration, snapshot);
            return runtimeGateway
                    .resolveLink(
                            datasourceConfiguration.runtimeProviderId(),
                            snapshot,
                            (String) configuration.definition().get("sourceTypeId"),
                            (String) configuration.definition().get("sourceId"),
                            (String) configuration.definition().get("linkId"))
                    .map(this::successResult);
        }

        private Mono<ActionExecutionResult> executeActionQuery(
                OntologyDatasourceConfiguration datasourceConfiguration,
                OntologyActionConfiguration configuration,
                Snapshot snapshot) {
            validateSnapshotPin(datasourceConfiguration, snapshot);
            Map<String, Object> parameters = queryValidator.validateActionParameters(configuration, snapshot);
            OntologyActionServerClient.Request request = new OntologyActionServerClient.Request(
                    datasourceConfiguration.workspaceId(),
                    datasourceConfiguration.projectId(),
                    datasourceConfiguration.projectVersion(),
                    datasourceConfiguration.datasourceId(),
                    (String) configuration.definition().get("actionId"),
                    (String) configuration.definition().get("objectTypeId"),
                    (String) configuration.definition().get("objectId"),
                    parameters,
                    Map.of(
                            "metadataSnapshotId", datasourceConfiguration.metadataSnapshotId(),
                            "metadataDigest", datasourceConfiguration.metadataDigest()),
                    "ontology-action:" + UUID.randomUUID());
            return actionServerResolver
                    .resolveRequired(datasourceConfiguration.workspaceId())
                    .flatMap(client -> client.execute(request))
                    .map(this::actionSuccessResult)
                    .onErrorMap(OntologyActionServerClient.DomainException.class, this::actionServerFailure);
        }

        private ActionExecutionResult successResult(Object body) {
            ActionExecutionResult executionResult = new ActionExecutionResult();
            executionResult.setBody(body);
            executionResult.setIsExecutionSuccess(true);
            return executionResult;
        }

        private ActionExecutionResult actionSuccessResult(OntologyActionServerClient.Result result) {
            return successResult(actionResultBody(result));
        }

        private Map<String, Object> actionResultBody(OntologyActionServerClient.Result result) {
            if (result.body() instanceof Map<?, ?> values) {
                Map<String, Object> body = new java.util.LinkedHashMap<>();
                values.forEach((key, value) -> body.put(String.valueOf(key), value));
                body.put("auditId", result.auditId());
                return Map.copyOf(body);
            }
            return Map.of("data", result.body(), "auditId", result.auditId());
        }

        private IllegalStateException actionServerFailure(OntologyActionServerClient.DomainException error) {
            return new IllegalStateException(error.getMessage() + " (auditId: " + error.auditId() + ")", error);
        }

        private void validateSnapshotPin(OntologyDatasourceConfiguration datasourceConfiguration, Snapshot snapshot) {
            if (!datasourceConfiguration.metadataSnapshotId().equals(snapshot.id())
                    || !datasourceConfiguration.metadataDigest().equals(snapshot.digest())) {
                throw new IllegalArgumentException("Ontology metadata snapshot does not match datasource pin");
            }
        }

        private Map<String, Object> projectedItem(Map<String, Object> item, java.util.List<String> projection) {
            return projection.stream()
                    .collect(java.util.stream.Collectors.toMap(
                            propertyId -> propertyId, item::get, (left, right) -> left, java.util.LinkedHashMap::new));
        }

        private Mono<ActionExecutionResult> failedResult(Throwable error) {
            ActionExecutionResult executionResult = new ActionExecutionResult();
            executionResult.setIsExecutionSuccess(false);
            executionResult.setReadableError(error.getMessage());
            executionResult.setErrorInfo(new AppsmithPluginException(
                    error,
                    error instanceof IllegalArgumentException
                            ? AppsmithPluginError.PLUGIN_EXECUTE_ARGUMENT_ERROR
                            : AppsmithPluginError.PLUGIN_ERROR,
                    error.getMessage()));
            return Mono.just(executionResult);
        }
    }
}
