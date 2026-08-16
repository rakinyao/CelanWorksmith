package com.celanworksmith.release;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public final class ReleaseContentCanonicalizer {

    private ReleaseContentCanonicalizer() {}

    public static JsonNode canonicalize(JsonNode value) {
        if (value == null || value.isValueNode() || value.isNull()) {
            return value;
        }
        if (value.isArray()) {
            ArrayNode result = JsonNodeFactory.instance.arrayNode();
            value.forEach(child -> result.add(canonicalize(child)));
            return result;
        }
        ObjectNode result = JsonNodeFactory.instance.objectNode();
        List<String> fieldNames = new ArrayList<>();
        value.fieldNames().forEachRemaining(fieldNames::add);
        fieldNames.sort(Comparator.naturalOrder());
        fieldNames.forEach(fieldName -> result.set(fieldName, canonicalize(value.get(fieldName))));
        return result;
    }
}
