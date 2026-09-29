package com.celanworksmith.maps;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.ArrayOperators;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
public class MongoApplicationMapRepository implements ApplicationMapRepository {
    private static final String COLLECTION = "celanworksmith_application_maps";
    private final ReactiveMongoTemplate template;

    public MongoApplicationMapRepository(ReactiveMongoTemplate template) {
        this.template = template;
    }

    @Override
    public Mono<ApplicationMapResource> insert(ApplicationMapResource resource) {
        return template.insert(resource, COLLECTION);
    }

    @Override
    public Flux<ApplicationMapCatalogRecord> findByApplicationId(String applicationId) {
        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("applicationId").is(applicationId)),
                Aggregation.sort(Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("_id"))),
                Aggregation.project("name")
                        .and(ConditionalOperators.IfNull.ifNull("regionCount")
                                .thenValueOf(ArrayOperators.Size.lengthOfArray("regionOptions")))
                        .as("regionCount"));
        return template.aggregate(aggregation, COLLECTION, ApplicationMapCatalogRecord.class);
    }

    @Override
    public Mono<ApplicationMapResource> findByApplicationIdAndId(String applicationId, String resourceId) {
        return template.findOne(
                Query.query(Criteria.where("_id")
                        .is(resourceId)
                        .and("applicationId")
                        .is(applicationId)),
                ApplicationMapResource.class,
                COLLECTION);
    }

    @Override
    public Mono<ApplicationMapCatalogRecord> findMetadataByApplicationIdAndId(String applicationId, String resourceId) {
        Query query = Query.query(
                Criteria.where("_id").is(resourceId).and("applicationId").is(applicationId));
        query.fields().include("name").include("regionCount").include("regionOptions");
        return template.findOne(query, ApplicationMapCatalogRecord.class, COLLECTION);
    }
}
