package com.celanworksmith.runtime.dto;

import java.util.Map;

public record ObjectInstanceDTO(String id, String typeId, Map<String, Object> properties) {}
