package com.celanworksmith.ontology.release;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public final class OntologyModelReleaseParser {
    private static final Pattern SEMVER = Pattern.compile(
            "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$");
    private static final Set<String> FIELD_TYPES =
            Set.of("string", "integer", "decimal", "boolean", "date", "timestamp", "json", "reference");
    private static final Set<String> CARDINALITIES = Set.of("ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", "MANY_TO_MANY");
    private static final Set<String> MAPPING_STATUSES = Set.of("INFERRED", "VERIFIED", "REJECTED");
    private static final Set<String> KNOWN_KINDS =
            Set.of("entity_set", "runtime_binding", "entity_set_link", "entity_source", "entity_source_link", "function", "action");
    private static final ObjectMapper CANONICAL_OBJECT_MAPPER = new ObjectMapper();

    private final ObjectMapper objectMapper;

    public OntologyModelReleaseParser() {
        this(new ObjectMapper());
    }

    OntologyModelReleaseParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public OntologyModelRelease parse(byte[] metadata) {
        try {
            JsonNode document = objectMapper.readTree(metadata);
            if (document == null || !document.isObject()) fail("Release JSON must be an object");
            require("ontology-model".equals(text(document, "format")), "Release format is unsupported");
            require(document.path("format_version").isInt() && document.path("format_version").intValue() == 2,
                    "Release format version is unsupported");
            JsonNode releaseNode = object(document, "release", "Release metadata is required");
            OntologyModelRelease.Release release = new OntologyModelRelease.Release(
                    nonblank(releaseNode, "domain", "Release domain is required"),
                    nonblank(releaseNode, "model_id", "Release model ID is required"),
                    semver(releaseNode, "version", "Release version must be strict SemVer"),
                    nonblank(releaseNode, "release_digest", "Release digest is required"));
            JsonNode elementsNode = array(document, "elements", "Release elements are required");

            String digest = "sha256:" + hex(MessageDigest.getInstance("SHA-256").digest(
                    canonicalWithoutDigest(document).getBytes(StandardCharsets.UTF_8)));
            require(digest.equals(release.releaseDigest()), "Release digest does not match content");

            Set<String> identities = new HashSet<>();
            Map<String, OntologyModelRelease.EntitySet> entities = new HashMap<>();
            List<OntologyModelRelease.Element> elements = new ArrayList<>();
            for (JsonNode elementNode : elementsNode) {
                JsonNode elementObject = requireObject(elementNode, "Release elements must be objects");
                String domain = nonblank(elementObject, "domain", "Release element domain is required");
                String kind = nonblank(elementObject, "kind", "Release element kind is required");
                String name = nonblank(elementObject, "name", "Release element name is required");
                String version = semver(elementObject, "version", "Release element version must be strict SemVer");
                require(KNOWN_KINDS.contains(kind), "Release contains an unsupported element kind");
                require(identities.add(domain + '\u0000' + kind + '\u0000' + name), "Release has duplicate element identity");
                OntologyModelRelease.Element element = parseElement(elementObject, domain, kind, name, version);
                elements.add(element);
                if (element instanceof OntologyModelRelease.EntitySet entity) entities.put(domain + '\u0000' + name, entity);
            }
            validateReferences(elements, entities);
            return new OntologyModelRelease("ontology-model", 2, release, elements);
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("Release JSON is invalid", exception);
        }
    }

    private OntologyModelRelease.Element parseElement(
            JsonNode node, String domain, String kind, String name, String version) {
        return switch (kind) {
            case "entity_set" -> parseEntity(node, domain, name, version);
            case "runtime_binding" -> parseRuntimeBinding(node, domain, name, version);
            case "entity_set_link" -> parseLink(node, domain, name, version);
            case "entity_source", "entity_source_link" -> new OntologyModelRelease.LineageElement(domain, kind, name, version);
            default -> {
                fail("Release contains unsupported capabilities");
                yield null;
            }
        };
    }

    private OntologyModelRelease.EntitySet parseEntity(JsonNode node, String domain, String name, String version) {
        JsonNode spec = object(node, "spec", "Release entity spec is required");
        Map<String, String> displayName = localized(object(spec, "display_name", "Release entity display name is required"));
        List<OntologyModelRelease.Field> fields = new ArrayList<>();
        Set<String> fieldNames = new HashSet<>();
        for (JsonNode fieldNode : array(spec, "fields", "Release entity fields are required")) {
            JsonNode field = requireObject(fieldNode, "Release field is invalid");
            String fieldName = nonblank(field, "name", "Release field name is required");
            String type = nonblank(field, "type", "Release field type is required");
            require(FIELD_TYPES.contains(type), "Release field type is unsupported");
            require(fieldNames.add(fieldName), "Release entity has duplicate field");
            fields.add(new OntologyModelRelease.Field(
                    fieldName,
                    type,
                    localized(object(field, "display_name", "Release field display name is required")),
                    field.path("nullable").asBoolean(false),
                    field.path("read_only").asBoolean(false),
                    field.path("derived").asBoolean(false),
                    strings(field.path("enum_values"), "Release enum values are invalid"),
                    optionalText(field, "reference_target")));
        }
        List<String> primaryKeys = strings(array(spec, "primary_key_fields", "Release primary key is required"), "Release primary key is invalid");
        require(!primaryKeys.isEmpty() && new HashSet<>(primaryKeys).size() == primaryKeys.size(), "Release primary key is invalid");
        for (String primaryKey : primaryKeys) require(fieldNames.contains(primaryKey), "Release primary key references an unknown field");
        return new OntologyModelRelease.EntitySet(domain, name, version, displayName, fields, primaryKeys);
    }

    private OntologyModelRelease.RuntimeBinding parseRuntimeBinding(JsonNode node, String domain, String name, String version) {
        JsonNode spec = object(node, "spec", "Release runtime binding spec is required");
        Map<String, String> primaryKeys = stringMap(spec.path("primary_key_mapping"), "Release runtime primary key mapping is invalid");
        Map<String, OntologyModelRelease.RuntimeFieldMapping> mappings = new LinkedHashMap<>();
        JsonNode mappingNode = object(spec, "field_mappings", "Release runtime field mappings are required");
        Iterator<Map.Entry<String, JsonNode>> iterator = mappingNode.fields();
        while (iterator.hasNext()) {
            Map.Entry<String, JsonNode> entry = iterator.next();
            JsonNode mapping = requireObject(entry.getValue(), "Release runtime field mapping is invalid");
            mappings.put(entry.getKey(), new OntologyModelRelease.RuntimeFieldMapping(
                    nonblank(mapping, "column", "Release runtime column is required"),
                    optionalText(mapping, "expression"),
                    optionalText(mapping, "status")));
        }
        return new OntologyModelRelease.RuntimeBinding(
                domain,
                name,
                version,
                nonblank(spec, "entity_set", "Release runtime binding entity is required"),
                nonblank(spec, "asset_ref", "Release runtime asset is required"),
                primaryKeys,
                mappings);
    }

    private OntologyModelRelease.EntitySetLink parseLink(JsonNode node, String domain, String name, String version) {
        JsonNode spec = object(node, "spec", "Release link spec is required");
        String cardinality = nonblank(spec, "cardinality", "Release link cardinality is required");
        String status = nonblank(spec, "mapping_status", "Release link mapping status is required");
        require(CARDINALITIES.contains(cardinality), "Release link cardinality is invalid");
        require(MAPPING_STATUSES.contains(status), "Release link mapping status is invalid");
        List<OntologyModelRelease.LinkFieldMapping> mappings = new ArrayList<>();
        for (JsonNode mapping : array(spec, "field_mappings", "Release link field mappings are required")) {
            JsonNode fieldMapping = requireObject(mapping, "Release link field mapping is invalid");
            mappings.add(new OntologyModelRelease.LinkFieldMapping(
                    nonblank(fieldMapping, "source_field", "Release link source field is required"),
                    nonblank(fieldMapping, "destination_field", "Release link destination field is required")));
        }
        require(!mappings.isEmpty(), "Release link field mappings are required");
        return new OntologyModelRelease.EntitySetLink(
                domain,
                name,
                version,
                nonblank(spec, "source_entity_set", "Release link source entity is required"),
                nonblank(spec, "destination_entity_set", "Release link destination entity is required"),
                cardinality,
                status,
                mappings);
    }

    private static void validateReferences(
            List<OntologyModelRelease.Element> elements, Map<String, OntologyModelRelease.EntitySet> entities) {
        for (OntologyModelRelease.Element element : elements) {
            if (element instanceof OntologyModelRelease.RuntimeBinding binding) {
                OntologyModelRelease.EntitySet entity = entity(entities, binding.domain(), binding.entitySet());
                Set<String> fields = fieldNames(entity);
                require(!binding.primaryKeyMapping().isEmpty(), "Release runtime primary key mapping is required");
                for (String field : binding.primaryKeyMapping().keySet()) require(fields.contains(field), "Release runtime mapping references an unknown field");
                for (String primaryKey : entity.primaryKeyFields()) {
                    require(binding.primaryKeyMapping().containsKey(primaryKey), "Release runtime primary key mapping is incomplete");
                }
                for (String field : binding.fieldMappings().keySet()) require(fields.contains(field), "Release runtime mapping references an unknown field");
            } else if (element instanceof OntologyModelRelease.EntitySetLink link) {
                Set<String> source = fieldNames(entity(entities, link.domain(), link.sourceEntitySet()));
                Set<String> destination = fieldNames(entity(entities, link.domain(), link.destinationEntitySet()));
                for (OntologyModelRelease.LinkFieldMapping mapping : link.fieldMappings()) {
                    require(source.contains(mapping.sourceField()), "Release link references an unknown source field");
                    require(destination.contains(mapping.destinationField()), "Release link references an unknown destination field");
                }
            }
        }
    }

    private static OntologyModelRelease.EntitySet entity(
            Map<String, OntologyModelRelease.EntitySet> entities, String domain, String name) {
        OntologyModelRelease.EntitySet entity = entities.get(domain + '\u0000' + name);
        if (entity == null) fail("Release references an unknown entity");
        return entity;
    }

    private static Set<String> fieldNames(OntologyModelRelease.EntitySet entity) {
        Set<String> fields = new HashSet<>();
        entity.fields().forEach(field -> fields.add(field.name()));
        return fields;
    }

    private static String canonicalWithoutDigest(JsonNode document) {
        JsonNode copy = document.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) copy.path("release")).remove("release_digest");
        return canonical(copy);
    }

    private static String canonical(JsonNode node) {
        if (node.isObject()) {
            List<String> names = new ArrayList<>();
            node.fieldNames().forEachRemaining(names::add);
            names.sort(String::compareTo);
            StringBuilder result = new StringBuilder("{");
            for (int index = 0; index < names.size(); index++) {
                if (index > 0) result.append(',');
                String name = names.get(index);
                result.append(quote(name)).append(':').append(canonical(node.get(name)));
            }
            return result.append('}').toString();
        }
        if (node.isArray()) {
            StringBuilder result = new StringBuilder("[");
            for (int index = 0; index < node.size(); index++) {
                if (index > 0) result.append(',');
                result.append(canonical(node.get(index)));
            }
            return result.append(']').toString();
        }
        if (node.isTextual()) return quote(node.textValue());
        return node.toString();
    }

    private static String quote(String value) {
        try {
            return CANONICAL_OBJECT_MAPPER.writeValueAsString(value);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static String hex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) result.append(String.format("%02x", value));
        return result.toString();
    }

    private static JsonNode object(JsonNode parent, String name, String message) {
        return requireObject(parent.path(name), message);
    }

    private static JsonNode requireObject(JsonNode value, String message) {
        require(value.isObject(), message);
        return value;
    }

    private static JsonNode array(JsonNode parent, String name, String message) {
        JsonNode value = parent.path(name);
        require(value.isArray(), message);
        return value;
    }

    private static Map<String, String> localized(JsonNode value) {
        Map<String, String> texts = stringMap(value, "Release localized text is invalid");
        require(!texts.isEmpty(), "Release localized text is required");
        return texts;
    }

    private static Map<String, String> stringMap(JsonNode value, String message) {
        if (value.isMissingNode() || value.isNull()) return Map.of();
        require(value.isObject(), message);
        Map<String, String> result = new LinkedHashMap<>();
        Iterator<Map.Entry<String, JsonNode>> fields = value.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            require(!field.getKey().isBlank(), message);
            require(field.getValue().isTextual() && !field.getValue().textValue().isBlank(), message);
            result.put(field.getKey(), field.getValue().textValue());
        }
        return result;
    }

    private static List<String> strings(JsonNode value, String message) {
        if (value.isMissingNode() || value.isNull()) return List.of();
        require(value.isArray(), message);
        List<String> result = new ArrayList<>();
        for (JsonNode item : value) {
            require(item.isTextual() && !item.textValue().isBlank(), message);
            result.add(item.textValue());
        }
        return result;
    }

    private static String text(JsonNode node, String name) {
        return node.path(name).isTextual() ? node.path(name).textValue() : null;
    }

    private static String nonblank(JsonNode node, String name, String message) {
        String value = text(node, name);
        require(value != null && !value.isBlank(), message);
        return value;
    }

    private static String semver(JsonNode node, String name, String message) {
        String value = nonblank(node, name, message);
        require(SEMVER.matcher(value).matches(), message);
        return value;
    }

    private static String optionalText(JsonNode node, String name) {
        JsonNode value = node.path(name);
        if (value.isMissingNode() || value.isNull()) return null;
        require(value.isTextual(), "Release field value is invalid");
        return value.textValue();
    }

    private static void require(boolean condition, String message) {
        if (!condition) fail(message);
    }

    private static void fail(String message) {
        throw new IllegalArgumentException(message);
    }
}
