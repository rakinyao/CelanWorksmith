package com.celanworksmith.ontology.release;

import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class OntologyModelReleaseMapper {
    public OntologyProjectDefinition map(OntologyModelRelease release) {
        if (release == null) throw new IllegalArgumentException("Release is required");
        Map<String, OntologyModelRelease.RuntimeBinding> bindings = new HashMap<>();
        List<OntologyModelRelease.EntitySet> entities = new ArrayList<>();
        List<OntologyModelRelease.EntitySetLink> links = new ArrayList<>();
        for (OntologyModelRelease.Element element : release.elements()) {
            if (element instanceof OntologyModelRelease.EntitySet entity) entities.add(entity);
            else if (element instanceof OntologyModelRelease.RuntimeBinding binding) {
                if (bindings.putIfAbsent(binding.entitySet(), binding) != null) {
                    throw new IllegalArgumentException("Release entity has duplicate runtime bindings");
                }
            } else if (element instanceof OntologyModelRelease.EntitySetLink link) links.add(link);
            else if (element instanceof OntologyModelRelease.UnsupportedElement) {
                throw new IllegalArgumentException("Release contains unsupported capabilities");
            }
        }

        List<ObjectTypeDTO> objectTypes = new ArrayList<>();
        List<OntologyProjectDefinition.ObjectRuntimeMapping> objectMappings = new ArrayList<>();
        for (OntologyModelRelease.EntitySet entity : entities) {
            if (entity.primaryKeyFields().size() != 1) {
                throw new IllegalArgumentException("Release composite primary keys are unsupported");
            }
            OntologyModelRelease.RuntimeBinding binding = bindings.get(entity.name());
            if (binding == null) throw new IllegalArgumentException("Release entity has no runtime binding");
            Map<String, ObjectTypeDTO.RuntimePropertyMapping> propertyMappings = new HashMap<>();
            List<PropertyDTO> properties = new ArrayList<>();
            for (OntologyModelRelease.Field field : entity.fields()) {
                OntologyModelRelease.RuntimeFieldMapping runtime =
                        binding.fieldMappings().get(field.name());
                if (runtime == null) throw new IllegalArgumentException("Release field has no runtime mapping");
                propertyMappings.put(
                        field.name(),
                        new ObjectTypeDTO.RuntimePropertyMapping(
                                runtime.column(), runtime.expression(), runtime.status()));
                properties.add(new PropertyDTO(
                        field.name(),
                        localized(field.displayName()),
                        runtimeType(field.type()),
                        entity.primaryKeyFields().contains(field.name()) || !field.nullable(),
                        field.readOnly(),
                        field.derived(),
                        null,
                        null,
                        false,
                        field.enumValues(),
                        field.referenceTarget()));
            }
            String primaryKey = entity.primaryKeyFields().getFirst();
            objectTypes.add(new ObjectTypeDTO(
                    entity.name(),
                    localized(entity.displayName()),
                    binding.assetRef(),
                    primaryKey,
                    properties,
                    propertyMappings));
            objectMappings.add(new OntologyProjectDefinition.ObjectRuntimeMapping(
                    entity.name(), binding.assetRef(), binding.primaryKeyMapping()));
        }

        List<LinkTypeDTO> linkTypes = new ArrayList<>();
        List<OntologyProjectDefinition.LinkRuntimeMapping> linkMappings = new ArrayList<>();
        for (OntologyModelRelease.EntitySetLink link : links) {
            if (!"VERIFIED".equals(link.mappingStatus())) {
                throw new IllegalArgumentException("Release entity links must be VERIFIED");
            }
            List<LinkTypeDTO.FieldMapping> mappings = link.fieldMappings().stream()
                    .map(mapping -> new LinkTypeDTO.FieldMapping(mapping.sourceField(), mapping.destinationField()))
                    .toList();
            linkTypes.add(new LinkTypeDTO(
                    link.name(),
                    link.name(),
                    link.sourceEntitySet(),
                    link.destinationEntitySet(),
                    link.cardinality(),
                    mappings));
            linkMappings.add(new OntologyProjectDefinition.LinkRuntimeMapping(link.name(), mappings));
        }
        return new OntologyProjectDefinition(
                release.release().modelId(),
                release.release().version(),
                2,
                objectTypes,
                linkTypes,
                List.of(),
                List.of(),
                new OntologyProjectDefinition.RuntimeMappings(objectMappings, linkMappings));
    }

    private static String localized(Map<String, String> text) {
        String localized = text.get("zh-CN");
        if (localized == null || localized.isBlank()) localized = text.get("en-US");
        if (localized == null || localized.isBlank())
            throw new IllegalArgumentException("Release display text is unavailable");
        return localized;
    }

    private static String runtimeType(String type) {
        return switch (type.toLowerCase(Locale.ROOT)) {
            case "string" -> "STRING";
            case "integer" -> "INTEGER";
            case "decimal" -> "DECIMAL";
            case "boolean" -> "BOOLEAN";
            case "date" -> "DATE";
            case "timestamp" -> "TIMESTAMP";
            case "json" -> "JSON";
            case "reference" -> "REFERENCE";
            default -> throw new IllegalArgumentException("Release field type is unsupported");
        };
    }
}
