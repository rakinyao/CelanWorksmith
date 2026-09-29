package com.celanworksmith.maps;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class MapGeoJsonValidator {
    public static final int MAX_BYTES = 10 * 1024 * 1024;
    public static final int MAX_FEATURES = 10_000;
    public static final int MAX_POSITIONS = 500_000;
    public static final int MAX_REGION_METADATA_BYTES = 1024 * 1024;

    private final ObjectMapper mapper;

    public MapGeoJsonValidator(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public List<RegionOption> validate(byte[] bytes) {
        if (bytes == null || bytes.length == 0 || bytes.length > MAX_BYTES) {
            throw invalid("GeoJSON file is empty or exceeds 10 MiB");
        }
        JsonNode root;
        try {
            root = mapper.readTree(bytes);
        } catch (JsonProcessingException exception) {
            throw invalid("GeoJSON is not valid JSON");
        } catch (java.io.IOException exception) {
            throw invalid("GeoJSON could not be read");
        }
        JsonNode features = root.path("features");
        if (!"FeatureCollection".equals(root.path("type").asText())
                || !features.isArray()
                || features.isEmpty()
                || features.size() > MAX_FEATURES) {
            throw invalid("GeoJSON must be a FeatureCollection with 1 to 10000 features");
        }
        List<RegionOption> regions = new ArrayList<>(features.size());
        Set<String> ids = new HashSet<>();
        int[] positions = {0};
        long metadataBytes = 0;
        for (JsonNode feature : features) {
            if (!"Feature".equals(feature.path("type").asText())) {
                throw invalid("Each item must be a GeoJSON Feature");
            }
            JsonNode properties = feature.path("properties");
            JsonNode id = properties.path("id");
            JsonNode name = properties.path("name");
            if (!id.isTextual()
                    || id.textValue().isBlank()
                    || !ids.add(id.textValue())
                    || !name.isTextual()
                    || name.textValue().isBlank()) {
                throw invalid("Each feature needs a unique string id and a name");
            }
            metadataBytes += id.textValue().getBytes(StandardCharsets.UTF_8).length
                    + name.textValue().getBytes(StandardCharsets.UTF_8).length
                    + 64L;
            if (metadataBytes > MAX_REGION_METADATA_BYTES) {
                throw invalid("GeoJSON region metadata exceeds 1 MiB");
            }
            validateGeometry(feature.path("geometry"), positions);
            regions.add(new RegionOption(name.textValue(), id.textValue()));
        }
        return List.copyOf(regions);
    }

    private void validateGeometry(JsonNode geometry, int[] positions) {
        String type = geometry.path("type").asText();
        JsonNode coordinates = geometry.path("coordinates");
        if (!coordinates.isArray() || coordinates.isEmpty()) {
            throw invalid("Polygon coordinates are required");
        }
        if ("Polygon".equals(type)) {
            validatePolygon(coordinates, positions);
        } else if ("MultiPolygon".equals(type)) {
            for (JsonNode polygon : coordinates) {
                validatePolygon(polygon, positions);
            }
        } else {
            throw invalid("Only Polygon and MultiPolygon are supported");
        }
    }

    private void validatePolygon(JsonNode polygon, int[] positions) {
        if (!polygon.isArray() || polygon.isEmpty()) {
            throw invalid("Polygon must contain a ring");
        }
        for (JsonNode ring : polygon) {
            validateRing(ring, positions);
        }
    }

    private void validateRing(JsonNode ring, int[] positions) {
        if (!ring.isArray() || ring.size() < 4) {
            throw invalid("Polygon rings need at least four positions");
        }
        double[] first = null;
        double[] previous = null;
        double area = 0;
        for (JsonNode position : ring) {
            if (++positions[0] > MAX_POSITIONS) {
                throw invalid("GeoJSON exceeds the coordinate position limit");
            }
            if (!position.isArray()
                    || position.size() != 2
                    || !position.get(0).isNumber()
                    || !position.get(1).isNumber()) {
                throw invalid("Coordinates must be finite 2D numbers");
            }
            double x = position.get(0).doubleValue();
            double y = position.get(1).doubleValue();
            if (!Double.isFinite(x) || !Double.isFinite(y)) {
                throw invalid("Coordinates must be finite 2D numbers");
            }
            double[] current = {x, y};
            if (first == null) {
                first = current;
            }
            if (previous != null) {
                area += previous[0] * y - x * previous[1];
            }
            previous = current;
        }
        if (first[0] != previous[0] || first[1] != previous[1] || !Double.isFinite(area) || area == 0) {
            throw invalid("Polygon rings must be closed and nondegenerate");
        }
    }

    private static IllegalArgumentException invalid(String message) {
        return new IllegalArgumentException(message);
    }

    public record RegionOption(String label, String value) {}
}
