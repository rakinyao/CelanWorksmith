package com.celanworksmith.maps;

import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.solutions.ApplicationPermission;
import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import org.springframework.core.io.buffer.DataBufferLimitException;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.codec.multipart.Part;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class ApplicationMapService {
    private final ApplicationService applications;
    private final ApplicationPermission permissions;
    private final ApplicationMapRepository repository;
    private final MapGeoJsonValidator validator;

    public ApplicationMapService(
            ApplicationService applications,
            ApplicationPermission permissions,
            ApplicationMapRepository repository,
            MapGeoJsonValidator validator) {
        this.applications = applications;
        this.permissions = permissions;
        this.repository = repository;
        this.validator = validator;
    }

    public Mono<ApplicationMapResource> create(String applicationId, String name, Part file) {
        return requireEditor(applicationId)
                .then(DataBufferUtils.join(file.content(), MapGeoJsonValidator.MAX_BYTES)
                        .onErrorMap(
                                DataBufferLimitException.class,
                                ignored -> new IllegalArgumentException("GeoJSON exceeds 10 MiB"))
                        .map(buffer -> {
                            try {
                                byte[] bytes = new byte[buffer.readableByteCount()];
                                buffer.read(bytes);
                                return bytes;
                            } finally {
                                DataBufferUtils.release(buffer);
                            }
                        })
                        .flatMap(bytes -> save(applicationId, name, bytes)));
    }

    public Mono<ApplicationMapResource> create(String applicationId, String name, byte[] bytes) {
        return requireEditor(applicationId).then(Mono.defer(() -> save(applicationId, name, bytes)));
    }

    public Flux<MapSummary> list(String applicationId) {
        return requireEditor(applicationId)
                .thenMany(Flux.defer(() -> repository.findByApplicationId(applicationId)))
                .map(resource -> new MapSummary(resource.id(), resource.name(), resource.regionCount()));
    }

    public Mono<ApplicationMapResource> get(String applicationId, String resourceId) {
        return requireViewer(applicationId)
                .then(Mono.defer(() -> repository.findByApplicationIdAndId(applicationId, resourceId)))
                .switchIfEmpty(Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Map resource not found")));
    }

    public Mono<MapMetadata> metadata(String applicationId, String resourceId) {
        return requireViewer(applicationId)
                .then(Mono.defer(() -> repository.findMetadataByApplicationIdAndId(applicationId, resourceId)))
                .switchIfEmpty(Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Map resource not found")))
                .map(resource -> new MapMetadata(
                        resource.id(), resource.name(), resource.regionCount(), resource.regionOptions()));
    }

    private Mono<ApplicationMapResource> save(String applicationId, String name, byte[] bytes) {
        return Mono.defer(() -> {
            if (name == null || name.isBlank() || name.length() > 200) {
                return Mono.error(new IllegalArgumentException("Map name must contain 1 to 200 characters"));
            }
            List<MapGeoJsonValidator.RegionOption> regions = validator.validate(bytes);
            ApplicationMapResource resource = new ApplicationMapResource(
                    UUID.randomUUID().toString(),
                    applicationId,
                    name.trim(),
                    bytes,
                    digest(bytes),
                    regions,
                    Instant.now());
            return repository.insert(resource);
        });
    }

    Mono<Void> requireEditor(String applicationId) {
        return applications
                .findById(applicationId, permissions.getEditPermission())
                .switchIfEmpty(Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.APPLICATION_NOT_FOUND, "Application not found")))
                .then();
    }

    private Mono<Void> requireViewer(String applicationId) {
        return applications
                .findById(applicationId, permissions.getReadPermission())
                .switchIfEmpty(Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.APPLICATION_NOT_FOUND, "Application not found")))
                .then();
    }

    private static String digest(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    public record MapSummary(String id, String name, int regionCount) {}

    public record MapMetadata(
            String id, String name, int regionCount, List<MapGeoJsonValidator.RegionOption> regionOptions) {}
}
