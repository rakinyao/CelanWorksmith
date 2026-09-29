package com.celanworksmith.maps;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.domains.Application;
import com.appsmith.server.solutions.ApplicationPermission;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationMapServiceTest {
    @Mock
    ApplicationService applications;

    @Mock
    ApplicationPermission permissions;

    @Mock
    ApplicationMapRepository repository;

    private ApplicationMapService service;
    private byte[] geoJson;

    @BeforeEach
    void setUp() {
        service = new ApplicationMapService(
                applications, permissions, repository, new MapGeoJsonValidator(new ObjectMapper()));
        geoJson =
                "{\"type\":\"FeatureCollection\",\"features\":[{\"type\":\"Feature\",\"properties\":{\"id\":\"library\",\"name\":\"Library\"},\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[0,0],[1,0],[0,1],[0,0]]]}}]}"
                        .getBytes(StandardCharsets.UTF_8);
        org.mockito.Mockito.lenient()
                .when(permissions.getEditPermission())
                .thenReturn(AclPermission.MANAGE_APPLICATIONS);
        org.mockito.Mockito.lenient().when(permissions.getReadPermission()).thenReturn(AclPermission.READ_APPLICATIONS);
    }

    @Test
    void createsImmutableResourceWithOpaqueIdAndDigest() {
        allow(AclPermission.MANAGE_APPLICATIONS);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

        ApplicationMapResource created =
                service.create("app-1", "Campus", geoJson).block();

        assertThat(created.id()).matches("[0-9a-f-]{36}");
        assertThat(created.applicationId()).isEqualTo("app-1");
        assertThat(created.name()).isEqualTo("Campus");
        assertThat(created.sha256()).matches("[0-9a-f]{64}");
        assertThat(created.regionOptions()).containsExactly(new MapGeoJsonValidator.RegionOption("Library", "library"));
        geoJson[0] = 0;
        assertThat(created.geoJson()[0]).isEqualTo((byte) '{');
        byte[] returned = created.geoJson();
        returned[0] = 0;
        assertThat(created.geoJson()[0]).isEqualTo((byte) '{');
    }

    @Test
    void deniedEditorCannotUploadOrList() {
        when(applications.findById("app-1", AclPermission.MANAGE_APPLICATIONS)).thenReturn(Mono.empty());

        assertThatThrownBy(() -> service.create("app-1", "Campus", geoJson).block())
                .isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> service.list("app-1").collectList().block()).isInstanceOf(RuntimeException.class);
        verify(repository, never()).insert(any());
        verify(repository, never()).findByApplicationId(any());
    }

    @Test
    void viewerCanGetScopedResourceAndMetadataButCannotListCatalog() {
        allow(AclPermission.READ_APPLICATIONS);
        ApplicationMapResource resource = resource("app-1", "map-1");
        when(repository.findByApplicationIdAndId("app-1", "map-1")).thenReturn(Mono.just(resource));
        when(repository.findMetadataByApplicationIdAndId("app-1", "map-1"))
                .thenReturn(Mono.just(new ApplicationMapCatalogRecord("map-1", "Campus", resource.regionOptions())));
        when(applications.findById("app-1", AclPermission.MANAGE_APPLICATIONS)).thenReturn(Mono.empty());

        assertThat(service.get("app-1", "map-1").block()).isEqualTo(resource);
        assertThat(service.metadata("app-1", "map-1").block().regionOptions())
                .containsExactly(new MapGeoJsonValidator.RegionOption("Library", "library"));
        assertThatThrownBy(() -> service.list("app-1").collectList().block()).isInstanceOf(RuntimeException.class);
    }

    @Test
    void cannotReadResourceFromAnotherApplicationOrUnknownId() {
        allow(AclPermission.READ_APPLICATIONS);
        when(repository.findByApplicationIdAndId("app-1", "foreign")).thenReturn(Mono.empty());

        assertThatThrownBy(() -> service.get("app-1", "foreign").block()).isInstanceOf(RuntimeException.class);
        verify(repository).findByApplicationIdAndId("app-1", "foreign");
    }

    @Test
    void invalidNameAndGeoJsonNeverPersist() {
        allow(AclPermission.MANAGE_APPLICATIONS);
        assertThatThrownBy(() -> service.create("app-1", " ", geoJson).block())
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() ->
                        service.create("app-1", "Campus", new byte[] {'{'}).block())
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).insert(any());
    }

    private void allow(AclPermission permission) {
        Application app = new Application();
        app.setId("app-1");
        when(applications.findById("app-1", permission)).thenReturn(Mono.just(app));
    }

    private ApplicationMapResource resource(String appId, String id) {
        return new ApplicationMapResource(
                id,
                appId,
                "Campus",
                geoJson,
                "abc",
                java.util.List.of(new MapGeoJsonValidator.RegionOption("Library", "library")),
                java.time.Instant.parse("2026-09-29T00:00:00Z"));
    }
}
