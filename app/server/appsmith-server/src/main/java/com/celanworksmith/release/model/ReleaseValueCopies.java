package com.celanworksmith.release.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

final class ReleaseValueCopies {

    private ReleaseValueCopies() {}

    static Map<String, Object> copyMap(Map<String, Object> value) {
        return (Map<String, Object>) copy(value);
    }

    private static Object copy(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<Object, Object> copy = new LinkedHashMap<>();
            map.forEach((key, nestedValue) -> copy.put(key, copy(nestedValue)));
            return Collections.unmodifiableMap(copy);
        }
        if (value instanceof List<?> list) {
            List<Object> copy = new ArrayList<>(list.size());
            list.forEach(nestedValue -> copy.add(copy(nestedValue)));
            return Collections.unmodifiableList(copy);
        }
        if (value instanceof Set<?> set) {
            Set<Object> copy = new LinkedHashSet<>();
            set.forEach(nestedValue -> copy.add(copy(nestedValue)));
            return Collections.unmodifiableSet(copy);
        }
        return value;
    }
}
