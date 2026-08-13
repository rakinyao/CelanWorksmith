package com.celanworksmith.ontology.persistence;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.mongodb.DuplicateKeyException;
import com.mongodb.reactivestreams.client.MongoClient;
import com.mongodb.reactivestreams.client.MongoClients;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class MongoOntologyProjectRegistry implements OntologyProjectRegistry {
    private static final String COLLECTION = "ontology_projects";
    private final MongoClient client;
    private final ReactiveMongoTemplate template;
    private final AtomicBoolean indexInitialized = new AtomicBoolean();

    @Autowired
    public MongoOntologyProjectRegistry(CelanWorksmithMongoProperties properties) {
        this.client = MongoClients.create(properties.getUri());
        this.template = new ReactiveMongoTemplate(client, properties.getDatabase());
    }

    public MongoOntologyProjectRegistry(ReactiveMongoTemplate template, MongoClient client) {
        this.template = template;
        this.client = client;
    }

    @Override
    public Flux<OntologyProjectSummary> list() {
        return template.findAll(OntologyProjectDocument.class, COLLECTION)
                .map(document -> OntologyProjectSummary.from(document.toDefinition()));
    }

    @Override
    public Mono<OntologyProjectDefinition> find(String projectId, String version) {
        return template.findById(projectId + ":" + version, OntologyProjectDocument.class, COLLECTION)
                .map(OntologyProjectDocument::toDefinition);
    }

    @Override
    public Mono<OntologyProjectDefinition> save(OntologyProjectDefinition definition) {
        OntologyProjectDocument document = OntologyProjectDocument.from(definition);
        return ensureIndex()
                .then(template.insert(document, COLLECTION))
                .map(OntologyProjectDocument::toDefinition)
                .onErrorMap(
                        DuplicateKeyException.class,
                        ignored -> new CelanWorksmithException(
                                CelanWorksmithErrorCode.ONTOLOGY_PROJECT_VERSION_EXISTS,
                                "Ontology project version already exists: " + definition.projectId() + ":"
                                        + definition.version()));
    }

    private Mono<Void> ensureIndex() {
        return Mono.defer(() -> {
            if (indexInitialized.get()) {
                return Mono.empty();
            }
            return template.indexOps(COLLECTION)
                    .ensureIndex(new Index()
                            .on("projectId", Sort.Direction.ASC)
                            .on("version", Sort.Direction.ASC)
                            .unique())
                    .doOnSuccess(ignored -> indexInitialized.set(true))
                    .then();
        });
    }

    @PreDestroy
    public void close() {
        client.close();
    }
}
