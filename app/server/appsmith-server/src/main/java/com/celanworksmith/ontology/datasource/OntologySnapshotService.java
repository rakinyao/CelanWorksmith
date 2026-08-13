package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.FunctionDTO;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import reactor.core.publisher.Mono;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class OntologySnapshotService {
    private static final String LOCAL_YAML = "local-yaml";
    private static final String PLATFORM_RELEASE = "platform-release";
    private static final String DEMO = "demo";

    private final OntologyMetadataSnapshotRepository repository;
    private final Clock clock;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OntologySnapshotService(OntologyMetadataSnapshotRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public Mono<OntologyMetadataSnapshot> createSnapshot(ImportedOntologyProject project) {
        validate(project);
        OntologyProjectDefinition definition = project.definition();
        OntologyMetadataSnapshot snapshot = new OntologyMetadataSnapshot(
                UUID.randomUUID().toString(),
                definition.projectId(),
                definition.version(),
                project.sourceKind(),
                project.sourceReleaseId(),
                project.runtimeProviderId(),
                project.importedBy(),
                clock.instant(),
                digest(definition),
                definition);
        return repository.insert(snapshot);
    }

    public Mono<OntologyMetadataSnapshot> getRequiredSnapshot(String snapshotId, String digest) {
        if (isBlank(snapshotId) || isBlank(digest)) {
            return Mono.error(new IllegalArgumentException("Snapshot ID and metadata digest are required"));
        }

        return repository
                .findById(snapshotId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Ontology metadata snapshot was not found")))
                .filter(snapshot -> digest.equals(snapshot.metadataDigest()))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Ontology metadata digest does not match")));
    }

    private void validate(ImportedOntologyProject project) {
        if (project == null || project.definition() == null) {
            throw new IllegalArgumentException("Imported ontology project definition is required");
        }
        if (!LOCAL_YAML.equals(project.sourceKind())
                && !PLATFORM_RELEASE.equals(project.sourceKind())
                && !DEMO.equals(project.sourceKind())) {
            throw new IllegalArgumentException("Ontology import source is not supported");
        }
        if (isBlank(project.definition().projectId())
                || isBlank(project.definition().version())
                || isBlank(project.runtimeProviderId())
                || isBlank(project.importedBy())) {
            throw new IllegalArgumentException("Ontology project, provider and actor details are required");
        }
    }

    private String digest(OntologyProjectDefinition definition) {
        try {
            byte[] normalized = objectMapper.writeValueAsBytes(canonicalDefinition(definition));
            return "sha256:" + toHex(MessageDigest.getInstance("SHA-256").digest(normalized));
        } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Could not compute ontology metadata digest", exception);
        }
    }

    private Map<String, Object> canonicalDefinition(OntologyProjectDefinition definition) {
        Map<String, Object> canonical = new LinkedHashMap<>();
        canonical.put("projectId", definition.projectId());
        canonical.put("version", definition.version());
        canonical.put("schemaVersion", definition.schemaVersion());
        canonical.put(
                "objectTypes",
                definition.objectTypes().stream()
                        .sorted(Comparator.comparing(ObjectTypeDTO::id))
                        .map(this::canonicalObjectType)
                        .toList());
        canonical.put(
                "linkTypes",
                definition.linkTypes().stream()
                        .sorted(Comparator.comparing(LinkTypeDTO::id))
                        .map(this::canonicalLinkType)
                        .toList());
        canonical.put(
                "functions",
                definition.functions().stream()
                        .sorted(Comparator.comparing(FunctionDTO::id))
                        .map(this::canonicalFunction)
                        .toList());
        canonical.put(
                "actions",
                definition.actions().stream()
                        .sorted(Comparator.comparing(ActionTypeDTO::id))
                        .map(this::canonicalAction)
                        .toList());
        return canonical;
    }

    private Map<String, Object> canonicalObjectType(ObjectTypeDTO objectType) {
        Map<String, Object> canonical = new LinkedHashMap<>();
        canonical.put("id", objectType.id());
        canonical.put("displayName", objectType.displayName());
        canonical.put("runtimeTable", objectType.runtimeTable());
        canonical.put("primaryKey", objectType.primaryKey());
        canonical.put("properties", canonicalProperties(objectType.properties()));
        return canonical;
    }

    private Map<String, Object> canonicalLinkType(LinkTypeDTO linkType) {
        Map<String, Object> canonical = new LinkedHashMap<>();
        canonical.put("id", linkType.id());
        canonical.put("displayName", linkType.displayName());
        canonical.put("sourceTypeId", linkType.sourceTypeId());
        canonical.put("targetTypeId", linkType.targetTypeId());
        canonical.put("cardinality", linkType.cardinality());
        return canonical;
    }

    private Map<String, Object> canonicalFunction(FunctionDTO function) {
        Map<String, Object> canonical = new LinkedHashMap<>();
        canonical.put("id", function.id());
        canonical.put("displayName", function.displayName());
        canonical.put("returnType", function.returnType());
        canonical.put("parameters", canonicalProperties(function.parameters()));
        canonical.put("sideEffectFree", function.sideEffectFree());
        return canonical;
    }

    private Map<String, Object> canonicalAction(ActionTypeDTO action) {
        Map<String, Object> canonical = new LinkedHashMap<>();
        canonical.put("id", action.id());
        canonical.put("displayName", action.displayName());
        canonical.put("objectTypeId", action.objectTypeId());
        canonical.put("parameters", canonicalProperties(action.parameters()));
        canonical.put("requiresConfirmation", action.requiresConfirmation());
        return canonical;
    }

    private List<Map<String, Object>> canonicalProperties(List<PropertyDTO> properties) {
        return properties.stream()
                .sorted(Comparator.comparing(PropertyDTO::id))
                .map(property -> {
                    Map<String, Object> canonical = new LinkedHashMap<>();
                    canonical.put("id", property.id());
                    canonical.put("displayName", property.displayName());
                    canonical.put("dataType", property.dataType());
                    canonical.put("required", property.required());
                    canonical.put("readOnly", property.readOnly());
                    canonical.put("derived", property.derived());
                    canonical.put("group", property.group());
                    canonical.put("order", property.order());
                    canonical.put("hidden", property.hidden());
                    canonical.put("enumValues", property.enumValues());
                    canonical.put("referenceTypeId", property.referenceTypeId());
                    return canonical;
                })
                .toList();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String toHex(byte[] bytes) {
        StringBuilder value = new StringBuilder(bytes.length * 2);
        for (byte current : bytes) {
            value.append(String.format("%02x", current));
        }
        return value.toString();
    }
}
