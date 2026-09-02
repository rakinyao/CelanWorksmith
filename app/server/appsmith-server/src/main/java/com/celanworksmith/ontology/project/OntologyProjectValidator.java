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
        definition
                .functions()
                .forEach(function ->
                        validateOwners("Function", function.id(), function.ownerObjectTypeIds(), objectIds, errors));
        definition
                .actions()
                .forEach(action ->
                        validateOwners("Action", action.id(), action.ownerObjectTypeIds(), objectIds, errors));
        return List.copyOf(errors);
    }

    private static void validateOwners(
            String definitionType,
            String definitionId,
            List<String> ownerObjectTypeIds,
            Set<String> objectIds,
            List<String> errors) {
        if (ownerObjectTypeIds == null || ownerObjectTypeIds.isEmpty()) {
            errors.add(definitionType + " " + definitionId + " must declare at least one owner object type");
            return;
        }

        Set<String> owners = new HashSet<>();
        for (String ownerObjectTypeId : ownerObjectTypeIds) {
            if (ownerObjectTypeId == null || ownerObjectTypeId.isBlank()) {
                errors.add(definitionType + " " + definitionId + " has a blank owner object type");
            } else if (!owners.add(ownerObjectTypeId)) {
                errors.add(definitionType + " " + definitionId + " has a duplicate owner object type: "
                        + ownerObjectTypeId);
            } else if (!objectIds.contains(ownerObjectTypeId)) {
                errors.add(
                        definitionType + " " + definitionId + " references unknown owner object " + ownerObjectTypeId);
            }
        }
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
