package com.celanworksmith.release;

import com.celanworksmith.release.model.ApplicationReleasePointer;
import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import com.celanworksmith.release.model.ApplicationReleaseStatus;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.index.ReactiveIndexOperations;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MongoApplicationReleaseRepositoryTest {

    private static final String RELEASES = "celanworksmith_application_releases";
    private static final String ACTIVE = "celanworksmith_application_active_releases";

    private final ReactiveMongoTemplate template = org.mockito.Mockito.mock(ReactiveMongoTemplate.class);
    private final MongoApplicationReleaseRepository repository = new MongoApplicationReleaseRepository(template);

    @BeforeEach
    void stubIndexes() {
        ReactiveIndexOperations indexes = org.mockito.Mockito.mock(ReactiveIndexOperations.class);
        when(template.indexOps(any(String.class))).thenReturn(indexes);
        when(indexes.ensureIndex(any())).thenReturn(Mono.just("index"));
    }

    @Test
    void savesReleasesWithInsertOnlySemantics() {
        ApplicationReleaseSnapshot snapshot =
                snapshot("release-1", "application-1", ApplicationReleaseStatus.SNAPSHOT_CREATED);
        when(template.insert(snapshot, RELEASES)).thenReturn(Mono.just(snapshot));

        StepVerifier.create(repository.save(snapshot)).expectNext(snapshot).verifyComplete();

        verify(template).insert(snapshot, RELEASES);
        verify(template, never()).save(any(), eq(RELEASES));
    }

    @Test
    void listsApplicationReleasesNewestFirstWithStableTieBreaking() {
        ApplicationReleaseSnapshot first =
                snapshot("release-1", "application-1", ApplicationReleaseStatus.SNAPSHOT_CREATED);
        ApplicationReleaseSnapshot second = snapshot("release-2", "application-1", ApplicationReleaseStatus.PUBLISHED);
        when(template.find(any(Query.class), eq(ApplicationReleaseSnapshot.class), eq(RELEASES)))
                .thenReturn(Flux.just(second, first));

        StepVerifier.create(repository.findByApplicationId("application-1"))
                .expectNext(second, first)
                .verifyComplete();

        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        verify(template).find(query.capture(), eq(ApplicationReleaseSnapshot.class), eq(RELEASES));
        assertThat(query.getValue().getQueryObject().get("applicationId")).isEqualTo("application-1");
        assertThat(query.getValue().getSortObject())
                .containsEntry("createdAt", -1)
                .containsEntry("releaseId", -1);
    }

    @Test
    void activationReturnsPreviousPointerAndNewReleaseId() {
        ApplicationReleaseSnapshot release =
                snapshot("release-2", "application-1", ApplicationReleaseStatus.SNAPSHOT_CREATED);
        ApplicationReleasePointer pointer = new ApplicationReleasePointer(
                "application-1", "release-2", "release-1", "actor", Instant.parse("2026-08-15T01:00:00Z"));
        when(template.findOne(any(Query.class), eq(ApplicationReleaseSnapshot.class), eq(RELEASES)))
                .thenReturn(Mono.just(release));
        when(template.findAndModify(any(Query.class), any(), any(), eq(ApplicationReleasePointer.class), eq(ACTIVE)))
                .thenReturn(Mono.just(pointer));

        StepVerifier.create(repository.activate(
                        "application-1", "release-2", "actor", Instant.parse("2026-08-15T01:00:00Z")))
                .expectNext(new ApplicationReleaseRepository.ActivationResult("release-1", "release-2"))
                .verifyComplete();
    }

    @Test
    void rejectsActivationOfReleaseOwnedByAnotherApplication() {
        ApplicationReleaseSnapshot release =
                snapshot("release-2", "application-2", ApplicationReleaseStatus.SNAPSHOT_CREATED);
        when(template.findOne(any(Query.class), eq(ApplicationReleaseSnapshot.class), eq(RELEASES)))
                .thenReturn(Mono.just(release));

        StepVerifier.create(repository.activate(
                        "application-1", "release-2", "actor", Instant.parse("2026-08-15T01:00:00Z")))
                .expectErrorSatisfies(error -> assertThat(error).isInstanceOf(IllegalArgumentException.class))
                .verify();

        verify(template, never())
                .findAndModify(any(Query.class), any(), any(), eq(ApplicationReleasePointer.class), eq(ACTIVE));
        verify(template, never())
                .updateFirst(any(Query.class), any(Update.class), eq(ApplicationReleaseSnapshot.class), eq(RELEASES));
    }

    @Test
    void transitionsOnlyTheLifecycleStatus() {
        ApplicationReleaseSnapshot before =
                snapshot("release-1", "application-1", ApplicationReleaseStatus.SNAPSHOT_CREATED);
        ApplicationReleaseSnapshot after = snapshot("release-1", "application-1", ApplicationReleaseStatus.PUBLISHED);
        when(template.updateFirst(
                        any(Query.class), any(Update.class), eq(ApplicationReleaseSnapshot.class), eq(RELEASES)))
                .thenReturn(Mono.empty());
        when(template.findOne(any(Query.class), eq(ApplicationReleaseSnapshot.class), eq(RELEASES)))
                .thenReturn(Mono.just(after));

        StepVerifier.create(repository.transitionStatus("release-1", ApplicationReleaseStatus.PUBLISHED))
                .expectNext(after)
                .verifyComplete();

        ArgumentCaptor<Update> update = ArgumentCaptor.forClass(Update.class);
        verify(template)
                .updateFirst(any(Query.class), update.capture(), eq(ApplicationReleaseSnapshot.class), eq(RELEASES));
        assertThat(update.getValue().getUpdateObject().keySet()).containsExactly("$set");
        assertThat(((Document) update.getValue().getUpdateObject().get("$set")).get("status"))
                .isEqualTo(ApplicationReleaseStatus.PUBLISHED);
        assertThat(before.contentDigest()).isEqualTo(after.contentDigest());
        assertThat(before.applicationContent()).isEqualTo(after.applicationContent());
    }

    private ApplicationReleaseSnapshot snapshot(
            String releaseId, String applicationId, ApplicationReleaseStatus status) {
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
                status);
    }
}
