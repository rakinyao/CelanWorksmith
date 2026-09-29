package com.celanworksmith.maps;

import org.springframework.core.ResolvableType;
import org.springframework.core.io.buffer.DataBufferLimitException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.DefaultPartHttpMessageReader;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.http.codec.multipart.FormFieldPart;
import org.springframework.http.codec.multipart.Part;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/celanworksmith/applications/{applicationId}/maps")
public class ApplicationMapController {
    private final ApplicationMapService service;

    public ApplicationMapController(ApplicationMapService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ResponseEntity<ApplicationMapService.MapSummary>> create(
            @PathVariable String applicationId, ServerHttpRequest request) {
        return service.requireEditor(applicationId)
                .then(Mono.defer(() -> parseUpload(applicationId, request)))
                .map(resource -> ResponseEntity.status(HttpStatus.CREATED)
                        .header("X-Content-Type-Options", "nosniff")
                        .header(HttpHeaders.CACHE_CONTROL, "no-store")
                        .body(new ApplicationMapService.MapSummary(
                                resource.id(), resource.name(), resource.regionCount())));
    }

    private Mono<ApplicationMapResource> parseUpload(String applicationId, ServerHttpRequest request) {
        DefaultPartHttpMessageReader reader = new DefaultPartHttpMessageReader();
        reader.setMaxInMemorySize(64 * 1024);
        reader.setMaxDiskUsagePerPart(MapGeoJsonValidator.MAX_BYTES);
        reader.setMaxHeadersSize(8 * 1024);
        reader.setMaxParts(2);
        return reader.read(ResolvableType.forClass(Part.class), request, Map.of())
                .collectList()
                .flatMap(parts -> Mono.usingWhen(
                        Mono.just(parts),
                        received -> {
                            FormFieldPart name = received.stream()
                                    .filter(part -> "name".equals(part.name()) && part instanceof FormFieldPart)
                                    .map(part -> (FormFieldPart) part)
                                    .findFirst()
                                    .orElse(null);
                            FilePart file = received.stream()
                                    .filter(part -> "file".equals(part.name()) && part instanceof FilePart)
                                    .map(part -> (FilePart) part)
                                    .findFirst()
                                    .orElse(null);
                            if (name == null || file == null || received.size() != 2) {
                                return Mono.error(
                                        new IllegalArgumentException("Map name and GeoJSON file are required"));
                            }
                            return service.create(applicationId, name.value(), file);
                        },
                        received -> Flux.fromIterable(received)
                                .flatMap(Part::delete)
                                .then()))
                .onErrorMap(
                        DataBufferLimitException.class,
                        ignored -> new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "GeoJSON exceeds 10 MiB"));
    }

    @GetMapping
    public Mono<ResponseEntity<List<ApplicationMapService.MapSummary>>> list(@PathVariable String applicationId) {
        return service.list(applicationId).collectList().map(resources -> ResponseEntity.ok()
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=0, must-revalidate")
                .body(resources));
    }

    @GetMapping(value = "/{resourceId}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ResponseEntity<byte[]>> get(@PathVariable String applicationId, @PathVariable String resourceId) {
        return service.get(applicationId, resourceId).map(resource -> ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=0, must-revalidate")
                .body(resource.geoJson()));
    }

    @GetMapping("/{resourceId}/metadata")
    public Mono<ResponseEntity<ApplicationMapService.MapMetadata>> metadata(
            @PathVariable String applicationId, @PathVariable String resourceId) {
        return service.metadata(applicationId, resourceId).map(metadata -> ResponseEntity.ok()
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=0, must-revalidate")
                .body(metadata));
    }
}
