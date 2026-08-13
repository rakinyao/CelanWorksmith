package com.celanworksmith.runtime.adapter.mongodb;

import org.springframework.data.annotation.Id;

import java.util.LinkedHashMap;
import java.util.Map;

public class MongoRuntimeObjectDocument {
    @Id
    private String id;

    private String typeId;
    private Map<String, Object> properties = new LinkedHashMap<>();

    public MongoRuntimeObjectDocument() {}

    public MongoRuntimeObjectDocument(String id, String typeId, Map<String, Object> properties) {
        this.id = id;
        this.typeId = typeId;
        this.properties = new LinkedHashMap<>(properties == null ? Map.of() : properties);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTypeId() {
        return typeId;
    }

    public void setTypeId(String typeId) {
        this.typeId = typeId;
    }

    public Map<String, Object> getProperties() {
        return properties;
    }

    public void setProperties(Map<String, Object> properties) {
        this.properties = properties;
    }
}
