package com.celanworksmith.maps;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.domains.Application;
import com.appsmith.server.solutions.ApplicationPermission;
import com.celanworksmith.CelanWorksmithExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationMapControllerTest {
    @Mock
    ApplicationService applications;

    @Mock
    ApplicationPermission permissions;

    @Mock
    ApplicationMapRepository repository;

    private WebTestClient client;
    private byte[] geoJson;

    @BeforeEach
    void setUp() {
        geoJson =
                "{\"type\":\"FeatureCollection\",\"features\":[{\"type\":\"Feature\",\"properties\":{\"id\":\"library\",\"name\":\"Library\"},\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[0,0],[1,0],[0,1],[0,0]]]}}]}"
                        .getBytes(StandardCharsets.UTF_8);
        org.mockito.Mockito.lenient()
                .when(permissions.getEditPermission())
                .thenReturn(AclPermission.MANAGE_APPLICATIONS);
        org.mockito.Mockito.lenient().when(permissions.getReadPermission()).thenReturn(AclPermission.READ_APPLICATIONS);
        var service = new ApplicationMapService(
                applications, permissions, repository, new MapGeoJsonValidator(new ObjectMapper()));
        client = WebTestClient.bindToController(new ApplicationMapController(service))
                .controllerAdvice(new CelanWorksmithExceptionHandler())
                .build();
    }

    @Test
    void editorUploadAndCatalogExposeMetadataWithoutGeometry() {
        allow(AclPermission.MANAGE_APPLICATIONS);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        when(repository.findByApplicationId("app-1")).thenReturn(Flux.empty());

        upload("Campus", geoJson)
                .expectStatus()
                .isCreated()
                .expectHeader()
                .valueEquals("X-Content-Type-Options", "nosniff")
                .expectHeader()
                .valueEquals("Cache-Control", "no-store")
                .expectBody()
                .jsonPath("$.name")
                .isEqualTo("Campus")
                .jsonPath("$.regionCount")
                .isEqualTo(1)
                .jsonPath("$.geoJson")
                .doesNotExist();
        client.get()
                .uri("/api/v1/celanworksmith/applications/app-1/maps")
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .valueEquals("X-Content-Type-Options", "nosniff")
                .expectHeader()
                .valueEquals("Cache-Control", "private, max-age=0, must-revalidate")
                .expectBody()
                .json("[]");
    }

    @Test
    void viewerGetsPrivateJsonAndOrderedMetadata() {
        allow(AclPermission.READ_APPLICATIONS);
        when(repository.findByApplicationIdAndId("app-1", "map-1")).thenReturn(Mono.just(resource()));
        when(repository.findMetadataByApplicationIdAndId("app-1", "map-1"))
                .thenReturn(Mono.just(new ApplicationMapCatalogRecord(
                        "map-1", "Campus", resource().regionOptions())));

        client.get()
                .uri("/api/v1/celanworksmith/applications/app-1/maps/map-1")
                .exchange()
                .expectStatus()
                .isOk()
                .expectHeader()
                .contentType(MediaType.APPLICATION_JSON)
                .expectHeader()
                .valueEquals("X-Content-Type-Options", "nosniff")
                .expectHeader()
                .valueEquals("Cache-Control", "private, max-age=0, must-revalidate")
                .expectBody()
                .jsonPath("$.features[0].properties.id")
                .isEqualTo("library");
        client.get()
                .uri("/api/v1/celanworksmith/applications/app-1/maps/map-1/metadata")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.regionOptions[0].value")
                .isEqualTo("library")
                .jsonPath("$.geoJson")
                .doesNotExist();
    }

    @Test
    void missingOrCrossApplicationIdReturnsNotFound() {
        allow(AclPermission.READ_APPLICATIONS);
        when(repository.findByApplicationIdAndId("app-1", "foreign")).thenReturn(Mono.empty());

        client.get()
                .uri("/api/v1/celanworksmith/applications/app-1/maps/foreign")
                .exchange()
                .expectStatus()
                .isNotFound();
    }

    @Test
    void deniedUploadAndInvalidFileReturnErrorsWithoutPersistence() {
        when(applications.findById("app-1", AclPermission.MANAGE_APPLICATIONS)).thenReturn(Mono.empty());
        upload("Campus", geoJson).expectStatus().isNotFound();
        verify(repository, never()).insert(any());

        allow(AclPermission.MANAGE_APPLICATIONS);
        upload("Campus", new byte[] {'{'}).expectStatus().isBadRequest();
        verify(repository, never()).insert(any());
    }

    private WebTestClient.ResponseSpec upload(String name, byte[] bytes) {
        MultipartBodyBuilder parts = new MultipartBodyBuilder();
        parts.part("name", name);
        parts.part("file", new ByteArrayResource(bytes) {
                    @Override
                    public String getFilename() {
                        return "campus.geojson";
                    }
                })
                .contentType(MediaType.APPLICATION_JSON);
        return client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/maps")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .bodyValue(parts.build())
                .exchange();
    }

    private void allow(AclPermission permission) {
        Application app = new Application();
        app.setId("app-1");
        when(applications.findById("app-1", permission)).thenReturn(Mono.just(app));
    }

    private ApplicationMapResource resource() {
        return new ApplicationMapResource(
                "map-1",
                "app-1",
                "Campus",
                geoJson,
                "abc",
                java.util.List.of(new MapGeoJsonValidator.RegionOption("Library", "library")),
                java.time.Instant.parse("2026-09-29T00:00:00Z"));
    }
}
