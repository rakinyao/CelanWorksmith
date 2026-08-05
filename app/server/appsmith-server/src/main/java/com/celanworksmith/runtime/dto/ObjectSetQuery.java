package com.celanworksmith.runtime.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record ObjectSetQuery(JsonNode filter, String sortBy, String sortDirection, int offset, int limit) {
    public static ObjectSetQuery defaults() {
        return new ObjectSetQuery(null, null, "asc", 0, 50);
    }
}
