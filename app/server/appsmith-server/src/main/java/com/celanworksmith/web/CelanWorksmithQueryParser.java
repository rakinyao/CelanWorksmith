package com.celanworksmith.web;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class CelanWorksmithQueryParser {
    private static final int DEFAULT_LIMIT = 50;
    private final ObjectMapper objectMapper;

    public CelanWorksmithQueryParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ObjectSetQuery parse(String filter, String sortBy, String sortDirection, String offset, String limit) {
        JsonNode filterNode = null;
        if (filter != null && !filter.isBlank()) {
            try {
                filterNode = objectMapper.readTree(filter);
            } catch (Exception exception) {
                throw new CelanWorksmithException(CelanWorksmithErrorCode.FILTER_INVALID, "filter must be valid JSON");
            }
        }
        return new ObjectSetQuery(filterNode, sortBy, sortDirection == null ? "asc" : sortDirection,
                parseInteger(offset, 0, "offset"), parseInteger(limit, DEFAULT_LIMIT, "limit"));
    }

    private int parseInteger(String value, int fallback, String name) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            throw new CelanWorksmithException(CelanWorksmithErrorCode.INVALID_ARGUMENT, name + " must be an integer");
        }
    }
}
