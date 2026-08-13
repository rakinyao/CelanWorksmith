package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.persistence.CelanWorksmithMongoProperties;
import com.mongodb.reactivestreams.client.MongoClient;
import com.mongodb.reactivestreams.client.MongoClients;
import jakarta.annotation.PreDestroy;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class OntologyMetadataSnapshotRepository {
    private static final String COLLECTION = "ontology_metadata_snapshots";

    private final MongoClient client;
    private final ReactiveMongoTemplate template;

    public OntologyMetadataSnapshotRepository(CelanWorksmithMongoProperties properties) {
        this(MongoClients.create(properties.getUri()), properties.getDatabase());
    }

    OntologyMetadataSnapshotRepository(MongoClient client, String database) {
        this.client = client;
        this.template = new ReactiveMongoTemplate(client, database);
    }

    public Mono<OntologyMetadataSnapshot> insert(OntologyMetadataSnapshot snapshot) {
        return template.insert(snapshot, COLLECTION);
    }

    public Mono<OntologyMetadataSnapshot> findById(String snapshotId) {
        return template.findById(snapshotId, OntologyMetadataSnapshot.class, COLLECTION);
    }

    @PreDestroy
    public void close() {
        client.close();
    }
}
