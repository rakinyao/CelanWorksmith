package com.celanworksmith.ontology.persistence;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "celanworksmith.ontology.registry")
public class CelanWorksmithMongoProperties {
    private String uri = "mongodb://localhost:27017";
    private String database = "celanworksmith_ontology";

    public String getUri() {
        return uri;
    }

    public void setUri(String uri) {
        this.uri = uri;
    }

    public String getDatabase() {
        return database;
    }

    public void setDatabase(String database) {
        this.database = database;
    }
}
