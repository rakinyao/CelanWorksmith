package com.celanworksmith.release;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.server.domains.NewAction;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDependency;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class ReleaseDependencyScanner {
    private static final List<String> SELECTOR_KEYS =
            List.of("objectTypeId", "objectId", "functionId", "actionId", "linkId", "sourceTypeId", "sourceId");
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ScanResult scan(ApplicationReleaseCandidate candidate, List<ReleaseDatasourcePin> pins) {
        List<ReleaseDependency> dependencies = new ArrayList<>();
        List<ReleaseDiagnostic> diagnostics = new ArrayList<>();
        Set<String> ontologyDatasourceIds = pins.stream()
                .filter(pin -> "ONTOLOGY".equals(pin.kind()))
                .map(ReleaseDatasourcePin::datasourceId)
                .collect(Collectors.toUnmodifiableSet());
        for (int index = 0; index < candidate.unpublishedActions().size(); index++) {
            NewAction action = candidate.unpublishedActions().get(index);
            String base = "unpublishedActions[" + index + "].unpublishedAction";
            if (action == null || action.getUnpublishedAction() == null) {
                diagnostic(
                        diagnostics,
                        "RELEASE_REFERENCE_MALFORMED",
                        base,
                        "Unpublished action configuration is missing");
                continue;
            }
            String actionId = action.getId();
            if (text(actionId) == null || actionId.isBlank()) {
                diagnostic(diagnostics, "RELEASE_REFERENCE_MALFORMED", base + ".id", "Action identifier is missing");
            } else {
                dependencies.add(new ReleaseDependency("ACTION", null, actionId, base + ".id"));
            }
            var datasource = action.getUnpublishedAction().getDatasource();
            if (datasource != null
                    && text(datasource.getId()) != null
                    && !datasource.getId().isBlank()) {
                dependencies.add(new ReleaseDependency(
                        "DATASOURCE", datasource.getId(), datasource.getId(), base + ".datasource.id"));
            }
            ActionConfiguration configuration = action.getUnpublishedAction().getActionConfiguration();
            if (configuration != null
                    && configuration.getFormData() != null
                    && datasource != null
                    && ontologyDatasourceIds.contains(datasource.getId())) {
                scanFormData(
                        configuration.getFormData(),
                        base + ".actionConfiguration.formData",
                        datasource == null ? null : datasource.getId(),
                        dependencies,
                        diagnostics);
            }
        }
        dependencies.sort(Comparator.comparing(ReleaseDependency::kind)
                .thenComparing(ReleaseDependency::datasourceId, Comparator.nullsFirst(String::compareTo))
                .thenComparing(ReleaseDependency::referenceId)
                .thenComparing(ReleaseDependency::path));
        diagnostics.sort(Comparator.comparing(ReleaseDiagnostic::path).thenComparing(ReleaseDiagnostic::code));
        return new ScanResult(dependencies, diagnostics);
    }

    private void scanFormData(
            Map<String, Object> rawFormData,
            String path,
            String datasourceId,
            List<ReleaseDependency> dependencies,
            List<ReleaseDiagnostic> diagnostics) {
        Map<String, Object> formData = unwrapMap(rawFormData);
        String operation = text(unwrap(formData.get("operation")));
        if (operation == null || operation.isBlank()) {
            diagnostic(diagnostics, "RELEASE_REFERENCE_MALFORMED", path + ".operation", "Query operation is missing");
            return;
        }
        Map<String, Object> definition = definition(formData.get("definition"), path, diagnostics);
        if (definition == null) {
            return;
        }
        for (String key : SELECTOR_KEYS) {
            Object value = unwrap(formData.get(key));
            if (isNonBlank(value)) {
                definition.put(key, value);
            }
        }
        Object projection = unwrap(formData.get("projection"));
        if (projection != null) {
            definition.put("projection", projection);
        }
        String required =
                switch (operation) {
                    case "OBJECT_QUERY" -> "objectTypeId";
                    case "FUNCTION_QUERY" -> "functionId";
                    case "ACTION_QUERY" -> "actionId";
                    case "LINK_QUERY" -> "linkId";
                    default -> null;
                };
        if (required == null) {
            diagnostic(diagnostics, "RELEASE_REFERENCE_MALFORMED", path + ".operation", "Unsupported query operation");
            return;
        }
        addReference(
                definition,
                required,
                kind(required),
                path + ".definition." + required,
                datasourceId,
                dependencies,
                diagnostics);
        if (operation.equals("ACTION_QUERY")) {
            addReference(
                    definition,
                    "objectTypeId",
                    "OBJECT_TYPE",
                    path + ".definition.objectTypeId",
                    datasourceId,
                    dependencies,
                    diagnostics);
        }
        if (operation.equals("LINK_QUERY")) {
            addReference(
                    definition,
                    "sourceTypeId",
                    "OBJECT_TYPE",
                    path + ".definition.sourceTypeId",
                    datasourceId,
                    dependencies,
                    diagnostics);
        }
        scanProjection(
                definition.get("projection"), path + ".definition.projection", datasourceId, dependencies, diagnostics);
        scanNestedProperties(definition, path + ".definition", datasourceId, dependencies, diagnostics);
    }

    private Map<String, Object> definition(Object value, String path, List<ReleaseDiagnostic> diagnostics) {
        value = unwrap(value);
        if (value instanceof Map<?, ?> map) {
            return mapCopy(map);
        }
        if (value instanceof String json) {
            try {
                return objectMapper.readValue(json, new TypeReference<LinkedHashMap<String, Object>>() {});
            } catch (Exception exception) {
                diagnostic(
                        diagnostics,
                        "RELEASE_REFERENCE_MALFORMED",
                        path + ".definition",
                        "Query definition must be valid JSON");
                return null;
            }
        }
        diagnostic(
                diagnostics,
                "RELEASE_REFERENCE_MALFORMED",
                path + ".definition",
                "Query definition must be an object or JSON object string");
        return null;
    }

    private void addReference(
            Map<String, Object> definition,
            String key,
            String kind,
            String path,
            String datasourceId,
            List<ReleaseDependency> dependencies,
            List<ReleaseDiagnostic> diagnostics) {
        String value = text(unwrap(definition.get(key)));
        if (value == null || value.isBlank()) {
            diagnostic(diagnostics, "RELEASE_REFERENCE_MALFORMED", path, "Reference is missing");
        } else {
            dependencies.add(new ReleaseDependency(kind, datasourceId, value, path));
        }
    }

    private void scanProjection(
            Object value,
            String path,
            String datasourceId,
            List<ReleaseDependency> dependencies,
            List<ReleaseDiagnostic> diagnostics) {
        value = unwrap(value);
        if (!(value instanceof List<?> values)) {
            if (value != null) {
                diagnostic(diagnostics, "RELEASE_REFERENCE_MALFORMED", path, "Projection must be a list");
            }
            return;
        }
        for (int index = 0; index < values.size(); index++) {
            String property = text(unwrap(values.get(index)));
            String propertyPath = path + "[" + index + "]";
            if (property == null || property.isBlank()) {
                diagnostic(diagnostics, "RELEASE_REFERENCE_MALFORMED", propertyPath, "Property reference is missing");
            } else {
                dependencies.add(new ReleaseDependency("PROPERTY", datasourceId, property, propertyPath));
            }
        }
    }

    private void scanNestedProperties(
            Object value,
            String path,
            String datasourceId,
            List<ReleaseDependency> dependencies,
            List<ReleaseDiagnostic> diagnostics) {
        if (value instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = String.valueOf(entry.getKey());
                Object child = unwrap(entry.getValue());
                String childPath = path + "." + key;
                if (key.equals("propertyId")
                        && text(child) != null
                        && !text(child).isBlank()) {
                    dependencies.add(new ReleaseDependency("PROPERTY", datasourceId, text(child), childPath));
                } else if (key.equals("propertyId")) {
                    diagnostic(diagnostics, "RELEASE_REFERENCE_MALFORMED", childPath, "Property reference is missing");
                } else {
                    scanNestedProperties(child, childPath, datasourceId, dependencies, diagnostics);
                }
            }
        } else if (value instanceof List<?> list) {
            for (int index = 0; index < list.size(); index++) {
                scanNestedProperties(
                        list.get(index), path + "[" + index + "]", datasourceId, dependencies, diagnostics);
            }
        }
    }

    private String kind(String key) {
        return switch (key) {
            case "objectTypeId" -> "OBJECT_TYPE";
            case "functionId" -> "FUNCTION";
            case "actionId" -> "ONTOLOGY_ACTION";
            default -> "LINK";
        };
    }

    private Object unwrap(Object value) {
        if (value instanceof Map<?, ?> map && map.containsKey("data")) {
            return unwrap(map.get("data"));
        }
        if (value instanceof List<?> list) {
            return list.stream().map(this::unwrap).toList();
        }
        return value;
    }

    private Map<String, Object> unwrapMap(Map<String, Object> value) {
        Map<String, Object> result = mapCopy(value);
        result.replaceAll((key, item) -> unwrap(item));
        return result;
    }

    private Map<String, Object> mapCopy(Map<?, ?> map) {
        Map<String, Object> result = new LinkedHashMap<>();
        map.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }

    private String text(Object value) {
        return value instanceof String string ? string : null;
    }

    private boolean isNonBlank(Object value) {
        return value instanceof String string && !string.isBlank();
    }

    private void diagnostic(List<ReleaseDiagnostic> diagnostics, String code, String path, String message) {
        diagnostics.add(new ReleaseDiagnostic(ReleaseDiagnostic.Severity.BLOCKING, code, path, message, Map.of()));
    }

    public record ScanResult(List<ReleaseDependency> dependencies, List<ReleaseDiagnostic> diagnostics) {
        public ScanResult {
            dependencies = List.copyOf(dependencies);
            diagnostics = List.copyOf(diagnostics);
        }
    }
}
