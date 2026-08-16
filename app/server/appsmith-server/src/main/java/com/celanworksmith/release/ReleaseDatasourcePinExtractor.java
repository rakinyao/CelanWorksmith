package com.celanworksmith.release;

import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStorageDTO;
import com.appsmith.external.models.Property;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.domains.Plugin;
import com.appsmith.server.plugins.base.PluginService;
import com.appsmith.server.repositories.NewActionRepository;
import com.celanworksmith.ontology.datasource.OntologyDatasourceService;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDatasourcePinExtractionResult;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import com.fasterxml.jackson.databind.ObjectMapper;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ReleaseDatasourcePinExtractor {
    private final NewActionRepository actionRepository;
    private final PluginService pluginService;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    public ReleaseDatasourcePinExtractor(NewActionRepository actionRepository, PluginService pluginService) {
        this.actionRepository = actionRepository;
        this.pluginService = pluginService;
    }

    public Mono<ReleaseDatasourcePinExtractionResult> extract(ApplicationReleaseCandidate candidate) {
        return pluginService
                .findByPackageName(OntologyDatasourceService.PLUGIN_PACKAGE_NAME)
                .map(Plugin::getId)
                .defaultIfEmpty("")
                .flatMap(ontologyPluginId -> actionRepository
                        .findByApplicationId(candidate.application().getId(), AclPermission.READ_ACTIONS)
                        .collectList()
                        .map(actions -> extractPins(actions, ontologyPluginId, candidate.usedDatasources())));
    }

    private ReleaseDatasourcePinExtractionResult extractPins(
            List<NewAction> actions, String ontologyPluginId, List<Datasource> usedDatasources) {
        List<IndexedAction> sortedActions = new ArrayList<>();
        for (int index = 0; index < actions.size(); index++) {
            NewAction action = actions.get(index);
            sortedActions.add(new IndexedAction(index, action, actionId(action), actionDigest(action)));
        }
        sortedActions.sort(Comparator.comparing(IndexedAction::id)
                .thenComparing(IndexedAction::digest)
                .thenComparingInt(IndexedAction::index));

        Map<String, List<CandidatePin>> candidates = new LinkedHashMap<>();
        List<ReleaseDiagnostic> diagnostics = new ArrayList<>();
        for (IndexedAction indexed : sortedActions) {
            String path = actionPath(indexed);
            if (indexed.action() == null || indexed.action().getUnpublishedAction() == null) {
                diagnostic(
                        diagnostics,
                        "RELEASE_DATASOURCE_REFERENCE_MALFORMED",
                        path,
                        "Unpublished action configuration is missing");
                continue;
            }
            Datasource datasource = indexed.action().getUnpublishedAction().getDatasource();
            if (datasource == null) {
                diagnostic(
                        diagnostics,
                        "RELEASE_DATASOURCE_REFERENCE_MALFORMED",
                        path + ".datasource",
                        "Datasource reference is missing");
                continue;
            }
            try {
                require(datasource.getId(), path + ".datasource.id");
                Datasource resolved = resolve(datasource, usedDatasources);
                if (ontologyPluginId.isBlank() && looksLikeOntologyDatasource(datasource)) {
                    diagnostic(
                            diagnostics,
                            "RELEASE_DATASOURCE_PLUGIN_NOT_FOUND",
                            path + ".datasource.pluginId",
                            "Ontology datasource plugin is not available");
                    continue;
                }
                if (resolved == null
                        && !hasInlineConfiguration(datasource)
                        && ontologyPluginId.equals(datasource.getPluginId())) {
                    diagnostic(
                            diagnostics,
                            "RELEASE_DATASOURCE_REFERENCE_NOT_FOUND",
                            path + ".datasource.id",
                            "Referenced datasource is not present in the release candidate");
                    continue;
                }
                ReleaseDatasourcePin pin =
                        pin(resolved == null ? datasource : resolved, path + ".datasource", ontologyPluginId);
                candidates
                        .computeIfAbsent(datasource.getId(), ignored -> new ArrayList<>())
                        .add(new CandidatePin(pin, path + ".datasource"));
            } catch (IllegalArgumentException exception) {
                diagnostic(
                        diagnostics,
                        "RELEASE_DATASOURCE_CONFIGURATION_MALFORMED",
                        diagnosticPath(path + ".datasource", exception),
                        exception.getMessage());
            }
        }

        List<ReleaseDatasourcePin> pins = new ArrayList<>();
        for (Map.Entry<String, List<CandidatePin>> entry : candidates.entrySet()) {
            List<CandidatePin> values = entry.getValue();
            ReleaseDatasourcePin first = values.get(0).pin();
            if (values.stream().anyMatch(value -> !first.equals(value.pin()))) {
                diagnostic(
                        diagnostics,
                        "RELEASE_DATASOURCE_CONFLICT",
                        values.get(1).path(),
                        "Conflicting datasource definitions were referenced by unpublished actions");
            } else {
                pins.add(first);
            }
        }
        pins.sort(Comparator.comparing(ReleaseDatasourcePin::datasourceId));
        diagnostics.sort(Comparator.comparing(ReleaseDiagnostic::path).thenComparing(ReleaseDiagnostic::code));
        return new ReleaseDatasourcePinExtractionResult(pins, diagnostics);
    }

    private ReleaseDatasourcePin pin(Datasource datasource, String path, String ontologyPluginId) {
        require(datasource.getPluginId(), path + ".pluginId");
        if (!datasource.getPluginId().equals(ontologyPluginId)) {
            return new ReleaseDatasourcePin(
                    datasource.getId(), datasource.getPluginId(), "NATIVE", null, null, null, null);
        }
        Map<String, String> properties = new LinkedHashMap<>();
        DatasourceConfiguration configuration = configuration(datasource);
        if (configuration != null && configuration.getProperties() != null) {
            for (Property property : configuration.getProperties()) {
                if (property != null && property.getKey() != null && property.getValue() != null) {
                    properties.put(property.getKey(), String.valueOf(property.getValue()));
                }
            }
        }
        String projectId = required(properties, "projectId");
        String projectVersion = required(properties, "projectVersion");
        String snapshotId = required(properties, "metadataSnapshotId");
        String digest = required(properties, "metadataDigest");
        String providerId = required(properties, "runtimeProviderId");
        String contractVersion = required(properties, "providerContractVersion");
        if (projectId.isBlank() || projectVersion.isBlank()) {
            throw new IllegalArgumentException("project identity must not be blank");
        }
        return new ReleaseDatasourcePin(
                datasource.getId(),
                datasource.getPluginId(),
                "ONTOLOGY",
                providerId,
                snapshotId,
                digest,
                contractVersion,
                projectId,
                projectVersion);
    }

    private Datasource resolve(Datasource reference, List<Datasource> usedDatasources) {
        if (usedDatasources == null) {
            return null;
        }
        return usedDatasources.stream()
                .filter(datasource -> datasource != null && reference.getId().equals(datasource.getId()))
                .findFirst()
                .orElse(null);
    }

    private boolean hasInlineConfiguration(Datasource datasource) {
        DatasourceConfiguration configuration = datasource.getDatasourceConfiguration();
        return configuration != null
                && configuration.getProperties() != null
                && !configuration.getProperties().isEmpty();
    }

    private boolean looksLikeOntologyDatasource(Datasource datasource) {
        DatasourceConfiguration configuration = configuration(datasource);
        if (configuration == null || configuration.getProperties() == null) {
            return false;
        }
        return configuration.getProperties().stream()
                .filter(property -> property != null)
                .map(Property::getKey)
                .anyMatch(key -> "metadataSnapshotId".equals(key)
                        || "metadataDigest".equals(key)
                        || "runtimeProviderId".equals(key));
    }

    private DatasourceConfiguration configuration(Datasource datasource) {
        Map<String, DatasourceStorageDTO> storages = datasource.getDatasourceStorages();
        if (storages != null) {
            DatasourceStorageDTO storage = storages.get("");
            if (storage != null && storage.getDatasourceConfiguration() != null) {
                return storage.getDatasourceConfiguration();
            }
            storage = storages.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(Map.Entry::getValue)
                    .filter(value -> value != null && value.getDatasourceConfiguration() != null)
                    .findFirst()
                    .orElse(null);
            if (storage != null) {
                return storage.getDatasourceConfiguration();
            }
        }
        return datasource.getDatasourceConfiguration();
    }

    private String required(Map<String, String> properties, String key) {
        String value = properties.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(key + " must not be blank");
        }
        return value;
    }

    private void require(String value, String path) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(path + " must not be blank");
        }
    }

    private String actionPath(IndexedAction indexed) {
        if (!indexed.id().isBlank()) {
            return "unpublishedActions[actionId=" + indexed.id() + "].unpublishedAction";
        }
        return "unpublishedActions[" + indexed.index() + "].unpublishedAction";
    }

    private String actionId(NewAction action) {
        return action == null || action.getId() == null ? "" : action.getId();
    }

    private String actionDigest(NewAction action) {
        try {
            return objectMapper.writeValueAsString(action == null ? null : action.getUnpublishedAction());
        } catch (Exception ignored) {
            return "";
        }
    }

    private String diagnosticPath(String path, IllegalArgumentException exception) {
        String message = exception.getMessage();
        if (message != null) {
            for (String key : List.of(
                    "projectId",
                    "projectVersion",
                    "metadataSnapshotId",
                    "metadataDigest",
                    "runtimeProviderId",
                    "providerContractVersion")) {
                if (message.startsWith(key + " ")) {
                    return path + ".datasourceConfiguration.properties." + key;
                }
            }
            if (message.contains(".id ")) {
                return path + ".id";
            }
            if (message.contains(".pluginId ")) {
                return path + ".pluginId";
            }
        }
        return path + ".datasourceConfiguration.properties";
    }

    private void diagnostic(List<ReleaseDiagnostic> diagnostics, String code, String path, String message) {
        diagnostics.add(new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.BLOCKING,
                code,
                path,
                message == null || message.isBlank() ? code : message,
                Map.of()));
    }

    private record IndexedAction(int index, NewAction action, String id, String digest) {}

    private record CandidatePin(ReleaseDatasourcePin pin, String path) {}
}
