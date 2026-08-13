package com.celanworksmith.runtime.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record ObjectSetQuery(
        JsonNode filter, String sortBy, String sortDirection, int offset, int limit, String searchText) {
    public ObjectSetQuery(JsonNode filter, String sortBy, String sortDirection, int offset, int limit) {
        this(filter, sortBy, sortDirection, offset, limit, null);
    }

    public static ObjectSetQuery defaults() {
        return new ObjectSetQuery(null, null, "asc", 0, 50, null);
    }
}
