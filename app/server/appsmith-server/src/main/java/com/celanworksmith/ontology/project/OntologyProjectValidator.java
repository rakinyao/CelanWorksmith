package com.celanworksmith.ontology.project;

import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

public class OntologyProjectValidator {
    public List<String> validate(OntologyProjectDefinition definition) {
        List<String> errors = new ArrayList<>();
        validateUniqueIds(definition.objectTypes(), ObjectTypeDTO::id, "object", errors);
        validateUniqueIds(definition.linkTypes(), LinkTypeDTO::id, "link", errors);
        validateUniqueIds(definition.functions(), function -> function.id(), "function", errors);
        validateUniqueIds(definition.actions(), action -> action.id(), "action", errors);

        Set<String> objectIds = new HashSet<>();
        for (ObjectTypeDTO objectType : definition.objectTypes()) objectIds.add(objectType.id());
        for (LinkTypeDTO linkType : definition.linkTypes()) {
            if (!objectIds.contains(linkType.sourceTypeId())) {
                errors.add("Link " + linkType.id() + " references unknown source object " + linkType.sourceTypeId());
            }
            if (!objectIds.contains(linkType.targetTypeId())) {
                errors.add("Link " + linkType.id() + " references unknown target object " + linkType.targetTypeId());
            }
        }
        return List.copyOf(errors);
    }

    private static <T> void validateUniqueIds(
            List<T> definitions, Function<T, String> id, String type, List<String> errors) {
        Set<String> ids = new HashSet<>();
        for (T definition : definitions) {
            String value = id.apply(definition);
            if (value == null || value.isBlank()) {
                errors.add("" + type + " id is required");
            } else if (!ids.add(value)) {
                errors.add("Duplicate " + type + " id: " + value);
            }
        }
    }
}
