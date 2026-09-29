package com.celanworksmith.maps;

import org.springframework.data.annotation.Id;

import java.util.List;

public record ApplicationMapCatalogRecord(
        @Id String id, String name, Integer regionCount, List<MapGeoJsonValidator.RegionOption> regionOptions) {
    public ApplicationMapCatalogRecord {
        if (regionCount == null && regionOptions != null) {
            regionCount = regionOptions.size();
        }
    }

    public ApplicationMapCatalogRecord(String id, String name, List<MapGeoJsonValidator.RegionOption> regionOptions) {
        this(id, name, regionOptions.size(), regionOptions);
    }
}
