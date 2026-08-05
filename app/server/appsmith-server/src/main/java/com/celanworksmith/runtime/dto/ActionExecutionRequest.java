package com.celanworksmith.runtime.dto;

import java.util.Map;

public record ActionExecutionRequest(String objectTypeId, String objectId, Map<String, Object> parameters) {}
