package com.celanworksmith.release.model;

import java.time.Instant;

public record ApplicationReleasePointer(
        String applicationId,
        String activeReleaseId,
        String previousReleaseId,
        String activatedBy,
        Instant activatedAt) {}
