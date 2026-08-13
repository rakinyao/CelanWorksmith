package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.Property;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

public record OntologyDatasourceConfiguration(
        String projectId,
        String projectVersion,
        String metadataSnapshotId,
        String metadataDigest,
        String runtimeProviderId) {

    private static final Pattern SHA_256_DIGEST = Pattern.compile("sha256:[0-9a-fA-F]{64}");

    public static OntologyDatasourceConfiguration from(DatasourceConfiguration datasourceConfiguration) {
        if (datasourceConfiguration == null) {
            throw new IllegalArgumentException("Datasource configuration is required");
        }

        Map<String, String> properties = propertiesByKey(datasourceConfiguration.getProperties());
        String projectId = required(properties, "projectId");
        String projectVersion = required(properties, "projectVersion");
        String metadataSnapshotId = required(properties, "metadataSnapshotId");
        String metadataDigest = required(properties, "metadataDigest");
        String runtimeProviderId = required(properties, "runtimeProviderId");

        if (!SHA_256_DIGEST.matcher(metadataDigest).matches()) {
            throw new IllegalArgumentException("Metadata digest must be a sha256 digest");
        }

        return new OntologyDatasourceConfiguration(
                projectId, projectVersion, metadataSnapshotId, metadataDigest, runtimeProviderId);
    }

    private static Map<String, String> propertiesByKey(List<Property> properties) {
        Map<String, String> values = new LinkedHashMap<>();
        if (properties == null) {
            return values;
        }

        for (Property property : properties) {
            if (property != null && property.getKey() != null && property.getValue() != null) {
                values.put(property.getKey(), String.valueOf(property.getValue()));
            }
        }
        return values;
    }

    private static String required(Map<String, String> properties, String key) {
        String value = properties.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Datasource property is required: " + key);
        }
        return value;
    }
}
