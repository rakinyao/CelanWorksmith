package com.celanworksmith.runtime.context;

public record CelanworksmithRuntimeContext(String applicationId, boolean legacyDefault) {
    public static CelanworksmithRuntimeContext legacy() {
        return new CelanworksmithRuntimeContext(null, true);
    }
}
