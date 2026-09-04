package com.celanworksmith.ontology.project;

import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.FunctionDTO;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;

import java.util.List;
import java.util.Map;

public record OntologyProjectDefinition(
        String projectId,
        String version,
        int schemaVersion,
        List<ObjectTypeDTO> objectTypes,
        List<LinkTypeDTO> linkTypes,
        List<FunctionDTO> functions,
        List<ActionTypeDTO> actions,
        RuntimeMappings runtimeMappings) {
    public OntologyProjectDefinition(
            String projectId,
            String version,
            int schemaVersion,
            List<ObjectTypeDTO> objectTypes,
            List<LinkTypeDTO> linkTypes,
            List<FunctionDTO> functions,
            List<ActionTypeDTO> actions) {
        this(projectId, version, schemaVersion, objectTypes, linkTypes, functions, actions, RuntimeMappings.empty());
    }

    public OntologyProjectDefinition {
        objectTypes = List.copyOf(objectTypes);
        linkTypes = List.copyOf(linkTypes);
        functions = List.copyOf(functions);
        actions = List.copyOf(actions);
        runtimeMappings = runtimeMappings == null ? RuntimeMappings.empty() : runtimeMappings;
    }

    public record RuntimeMappings(List<ObjectRuntimeMapping> objectMappings, List<LinkRuntimeMapping> linkMappings) {
        public RuntimeMappings {
            objectMappings = objectMappings == null ? List.of() : List.copyOf(objectMappings);
            linkMappings = linkMappings == null ? List.of() : List.copyOf(linkMappings);
        }

        public static RuntimeMappings empty() {
            return new RuntimeMappings(List.of(), List.of());
        }
    }

    public record ObjectRuntimeMapping(String objectTypeId, String assetRef, Map<String, String> primaryKeyMappings) {
        public ObjectRuntimeMapping {
            primaryKeyMappings = primaryKeyMappings == null ? Map.of() : Map.copyOf(primaryKeyMappings);
        }
    }

    public record LinkRuntimeMapping(String linkTypeId, List<LinkTypeDTO.FieldMapping> fieldMappings) {
        public LinkRuntimeMapping {
            fieldMappings = fieldMappings == null ? List.of() : List.copyOf(fieldMappings);
        }
    }
}
