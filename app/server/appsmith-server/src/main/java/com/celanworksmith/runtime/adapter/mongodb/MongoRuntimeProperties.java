package com.celanworksmith.runtime.adapter.mongodb;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "celanworksmith.runtime.mongodb")
public class MongoRuntimeProperties {
    private String uri = "mongodb://localhost:27017";
    private String database = "celanworksmith_runtime";
    private String providerId = "mongodb-readonly";

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

    public String getProviderId() {
        return providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }
}
