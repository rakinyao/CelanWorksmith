package com.celanworksmith.release;

import com.celanworksmith.release.model.ApplicationReleasePointer;
import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import com.celanworksmith.release.model.ApplicationReleaseStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationUpdate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class MongoApplicationReleaseRepository implements ApplicationReleaseRepository {
    private static final String RELEASES_COLLECTION = "celanworksmith_application_releases";
    private static final String ACTIVE_COLLECTION = "celanworksmith_application_active_releases";

    private final ReactiveMongoTemplate template;
    private final AtomicBoolean indexesInitialized = new AtomicBoolean();

    public MongoApplicationReleaseRepository(ReactiveMongoTemplate template) {
        this.template = template;
    }

    @Override
    public Mono<ApplicationReleaseSnapshot> save(ApplicationReleaseSnapshot snapshot) {
        return ensureIndexes().then(template.insert(snapshot, RELEASES_COLLECTION));
    }

    @Override
    public Mono<ApplicationReleaseSnapshot> findById(String releaseId) {
        return ensureIndexes()
                .then(template.findOne(
                        query(Criteria.where("releaseId").is(releaseId)),
                        ApplicationReleaseSnapshot.class,
                        RELEASES_COLLECTION));
    }

    @Override
    public Flux<ApplicationReleaseSnapshot> findByApplicationId(String applicationId) {
        Query query = query(Criteria.where("applicationId").is(applicationId));
        query.with(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("releaseId")));
        return ensureIndexes().thenMany(template.find(query, ApplicationReleaseSnapshot.class, RELEASES_COLLECTION));
    }

    @Override
    public Mono<ApplicationReleaseSnapshot> findActive(String applicationId) {
        return ensureIndexes()
                .then(template.findOne(
                        query(Criteria.where("applicationId").is(applicationId)),
                        ApplicationReleasePointer.class,
                        ACTIVE_COLLECTION))
                .flatMap(pointer -> template.findOne(
                        query(Criteria.where("releaseId")
                                .is(pointer.activeReleaseId())
                                .and("applicationId")
                                .is(applicationId)),
                        ApplicationReleaseSnapshot.class,
                        RELEASES_COLLECTION));
    }

    @Override
    public Mono<ActivationResult> activate(String applicationId, String releaseId, String actor, Instant activatedAt) {
        return ensureIndexes()
                .then(template.findOne(
                        query(Criteria.where("releaseId").is(releaseId)),
                        ApplicationReleaseSnapshot.class,
                        RELEASES_COLLECTION))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Release does not exist: " + releaseId)))
                .flatMap(release -> {
                    if (!applicationId.equals(release.applicationId())) {
                        return Mono.error(new IllegalArgumentException("Release belongs to another application"));
                    }
                    AggregationUpdate update = AggregationUpdate.update()
                            .set("previousReleaseId")
                            .toValue("$activeReleaseId")
                            .set("applicationId")
                            .toValue(applicationId)
                            .set("activeReleaseId")
                            .toValue(releaseId)
                            .set("activatedBy")
                            .toValue(actor)
                            .set("activatedAt")
                            .toValue(activatedAt);
                    return template.findAndModify(
                                    query(Criteria.where("applicationId").is(applicationId)),
                                    update,
                                    FindAndModifyOptions.options()
                                            .returnNew(true)
                                            .upsert(true),
                                    ApplicationReleasePointer.class,
                                    ACTIVE_COLLECTION)
                            .map(pointer ->
                                    new ActivationResult(pointer.previousReleaseId(), pointer.activeReleaseId()));
                });
    }

    @Override
    public Mono<ApplicationReleaseSnapshot> transitionStatus(String releaseId, ApplicationReleaseStatus status) {
        return ensureIndexes()
                .then(template.updateFirst(
                        query(Criteria.where("releaseId").is(releaseId)),
                        new Update().set("status", status),
                        ApplicationReleaseSnapshot.class,
                        RELEASES_COLLECTION))
                .then(findById(releaseId));
    }

    private Mono<Void> ensureIndexes() {
        if (indexesInitialized.get()) {
            return Mono.empty();
        }
        return Mono.when(
                        template.indexOps(RELEASES_COLLECTION)
                                .ensureIndex(new Index()
                                        .on("releaseId", Sort.Direction.ASC)
                                        .unique()),
                        template.indexOps(RELEASES_COLLECTION)
                                .ensureIndex(new Index()
                                        .on("applicationId", Sort.Direction.ASC)
                                        .on("createdAt", Sort.Direction.DESC)),
                        template.indexOps(ACTIVE_COLLECTION)
                                .ensureIndex(new Index()
                                        .on("applicationId", Sort.Direction.ASC)
                                        .unique()))
                .doOnSuccess(ignored -> indexesInitialized.set(true))
                .then();
    }

    private static Query query(Criteria criteria) {
        return Query.query(criteria);
    }
}
