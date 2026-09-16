package com.celanworksmith.ontology.release;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.erdtman.jcs.JsonCanonicalizer;

import java.security.MessageDigest;
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
    private static final Pattern SEMVER = Pattern.compile("^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)"
            + "(?:-(?:0|[1-9]\\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)"
            + "(?:\\.(?:0|[1-9]\\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?"
            + "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$");
    private static final Set<String> FIELD_TYPES =
            Set.of("string", "integer", "decimal", "boolean", "date", "timestamp", "json", "reference");
    private static final Set<String> CARDINALITIES = Set.of("ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", "MANY_TO_MANY");
    private static final Set<String> MAPPING_STATUSES = Set.of("INFERRED", "VERIFIED", "REJECTED");
    private static final Set<String> KNOWN_KINDS = Set.of(
            "entity_set",
            "runtime_binding",
            "entity_set_link",
            "entity_source",
            "entity_source_link",
            "function",
            "action");
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
            // JCS parsing rejects duplicate JSON member names before Jackson can collapse them.
            new JsonCanonicalizer(metadata);
            JsonNode document = objectMapper.readTree(metadata);
            if (document == null || !document.isObject()) fail("Release JSON must be an object");
            requireOnlyKeys(document, Set.of("format", "format_version", "release", "elements"), "Release envelope");
            require("ontology-model".equals(text(document, "format")), "Release format is unsupported");
            require(
                    document.path("format_version").isInt()
                            && document.path("format_version").intValue() == 2,
                    "Release format version is unsupported");
            JsonNode releaseNode = object(document, "release", "Release metadata is required");
            requireOnlyKeys(
                    releaseNode,
                    Set.of(
                            "domain",
                            "model_id",
                            "version",
                            "previous_release_digest",
                            "released_at",
                            "release_digest",
                            "change_set"),
                    "Release metadata");
            validateChangeSet(object(releaseNode, "change_set", "Release change set is required"));
            OntologyModelRelease.Release release = new OntologyModelRelease.Release(
                    nonblank(releaseNode, "domain", "Release domain is required"),
                    nonblank(releaseNode, "model_id", "Release model ID is required"),
                    semver(releaseNode, "version", "Release version must be strict SemVer"),
                    optionalText(releaseNode, "previous_release_digest"),
                    nonblank(releaseNode, "release_digest", "Release digest is required"));
            JsonNode elementsNode = array(document, "elements", "Release elements are required");

            String digest =
                    "sha256:" + hex(MessageDigest.getInstance("SHA-256").digest(canonicalWithoutDigest(document)));
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
                requireOnlyKeys(elementObject, Set.of("domain", "kind", "name", "version", "spec"), "Release element");
                require(release.domain().equals(domain), "Release element domain must match the release domain");
                require(KNOWN_KINDS.contains(kind), "Release contains an unsupported element kind");
                require(
                        identities.add(domain + '\u0000' + kind + '\u0000' + name),
                        "Release has duplicate element identity");
                OntologyModelRelease.Element element = parseElement(elementObject, domain, kind, name, version);
                elements.add(element);
                if (element instanceof OntologyModelRelease.EntitySet entity)
                    entities.put(domain + '\u0000' + name, entity);
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
            case "function" -> parseFunction(node, domain, name, version);
            case "action" -> parseAction(node, domain, name, version);
            case "entity_source", "entity_source_link" -> parseLineage(node, domain, kind, name, version);
            default -> {
                fail("Release contains unsupported capabilities");
                yield null;
            }
        };
    }

    private OntologyModelRelease.Function parseFunction(JsonNode node, String domain, String name, String version) {
        JsonNode spec = object(node, "spec", "Release function spec is required");
        requireOnlyKeys(
                spec,
                Set.of(
                        "display_name",
                        "owner_object_type_ids",
                        "return_type",
                        "side_effect_free",
                        "target",
                        "implementation"),
                "Release function spec");
        Map<String, String> displayName =
                localized(object(spec, "display_name", "Release function display name is required"));
        List<String> owners = strings(
                array(spec, "owner_object_type_ids", "Release function owners are required"),
                "Release function owners are invalid");
        require(!owners.isEmpty(), "Release function owners are required");
        String returnType = nonblank(spec, "return_type", "Release function return type is required");
        JsonNode sideEffectFree = spec.path("side_effect_free");
        require(sideEffectFree.isBoolean(), "Release function side_effect_free is required");
        require(sideEffectFree.asBoolean(), "Release functions must be side-effect free");

        JsonNode target = object(spec, "target", "Release function target is required");
        requireOnlyKeys(target, Set.of("max_items"), "Release function target");
        JsonNode maxItems = target.path("max_items");
        require(maxItems.isIntegralNumber() && maxItems.canConvertToInt(), "Release function max_items is invalid");
        require(maxItems.intValue() > 0, "Release function max_items must be positive");

        JsonNode implementation = object(spec, "implementation", "Release function implementation is required");
        requireOnlyKeys(implementation, Set.of("kind", "ref", "version"), "Release function implementation");
        String implementationKind =
                nonblank(implementation, "kind", "Release function implementation kind is required");
        require("DEMO_HANDLER".equals(implementationKind), "Release function implementation kind is unsupported");
        String implementationRef = nonblank(implementation, "ref", "Release function implementation ref is required");
        String implementationVersion =
                semver(implementation, "version", "Release function implementation version must be strict SemVer");
        return new OntologyModelRelease.Function(
                domain,
                name,
                version,
                displayName,
                returnType,
                owners,
                true,
                maxItems.intValue(),
                implementationKind,
                implementationRef,
                implementationVersion);
    }

    private OntologyModelRelease.Action parseAction(JsonNode node, String domain, String name, String version) {
        JsonNode spec = object(node, "spec", "Release Action spec is required");
        requireOnlyKeys(
                spec,
                Set.of(
                        "display_name",
                        "owner_object_type_ids",
                        "target",
                        "atomic",
                        "requires_confirmation",
                        "parameters",
                        "implementation"),
                "Release Action spec");
        Map<String, String> displayName =
                localized(object(spec, "display_name", "Release Action display name is required"));
        List<String> owners = strings(
                array(spec, "owner_object_type_ids", "Release Action owners are required"),
                "Release Action owners are invalid");
        require(!owners.isEmpty(), "Release Action owners are required");

        JsonNode target = object(spec, "target", "Release Action target is required");
        requireOnlyKeys(target, Set.of("max_items"), "Release Action target");
        JsonNode maxItems = target.path("max_items");
        require(maxItems.isIntegralNumber() && maxItems.canConvertToInt(), "Release Action max_items is invalid");
        require(maxItems.intValue() > 0, "Release Action max_items must be positive");

        JsonNode atomicNode = spec.path("atomic");
        require(atomicNode.isBoolean(), "Release Action atomic is required");
        JsonNode confirmationNode = spec.path("requires_confirmation");
        require(confirmationNode.isBoolean(), "Release Action requires_confirmation is required");

        JsonNode implementation = object(spec, "implementation", "Release Action implementation is required");
        requireOnlyKeys(implementation, Set.of("adapter_id", "adapter_version"), "Release Action implementation");
        String adapterId =
                nonblank(implementation, "adapter_id", "Release Action implementation adapter ID is required");
        String adapterVersion = semver(
                implementation,
                "adapter_version",
                "Release Action implementation adapter version must be strict SemVer");

        List<OntologyModelRelease.Parameter> parameters = new ArrayList<>();
        Set<String> parameterNames = new HashSet<>();
        for (JsonNode parameterNode : array(spec, "parameters", "Release Action parameters are required")) {
            JsonNode parameter = requireObject(parameterNode, "Release Action parameter is invalid");
            requireOnlyKeys(
                    parameter,
                    Set.of(
                            "name",
                            "type",
                            "display_name",
                            "description",
                            "required",
                            "read_only",
                            "derived",
                            "enum_values",
                            "reference_target"),
                    "Release Action parameter");
            String parameterName = nonblank(parameter, "name", "Release Action parameter name is required");
            require(parameterNames.add(parameterName), "Release Action has duplicate parameter");
            String type = nonblank(parameter, "type", "Release Action parameter type is required");
            require(FIELD_TYPES.contains(type), "Release Action parameter type is unsupported");
            Map<String, String> parameterDisplayName =
                    localized(object(parameter, "display_name", "Release Action parameter display name is required"));
            Map<String, String> description =
                    localized(object(parameter, "description", "Release Action parameter description is required"));
            JsonNode required = parameter.path("required");
            JsonNode readOnly = parameter.path("read_only");
            JsonNode derived = parameter.path("derived");
            require(required.isBoolean(), "Release Action parameter required is required");
            require(readOnly.isBoolean(), "Release Action parameter read_only is required");
            require(derived.isBoolean(), "Release Action parameter derived is required");
            parameters.add(new OntologyModelRelease.Parameter(
                    parameterName,
                    type,
                    parameterDisplayName,
                    description,
                    required.asBoolean(),
                    readOnly.asBoolean(),
                    derived.asBoolean(),
                    strings(parameter.path("enum_values"), "Release Action parameter enum values are invalid"),
                    optionalText(parameter, "reference_target")));
        }
        return new OntologyModelRelease.Action(
                domain,
                name,
                version,
                displayName,
                owners,
                maxItems.intValue(),
                atomicNode.asBoolean(),
                confirmationNode.asBoolean(),
                parameters,
                new OntologyModelRelease.ActionImplementation(adapterId, adapterVersion));
    }

    private OntologyModelRelease.EntitySet parseEntity(JsonNode node, String domain, String name, String version) {
        JsonNode spec = object(node, "spec", "Release entity spec is required");
        requireOnlyKeys(
                spec,
                Set.of("display_name", "description", "fields", "primary_key_fields", "properties", "source_table"),
                "Release entity spec");
        validateProperties(
                spec.path("properties"),
                Set.of("semantic_description", "semantic_description_source", "semantic_display_name"),
                "Release entity properties");
        Map<String, String> displayName =
                localized(object(spec, "display_name", "Release entity display name is required"));
        List<OntologyModelRelease.Field> fields = new ArrayList<>();
        Set<String> fieldNames = new HashSet<>();
        for (JsonNode fieldNode : array(spec, "fields", "Release entity fields are required")) {
            JsonNode field = requireObject(fieldNode, "Release field is invalid");
            requireOnlyKeys(
                    field,
                    Set.of(
                            "name",
                            "type",
                            "display_name",
                            "description",
                            "properties",
                            "nullable",
                            "read_only",
                            "derived",
                            "enum_values",
                            "reference_target"),
                    "Release field");
            validateProperties(
                    field.path("properties"),
                    Set.of("semantic_description_source", "semantic_role", "source", "source_column"),
                    "Release field properties");
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
        List<String> primaryKeys = strings(
                array(spec, "primary_key_fields", "Release primary key is required"), "Release primary key is invalid");
        require(
                !primaryKeys.isEmpty() && new HashSet<>(primaryKeys).size() == primaryKeys.size(),
                "Release primary key is invalid");
        require(primaryKeys.size() == 1, "Release composite primary keys are unsupported");
        for (String primaryKey : primaryKeys)
            require(fieldNames.contains(primaryKey), "Release primary key references an unknown field");
        return new OntologyModelRelease.EntitySet(domain, name, version, displayName, fields, primaryKeys);
    }

    private OntologyModelRelease.RuntimeBinding parseRuntimeBinding(
            JsonNode node, String domain, String name, String version) {
        JsonNode spec = object(node, "spec", "Release runtime binding spec is required");
        requireOnlyKeys(
                spec,
                Set.of(
                        "entity_set",
                        "provider_kind",
                        "asset_ref",
                        "access_mode",
                        "primary_key_mapping",
                        "field_mappings"),
                "Release runtime binding");
        Map<String, String> primaryKeys =
                stringMap(spec.path("primary_key_mapping"), "Release runtime primary key mapping is invalid");
        Map<String, OntologyModelRelease.RuntimeFieldMapping> mappings = new LinkedHashMap<>();
        JsonNode mappingNode = object(spec, "field_mappings", "Release runtime field mappings are required");
        Iterator<Map.Entry<String, JsonNode>> iterator = mappingNode.fields();
        while (iterator.hasNext()) {
            Map.Entry<String, JsonNode> entry = iterator.next();
            JsonNode mapping = requireObject(entry.getValue(), "Release runtime field mapping is invalid");
            requireOnlyKeys(mapping, Set.of("column", "expression", "status"), "Release runtime field mapping");
            mappings.put(
                    entry.getKey(),
                    new OntologyModelRelease.RuntimeFieldMapping(
                            nonblank(mapping, "column", "Release runtime column is required"),
                            optionalText(mapping, "expression"),
                            optionalText(mapping, "status")));
        }
        return new OntologyModelRelease.RuntimeBinding(
                domain,
                name,
                version,
                nonblank(spec, "entity_set", "Release runtime binding entity is required"),
                nonblank(spec, "provider_kind", "Release runtime provider kind is required"),
                nonblank(spec, "asset_ref", "Release runtime asset is required"),
                nonblank(spec, "access_mode", "Release runtime access mode is required"),
                primaryKeys,
                mappings);
    }

    private OntologyModelRelease.EntitySetLink parseLink(JsonNode node, String domain, String name, String version) {
        JsonNode spec = object(node, "spec", "Release link spec is required");
        requireOnlyKeys(
                spec,
                Set.of(
                        "source_entity_set",
                        "destination_entity_set",
                        "cardinality",
                        "mapping_status",
                        "confidence",
                        "entity_link_type",
                        "source_fields_mapping",
                        "field_mappings"),
                "Release entity link");
        String cardinality = nonblank(spec, "cardinality", "Release link cardinality is required");
        String status = nonblank(spec, "mapping_status", "Release link mapping status is required");
        require(CARDINALITIES.contains(cardinality), "Release link cardinality is invalid");
        require(MAPPING_STATUSES.contains(status), "Release link mapping status is invalid");
        if (!spec.path("source_fields_mapping").isMissingNode()) {
            stringMap(spec.path("source_fields_mapping"), "Release link source field mappings are invalid");
        }
        List<OntologyModelRelease.LinkFieldMapping> mappings = new ArrayList<>();
        for (JsonNode mapping : array(spec, "field_mappings", "Release link field mappings are required")) {
            JsonNode fieldMapping = requireObject(mapping, "Release link field mapping is invalid");
            requireOnlyKeys(fieldMapping, Set.of("source_field", "destination_field"), "Release link field mapping");
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

    private OntologyModelRelease.LineageElement parseLineage(
            JsonNode node, String domain, String kind, String name, String version) {
        JsonNode spec = object(node, "spec", "Release lineage spec is required");
        if ("entity_source".equals(kind)) validateEntitySourceSpec(spec);
        else validateEntitySourceLinkSpec(spec);
        return new OntologyModelRelease.LineageElement(domain, kind, name, version);
    }

    private static void validateEntitySourceSpec(JsonNode spec) {
        requireOnlyKeys(spec, Set.of("constructor", "storages"), "Release entity source");
        JsonNode constructor = object(spec, "constructor", "Release entity source constructor is required");
        requireOnlyKeys(
                constructor, Set.of("dataset", "mode", "source_id", "type"), "Release entity source constructor");
        for (JsonNode storageNode : array(spec, "storages", "Release entity source storages are required")) {
            JsonNode storage = requireObject(storageNode, "Release entity source storage is invalid");
            requireOnlyKeys(
                    storage,
                    Set.of("dataset", "field_mappings", "schema", "source_id", "table"),
                    "Release entity source storage");
            JsonNode mappings = object(storage, "field_mappings", "Release entity source mappings are required");
            Iterator<Map.Entry<String, JsonNode>> entityMappings = mappings.fields();
            while (entityMappings.hasNext()) {
                Map.Entry<String, JsonNode> entityMapping = entityMappings.next();
                JsonNode fields = requireObject(entityMapping.getValue(), "Release entity source mappings are invalid");
                Iterator<Map.Entry<String, JsonNode>> fieldMappings = fields.fields();
                while (fieldMappings.hasNext()) {
                    JsonNode fieldMapping = requireObject(
                            fieldMappings.next().getValue(), "Release entity source field mapping is invalid");
                    requireOnlyKeys(
                            fieldMapping,
                            Set.of("column", "expression", "status"),
                            "Release entity source field mapping");
                }
            }
        }
    }

    private static void validateEntitySourceLinkSpec(JsonNode spec) {
        requireOnlyKeys(spec, Set.of("src", "dest", "field_mappings", "mapping_status"), "Release entity source link");
        validateReference(object(spec, "src", "Release entity source link source is required"));
        validateReference(object(spec, "dest", "Release entity source link destination is required"));
        stringMap(
                object(spec, "field_mappings", "Release entity source link mappings are required"),
                "Release entity source link mappings are invalid");
        nonblank(spec, "mapping_status", "Release entity source link status is required");
    }

    private static void validateReference(JsonNode reference) {
        requireOnlyKeys(reference, Set.of("domain", "kind", "name"), "Release lineage reference");
        nonblank(reference, "domain", "Release lineage reference domain is required");
        nonblank(reference, "kind", "Release lineage reference kind is required");
        nonblank(reference, "name", "Release lineage reference name is required");
    }

    private static void validateReferences(
            List<OntologyModelRelease.Element> elements, Map<String, OntologyModelRelease.EntitySet> entities) {
        for (OntologyModelRelease.Element element : elements) {
            if (element instanceof OntologyModelRelease.RuntimeBinding binding) {
                OntologyModelRelease.EntitySet entity = entity(entities, binding.domain(), binding.entitySet());
                Set<String> fields = fieldNames(entity);
                require(!binding.primaryKeyMapping().isEmpty(), "Release runtime primary key mapping is required");
                for (String field : binding.primaryKeyMapping().keySet())
                    require(fields.contains(field), "Release runtime mapping references an unknown field");
                for (String primaryKey : entity.primaryKeyFields()) {
                    require(
                            binding.primaryKeyMapping().containsKey(primaryKey),
                            "Release runtime primary key mapping is incomplete");
                }
                for (String field : binding.fieldMappings().keySet())
                    require(fields.contains(field), "Release runtime mapping references an unknown field");
            } else if (element instanceof OntologyModelRelease.EntitySetLink link) {
                Set<String> source = fieldNames(entity(entities, link.domain(), link.sourceEntitySet()));
                Set<String> destination = fieldNames(entity(entities, link.domain(), link.destinationEntitySet()));
                for (OntologyModelRelease.LinkFieldMapping mapping : link.fieldMappings()) {
                    require(source.contains(mapping.sourceField()), "Release link references an unknown source field");
                    require(
                            destination.contains(mapping.destinationField()),
                            "Release link references an unknown destination field");
                }
            } else if (element instanceof OntologyModelRelease.Function function) {
                for (String owner : function.ownerObjectTypeIds()) {
                    require(
                            entities.containsKey(function.domain() + '\u0000' + owner),
                            "Release function references an unknown owner object type");
                }
            } else if (element instanceof OntologyModelRelease.Action action) {
                for (String owner : action.ownerObjectTypeIds()) {
                    require(
                            entities.containsKey(action.domain() + '\u0000' + owner),
                            "Release Action references an unknown owner object type");
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

    private void validateChangeSet(JsonNode changeSet) {
        requireOnlyKeys(changeSet, Set.of("compatibility", "changes"), "Release change set");
        String compatibility = nonblank(changeSet, "compatibility", "Release compatibility is required");
        require(
                Set.of("INITIAL", "BACKWARD_COMPATIBLE", "BREAKING").contains(compatibility),
                "Release compatibility is invalid");
        array(changeSet, "changes", "Release changes are required");
    }

    private static byte[] canonicalWithoutDigest(JsonNode document) throws java.io.IOException {
        JsonNode copy = document.deepCopy();
        ((com.fasterxml.jackson.databind.node.ObjectNode) copy.path("release")).remove("release_digest");
        return new JsonCanonicalizer(CANONICAL_OBJECT_MAPPER.writeValueAsBytes(copy)).getEncodedUTF8();
    }

    private static void requireOnlyKeys(JsonNode object, Set<String> allowedKeys, String context) {
        Iterator<String> fields = object.fieldNames();
        while (fields.hasNext()) {
            if (!allowedKeys.contains(fields.next())) fail(context + " contains an unknown field");
        }
    }

    private static void validateProperties(JsonNode properties, Set<String> allowedKeys, String context) {
        if (properties.isMissingNode() || properties.isNull()) return;
        require(properties.isObject(), context + " is invalid");
        requireOnlyKeys(properties, allowedKeys, context);
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
            require(
                    field.getValue().isTextual()
                            && !field.getValue().textValue().isBlank(),
                    message);
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
