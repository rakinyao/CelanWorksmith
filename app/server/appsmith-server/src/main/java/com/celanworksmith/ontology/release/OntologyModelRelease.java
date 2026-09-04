package com.celanworksmith.ontology.release;

import java.util.List;
import java.util.Map;

public record OntologyModelRelease(String format, int formatVersion, Release release, List<Element> elements) {
    public OntologyModelRelease {
        elements = List.copyOf(elements);
    }

    public record Release(String domain, String modelId, String version, String releaseDigest) {}

    public sealed interface Element
            permits EntitySet, RuntimeBinding, EntitySetLink, UnsupportedElement, LineageElement {
        String domain();

        String kind();

        String name();

        String version();
    }

    public record EntitySet(
            String domain,
            String name,
            String version,
            Map<String, String> displayName,
            List<Field> fields,
            List<String> primaryKeyFields)
            implements Element {
        @Override
        public String kind() {
            return "entity_set";
        }

        public EntitySet {
            displayName = Map.copyOf(displayName);
            fields = List.copyOf(fields);
            primaryKeyFields = List.copyOf(primaryKeyFields);
        }
    }

    public record Field(
            String name,
            String type,
            Map<String, String> displayName,
            boolean nullable,
            boolean readOnly,
            boolean derived,
            List<String> enumValues,
            String referenceTarget) {
        public Field {
            displayName = Map.copyOf(displayName);
            enumValues = List.copyOf(enumValues);
        }
    }

    public record RuntimeBinding(
            String domain,
            String name,
            String version,
            String entitySet,
            String assetRef,
            Map<String, String> primaryKeyMapping,
            Map<String, RuntimeFieldMapping> fieldMappings)
            implements Element {
        @Override
        public String kind() {
            return "runtime_binding";
        }

        public RuntimeBinding {
            primaryKeyMapping = Map.copyOf(primaryKeyMapping);
            fieldMappings = Map.copyOf(fieldMappings);
        }
    }

    public record RuntimeFieldMapping(String column, String expression, String status) {}

    public record EntitySetLink(
            String domain,
            String name,
            String version,
            String sourceEntitySet,
            String destinationEntitySet,
            String cardinality,
            String mappingStatus,
            List<LinkFieldMapping> fieldMappings)
            implements Element {
        @Override
        public String kind() {
            return "entity_set_link";
        }

        public EntitySetLink {
            fieldMappings = List.copyOf(fieldMappings);
        }
    }

    public record LinkFieldMapping(String sourceField, String destinationField) {}

    public record UnsupportedElement(String domain, String kind, String name, String version) implements Element {}

    public record LineageElement(String domain, String kind, String name, String version) implements Element {}
}
