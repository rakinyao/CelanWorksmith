package com.celanworksmith.maps;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MapGeoJsonValidatorTest {
    private final MapGeoJsonValidator validator = new MapGeoJsonValidator(new ObjectMapper());

    @Test
    void extractsOrderedRegionsFromTwoPolygons() {
        var regions = validator.validate(
                bytes(collection(feature("b-1", "Library", polygon()), feature("b-2", "Hall", polygon()))));

        assertThat(regions)
                .containsExactly(
                        new MapGeoJsonValidator.RegionOption("Library", "b-1"),
                        new MapGeoJsonValidator.RegionOption("Hall", "b-2"));
    }

    @Test
    void rejectsMalformedAndEmptyCollections() {
        assertInvalid("{".getBytes(StandardCharsets.UTF_8));
        assertInvalid(bytes("{\"type\":\"FeatureCollection\",\"features\":[]}"));
    }

    @Test
    void rejectsMissingAndDuplicateExactStringIdsAndNames() {
        assertInvalid(bytes(collection(feature("", "Library", polygon()))));
        assertInvalid(bytes(collection(feature("x", "", polygon()))));
        assertInvalid(bytes(collection(feature("x", "One", polygon()), feature("x", "Two", polygon()))));
        assertInvalid(bytes(collection(feature("x", "One", polygon()), feature("x", "Two", polygon()))));
        assertInvalid(bytes(collection(
                "{\"type\":\"Feature\",\"properties\":{\"id\":1,\"name\":\"One\"},\"geometry\":" + polygon() + "}")));
    }

    @Test
    void rejectsUnsupportedGeometryAndInvalidCoordinates() {
        assertInvalid(bytes(collection(feature("x", "One", "{\"type\":\"Point\",\"coordinates\":[1,2]}"))));
        assertInvalid(bytes(
                collection(feature("x", "One", "{\"type\":\"Polygon\",\"coordinates\":[[[0,0],[1,0],[1,1],[0,1]]]}"))));
        assertInvalid(
                bytes(collection(feature("x", "One", "{\"type\":\"Polygon\",\"coordinates\":[[[0,0],[1,0],[0,0]]]}"))));
        assertInvalid(bytes(collection(
                feature("x", "One", "{\"type\":\"Polygon\",\"coordinates\":[[[0,0],[1,0],[0,1],[0,0,4]]]}"))));
        assertInvalid(bytes(collection(
                feature("x", "One", "{\"type\":\"Polygon\",\"coordinates\":[[[0,0],[1e400,0],[0,1],[0,0]]]}"))));
    }

    @Test
    void enforcesSizeFeatureAndPositionBounds() {
        assertInvalid(new byte[MapGeoJsonValidator.MAX_BYTES + 1]);
        String repeated = feature("x", "One", polygon()) + ",";
        assertInvalid(bytes("{\"type\":\"FeatureCollection\",\"features\":["
                + repeated.repeat(MapGeoJsonValidator.MAX_FEATURES) + feature("last", "Last", polygon()) + "]}"));
        String ring = "[0,0],".repeat(MapGeoJsonValidator.MAX_POSITIONS) + "[0,0]";
        assertInvalid(
                bytes(collection(feature("x", "One", "{\"type\":\"Polygon\",\"coordinates\":[[" + ring + "]]}"))));
    }

    @Test
    void rejectsMetadataTooLargeForInlineMongoStorage() {
        String label = "a".repeat(1_048_576);
        assertInvalid(bytes(collection(feature("x", label, polygon()))));
    }

    private void assertInvalid(byte[] input) {
        assertThatThrownBy(() -> validator.validate(input)).isInstanceOf(IllegalArgumentException.class);
    }

    private static byte[] bytes(String value) {
        return value.getBytes(StandardCharsets.UTF_8);
    }

    private static String collection(String... features) {
        return "{\"type\":\"FeatureCollection\",\"features\":[" + String.join(",", features) + "]}";
    }

    private static String feature(String id, String name, String geometry) {
        return "{\"type\":\"Feature\",\"properties\":{\"id\":\"" + id + "\",\"name\":\"" + name + "\"},\"geometry\":"
                + geometry + "}";
    }

    private static String polygon() {
        return "{\"type\":\"Polygon\",\"coordinates\":[[[0,0],[2,0],[2,1],[0,1],[0,0]]]}";
    }
}
