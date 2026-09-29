package com.celanworksmith.maps;

import com.mongodb.reactivestreams.client.MongoClient;
import com.mongodb.reactivestreams.client.MongoClients;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApplicationMapRepositoryTest {
    private MongoClient client;
    private String database;
    private MongoApplicationMapRepository repository;

    @BeforeEach
    void setUp() {
        database = "celanworksmith_map_test_" + UUID.randomUUID().toString().replace("-", "");
        client = MongoClients.create("mongodb://localhost:27017");
        repository = new MongoApplicationMapRepository(new ReactiveMongoTemplate(client, database));
    }

    @AfterEach
    void cleanUp() {
        Mono.from(client.getDatabase(database).drop()).block();
        client.close();
    }

    @Test
    void insertedBytesStayImmutableAndQueriesStayApplicationScoped() {
        ApplicationMapResource first = resource("map-1", "app-1");
        ApplicationMapResource other = resource("map-2", "app-2");
        repository.insert(first).block();
        repository.insert(other).block();

        assertThat(repository.findByApplicationIdAndId("app-1", "map-1").block().geoJson())
                .isEqualTo(first.geoJson());
        assertThat(repository.findByApplicationIdAndId("app-1", "map-2").block())
                .isNull();
        ApplicationMapCatalogRecord catalog =
                repository.findByApplicationId("app-1").next().block();
        assertThat(catalog.regionCount()).isEqualTo(1);
        assertThat(catalog.regionOptions()).isNull();
        org.bson.Document stored = new ReactiveMongoTemplate(client, database)
                .findById("map-1", org.bson.Document.class, "celanworksmith_application_maps")
                .block();
        assertThat(stored.getInteger("regionCount")).isEqualTo(1);
        assertThat(repository
                        .findMetadataByApplicationIdAndId("app-1", "map-1")
                        .block()
                        .regionOptions())
                .containsExactly(new MapGeoJsonValidator.RegionOption("Library", "library"));
        assertThat(repository.findMetadataByApplicationIdAndId("app-1", "map-2").block())
                .isNull();
        assertThatThrownBy(() -> repository.insert(resource("map-1", "app-1")).block())
                .isInstanceOf(RuntimeException.class);
        assertThat(repository.findByApplicationIdAndId("app-1", "map-1").block().name())
                .isEqualTo("Campus");
    }

    private ApplicationMapResource resource(String id, String appId) {
        return new ApplicationMapResource(
                id,
                appId,
                "Campus",
                "{\"type\":\"FeatureCollection\"}".getBytes(StandardCharsets.UTF_8),
                "digest",
                List.of(new MapGeoJsonValidator.RegionOption("Library", "library")),
                Instant.parse("2026-09-29T00:00:00Z"));
    }
}
