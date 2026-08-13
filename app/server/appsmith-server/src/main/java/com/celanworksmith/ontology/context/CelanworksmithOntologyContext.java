package com.celanworksmith.ontology.context;

public record CelanworksmithOntologyContext(String applicationId, boolean legacyDefault) {
    public static CelanworksmithOntologyContext legacy() {
        return new CelanworksmithOntologyContext(null, true);
    }
}
