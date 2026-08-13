package com.celanworksmith.application;

import com.celanworksmith.ontology.persistence.CelanWorksmithMongoProperties;
import com.mongodb.reactivestreams.client.MongoClient;
import com.mongodb.reactivestreams.client.MongoClients;
import jakarta.annotation.PreDestroy;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class MongoCelanworksmithApplicationBindingRepository implements CelanworksmithApplicationBindingRepository {
    private static final String COLLECTION = "application_ontology_bindings";
    private final MongoClient client;
    private final ReactiveMongoTemplate template;

    public MongoCelanworksmithApplicationBindingRepository(CelanWorksmithMongoProperties properties) {
        client = MongoClients.create(properties.getUri());
        template = new ReactiveMongoTemplate(client, properties.getDatabase());
    }

    @Override
    public Mono<CelanworksmithApplicationBinding> get(String applicationId) {
        return template.findById(applicationId, CelanworksmithApplicationBindingDocument.class, COLLECTION)
                .map(CelanworksmithApplicationBindingDocument::toBinding);
    }

    @Override
    public Mono<CelanworksmithApplicationBinding> upsert(CelanworksmithApplicationBinding binding) {
        return template.save(CelanworksmithApplicationBindingDocument.from(binding), COLLECTION)
                .map(CelanworksmithApplicationBindingDocument::toBinding);
    }

    @Override
    public Mono<Void> delete(String applicationId) {
        return template.remove(
                        new org.springframework.data.mongodb.core.query.Query(
                                org.springframework.data.mongodb.core.query.Criteria.where("_id")
                                        .is(applicationId)),
                        CelanworksmithApplicationBindingDocument.class,
                        COLLECTION)
                .then();
    }

    @PreDestroy
    public void close() {
        client.close();
    }
}
