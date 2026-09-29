package com.celanworksmith.maps;

import org.springframework.data.annotation.Id;

import java.util.List;

public record ApplicationMapCatalogRecord(
        @Id String id, String name, List<MapGeoJsonValidator.RegionOption> regionOptions) {
    public int regionCount() {
        return regionOptions.size();
    }
}
