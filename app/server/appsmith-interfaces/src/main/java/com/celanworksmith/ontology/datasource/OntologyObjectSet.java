package com.celanworksmith.ontology.datasource;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public record OntologyObjectSet(String objectTypeId, List<String> objectIds) {
    public static final int MAX_TARGET_OBJECTS = 1_000;

    public OntologyObjectSet {
        if (objectTypeId == null || objectTypeId.isBlank()) {
            throw new IllegalArgumentException("Ontology object set requires an object type ID");
        }
        if (objectIds == null || objectIds.isEmpty()) {
            throw new IllegalArgumentException("Ontology object set requires at least one object ID");
        }
        if (objectIds.size() > MAX_TARGET_OBJECTS) {
            throw new IllegalArgumentException(
                    "Ontology object set must not exceed " + MAX_TARGET_OBJECTS + " objects");
        }

        Set<String> uniqueIds = new HashSet<>();
        for (String objectId : objectIds) {
            if (objectId == null || objectId.isBlank()) {
                throw new IllegalArgumentException("Ontology object set contains a blank object ID");
            }
            if (!uniqueIds.add(objectId)) {
                throw new IllegalArgumentException("Ontology object set contains duplicate object IDs");
            }
        }
        objectIds = List.copyOf(objectIds);
    }
}
