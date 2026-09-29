package com.celanworksmith.maps;

import org.springframework.data.annotation.Id;

import java.time.Instant;
import java.util.List;

public record ApplicationMapResource(
        @Id String id,
        String applicationId,
        String name,
        byte[] geoJson,
        String sha256,
        List<MapGeoJsonValidator.RegionOption> regionOptions,
        Integer regionCount,
        Instant createdAt) {
    public ApplicationMapResource {
        geoJson = geoJson.clone();
        regionOptions = List.copyOf(regionOptions);
        if (regionCount == null) {
            regionCount = regionOptions.size();
        } else if (regionCount != regionOptions.size()) {
            throw new IllegalArgumentException("Region count does not match options");
        }
    }

    public ApplicationMapResource(
            String id,
            String applicationId,
            String name,
            byte[] geoJson,
            String sha256,
            List<MapGeoJsonValidator.RegionOption> regionOptions,
            Instant createdAt) {
        this(id, applicationId, name, geoJson, sha256, regionOptions, regionOptions.size(), createdAt);
    }

    @Override
    public byte[] geoJson() {
        return geoJson.clone();
    }
}
