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
        Instant createdAt) {
    public ApplicationMapResource {
        geoJson = geoJson.clone();
        regionOptions = List.copyOf(regionOptions);
    }

    @Override
    public byte[] geoJson() {
        return geoJson.clone();
    }

    public int regionCount() {
        return regionOptions.size();
    }
}
