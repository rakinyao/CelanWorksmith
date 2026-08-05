package com.celanworksmith.runtime.dto;

import java.util.List;

public record ReasoningResult(
        String answer, List<String> evidence, double confidence, long elapsedMs, boolean degraded) {}
