package com.celanworksmith.runtime.dto;

import java.util.List;
import java.util.Map;

public record ActionResult(
        boolean success,
        String message,
        String executionId,
        List<ObjectInstanceDTO> changedObjects,
        List<Map<String, Object>> sideEffects) {}
