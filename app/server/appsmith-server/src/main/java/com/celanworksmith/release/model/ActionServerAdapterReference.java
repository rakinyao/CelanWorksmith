package com.celanworksmith.release.model;

public record ActionServerAdapterReference(String adapterId, String adapterVersion, String endpoint) {

    public ActionServerAdapterReference {
        requireNonBlank(adapterId, "adapterId");
        requireNonBlank(adapterVersion, "adapterVersion");
        requireNonBlank(endpoint, "endpoint");
    }

    private static void requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
    }
}
