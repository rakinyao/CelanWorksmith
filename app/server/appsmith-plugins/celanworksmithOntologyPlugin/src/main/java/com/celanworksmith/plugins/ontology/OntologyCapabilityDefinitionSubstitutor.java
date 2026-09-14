package com.celanworksmith.plugins.ontology;

import com.appsmith.external.helpers.MustacheHelper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class OntologyCapabilityDefinitionSubstitutor {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Pattern WHOLE_BINDING = Pattern.compile("^\\s*\\{\\{\\s*(.*?)\\s*}}\\s*$");

    private OntologyCapabilityDefinitionSubstitutor() {}

    static String substitute(String definition, Map<String, String> parameters) {
        try {
            Map<String, Object> parsed = OBJECT_MAPPER.readValue(definition, new TypeReference<>() {});
            Object targetValue = parsed.get("target");

            if (targetValue instanceof Map<?, ?> rawTarget) {
                Map<String, Object> target = new LinkedHashMap<>();
                rawTarget.forEach((key, value) -> target.put(String.valueOf(key), value));
                substituteObjectId(target, parameters);
                substituteObjectIds(target, parameters);
                parsed.put("target", target);
            }

            return MustacheHelper.render(OBJECT_MAPPER.writeValueAsString(parsed), parameters);
        } catch (Exception exception) {
            throw new IllegalArgumentException("Ontology capability definition could not be evaluated", exception);
        }
    }

    private static void substituteObjectId(Map<String, Object> target, Map<String, String> parameters) {
        if (!(target.get("objectId") instanceof String template)) {
            return;
        }

        Matcher matcher = WHOLE_BINDING.matcher(template);
        if (!matcher.matches()) {
            return;
        }

        String evaluated = parameters.get(matcher.group(1));
        if (evaluated != null) {
            target.put("objectId", evaluated);
        }
    }

    private static void substituteObjectIds(Map<String, Object> target, Map<String, String> parameters)
            throws Exception {
        if (!(target.get("objectIds") instanceof String template)) {
            return;
        }

        Matcher matcher = WHOLE_BINDING.matcher(template);
        if (!matcher.matches()) {
            return;
        }

        String evaluated = parameters.get(matcher.group(1));
        if (evaluated == null) {
            return;
        }

        List<String> objectIds = OBJECT_MAPPER.readValue(evaluated, new TypeReference<>() {});
        target.put("objectIds", objectIds);
    }
}
