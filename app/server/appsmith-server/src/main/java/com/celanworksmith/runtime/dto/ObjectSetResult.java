package com.celanworksmith.runtime.dto;

import java.util.List;

public record ObjectSetResult(String typeId, List<ObjectInstanceDTO> items, int offset, int limit, long total) {}
