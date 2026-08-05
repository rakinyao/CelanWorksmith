package com.celanworksmith.runtime.dto;

import java.util.Map;

public record FunctionExecutionRequest(Map<String, Object> parameters) {}
