package com.celanworksmith.release;

import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import com.celanworksmith.release.model.ApplicationReleaseStatus;
import com.mongodb.reactivestreams.client.MongoClient;
import com.mongodb.reactivestreams.client.MongoClients;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MongoApplicationReleaseRepositoryIntegrationTest {
    private static final String DATABASE = "celanworksmith_release_test";

    private static final MongoClient CLIENT = MongoClients.create("mongodb://localhost:27017");
    private static final ReactiveMongoTemplate TEMPLATE = new ReactiveMongoTemplate(CLIENT, DATABASE);

    private MongoApplicationReleaseRepository repository;

    @BeforeEach
    void cleanDatabase() {
        Mono.when(
                        TEMPLATE.dropCollection("celanworksmith_application_releases"),
                        TEMPLATE.dropCollection("celanworksmith_application_active_releases"))
                .onErrorResume(ignored -> Mono.empty())
                .block();
        repository = new MongoApplicationReleaseRepository(TEMPLATE);
    }

    @AfterAll
    static void closeClient() {
        CLIENT.close();
    }

    @Test
    void activationCreatesAndThenReplacesPointerWithoutChangingReleaseContent() {
        ApplicationReleaseSnapshot first = snapshot("release-1", "application-1");
        ApplicationReleaseSnapshot second = snapshot("release-2", "application-1");
        repository.save(first).block();
        repository.save(second).block();

        ApplicationReleaseRepository.ActivationResult firstActivation = repository
                .activate("application-1", "release-1", "actor-1", Instant.parse("2026-08-15T01:00:00Z"))
                .block();
        assertThat(firstActivation).isEqualTo(new ApplicationReleaseRepository.ActivationResult(null, "release-1"));
        assertThat(repository.findActive("application-1").block()).isEqualTo(first);

        ApplicationReleaseRepository.ActivationResult secondActivation = repository
                .activate("application-1", "release-2", "actor-2", Instant.parse("2026-08-15T02:00:00Z"))
                .block();
        assertThat(secondActivation)
                .isEqualTo(new ApplicationReleaseRepository.ActivationResult("release-1", "release-2"));
        assertThat(repository.findActive("application-1").block()).isEqualTo(second);

        ApplicationReleaseSnapshot persistedFirst =
                repository.findById("release-1").block();
        ApplicationReleaseSnapshot persistedSecond =
                repository.findById("release-2").block();
        assertThat(persistedFirst).isEqualTo(first);
        assertThat(persistedSecond).isEqualTo(second);
        assertThat(persistedFirst.contentDigest()).isEqualTo(first.contentDigest());
        assertThat(persistedSecond.contentDigest()).isEqualTo(second.contentDigest());
    }

    private ApplicationReleaseSnapshot snapshot(String releaseId, String applicationId) {
        return new ApplicationReleaseSnapshot(
                releaseId,
                applicationId,
                "workspace-1",
                "revision-1",
                "1",
                "creator-1",
                Instant.parse("2026-08-15T00:00:00Z"),
                "release",
                "sha256:" + releaseId,
                Map.of("page", List.of("widget")),
                List.of(),
                List.of(),
                ApplicationReleaseStatus.SNAPSHOT_CREATED);
    }
}
