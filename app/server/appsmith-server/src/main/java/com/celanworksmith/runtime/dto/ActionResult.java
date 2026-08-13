package com.celanworksmith.runtime.dto;

import java.util.List;
import java.util.Map;

public record ActionResult(
        boolean success,
        String message,
        String executionId,
        List<ObjectInstanceDTO> changedObjects,
        List<ChangedProperty> changedProperties,
        List<ChangedLink> links,
        List<Map<String, Object>> sideEffects) {

    public record ChangedProperty(String typeId, String objectId, String propertyId, Object value) {}

    public record ChangedLink(String typeId, String objectId, String linkTypeId, String targetTypeId) {}
}
