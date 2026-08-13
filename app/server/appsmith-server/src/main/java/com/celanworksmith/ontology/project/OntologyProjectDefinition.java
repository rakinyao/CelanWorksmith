package com.celanworksmith.ontology.project;

import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.FunctionDTO;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;

import java.util.List;

public record OntologyProjectDefinition(
        String projectId,
        String version,
        int schemaVersion,
        List<ObjectTypeDTO> objectTypes,
        List<LinkTypeDTO> linkTypes,
        List<FunctionDTO> functions,
        List<ActionTypeDTO> actions) {
    public OntologyProjectDefinition {
        objectTypes = List.copyOf(objectTypes);
        linkTypes = List.copyOf(linkTypes);
        functions = List.copyOf(functions);
        actions = List.copyOf(actions);
    }
}
