package com.celanworksmith.maps;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.multipart.FormFieldPart;
import org.springframework.http.codec.multipart.Part;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v1/celanworksmith/applications/{applicationId}/maps")
public class ApplicationMapController {
    private final ApplicationMapService service;

    public ApplicationMapController(ApplicationMapService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ResponseEntity<ApplicationMapService.MapSummary>> create(
            @PathVariable String applicationId,
            @RequestPart("name") Mono<FormFieldPart> name,
            @RequestPart("file") Mono<Part> file) {
        return Mono.zip(name, file)
                .flatMap(parts -> service.create(applicationId, parts.getT1().value(), parts.getT2()))
                .map(resource -> ResponseEntity.status(HttpStatus.CREATED)
                        .header("X-Content-Type-Options", "nosniff")
                        .header(HttpHeaders.CACHE_CONTROL, "no-store")
                        .body(new ApplicationMapService.MapSummary(
                                resource.id(), resource.name(), resource.regionCount())));
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
