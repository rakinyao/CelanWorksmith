package com.celanworksmith.runtime.dto;

import com.celanworksmith.ontology.datasource.OntologyObjectSet;

import java.util.Map;

public record FunctionExecutionRequest(OntologyObjectSet targets, Map<String, Object> parameters) {}
