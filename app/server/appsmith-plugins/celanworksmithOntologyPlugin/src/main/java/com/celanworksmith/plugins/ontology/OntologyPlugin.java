package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionExecutionResult;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceTestResult;
import com.appsmith.external.plugins.BasePlugin;
import com.appsmith.external.plugins.PluginExecutor;
import org.pf4j.Extension;
import org.pf4j.PluginWrapper;
import reactor.core.publisher.Mono;

import java.util.Set;

public class OntologyPlugin extends BasePlugin {

    public OntologyPlugin(PluginWrapper wrapper) {
        super(wrapper);
    }

    @Extension
    public static class OntologyPluginExecutor implements PluginExecutor<OntologyDatasourceConfiguration> {

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
        public Mono<ActionExecutionResult> execute(
                OntologyDatasourceConfiguration datasourceConfiguration,
                DatasourceConfiguration datasourceConfigurationInput,
                ActionConfiguration actionConfiguration) {
            return Mono.error(new UnsupportedOperationException("Ontology query execution is not configured"));
        }
    }
}
