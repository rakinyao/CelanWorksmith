package com.celanworksmith.ontology.release;

import java.util.List;
import java.util.Map;

public record OntologyModelRelease(String format, int formatVersion, Release release, List<Element> elements) {
    public OntologyModelRelease {
        elements = List.copyOf(elements);
    }

    public record Release(
            String domain, String modelId, String version, String previousReleaseDigest, String releaseDigest) {
        public Release(String domain, String modelId, String version, String releaseDigest) {
            this(domain, modelId, version, null, releaseDigest);
        }
    }

    public sealed interface Element
            permits EntitySet, RuntimeBinding, EntitySetLink, Function, Action, UnsupportedElement, LineageElement {
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
            String providerKind,
            String assetRef,
            String accessMode,
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

    public record Function(
            String domain,
            String name,
            String version,
            Map<String, String> displayName,
            String returnType,
            List<String> ownerObjectTypeIds,
            boolean sideEffectFree,
            Integer maxItems,
            String implementationKind,
            String implementationRef,
            String implementationVersion)
            implements Element {
        @Override
        public String kind() {
            return "function";
        }

        public Function {
            displayName = Map.copyOf(displayName);
            ownerObjectTypeIds = List.copyOf(ownerObjectTypeIds);
        }
    }

    public record ActionImplementation(String adapterId, String adapterVersion) {}

    public record Action(
            String domain,
            String name,
            String version,
            Map<String, String> displayName,
            List<String> ownerObjectTypeIds,
            int maxItems,
            boolean atomic,
            boolean requiresConfirmation,
            List<Parameter> parameters,
            ActionImplementation implementation)
            implements Element {
        @Override
        public String kind() {
            return "action";
        }

        public Action {
            displayName = Map.copyOf(displayName);
            ownerObjectTypeIds = List.copyOf(ownerObjectTypeIds);
            parameters = List.copyOf(parameters);
            if (implementation == null) throw new IllegalArgumentException("Release Action implementation is required");
        }
    }

    public record Parameter(
            String name,
            String type,
            Map<String, String> displayName,
            Map<String, String> description,
            boolean required,
            boolean readOnly,
            boolean derived,
            List<String> enumValues,
            String referenceTarget) {
        public Parameter {
            displayName = Map.copyOf(displayName);
            description = Map.copyOf(description);
            enumValues = List.copyOf(enumValues);
        }
    }

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
