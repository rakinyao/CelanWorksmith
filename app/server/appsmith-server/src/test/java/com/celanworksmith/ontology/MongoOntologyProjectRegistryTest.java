package com.celanworksmith.ontology;

import com.celanworksmith.ontology.persistence.CelanWorksmithMongoConfiguration;
import com.celanworksmith.ontology.persistence.MongoOntologyProjectRegistry;
import com.celanworksmith.ontology.persistence.OntologyProjectDocument;
import com.mongodb.reactivestreams.client.MongoClient;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.NoOpDbRefResolver;
import org.springframework.data.mongodb.core.index.ReactiveIndexOperations;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MongoOntologyProjectRegistryTest {
    @Test
    void preservesNestedOntologyIdsWhenReadingMongoDocuments() {
        MongoMappingContext context = new MongoMappingContext();
        MappingMongoConverter converter = new MappingMongoConverter(NoOpDbRefResolver.INSTANCE, context);
        converter.afterPropertiesSet();
        OntologyProjectDocument document = converter.read(
                OntologyProjectDocument.class,
                Document.parse(
                        """
                {
                  "_id": "project:1.0.0",
                  "projectId": "project",
                  "version": "1.0.0",
                  "definition": {
                    "projectId": "project",
                    "version": "1.0.0",
                    "schemaVersion": 1,
                    "objectTypes": [{
                      "id": "PurchaseOrder",
                      "displayName": "Purchase Order",
                      "properties": [{"id": "status", "displayName": "Status", "dataType": "STRING", "required": true, "readOnly": false, "derived": false}],
                      "runtimeTable": "purchase_orders",
                      "primaryKey": "id"
                    }],
                    "linkTypes": [{"id": "supplier_orders", "displayName": "Supplier Orders", "sourceTypeId": "Supplier", "targetTypeId": "PurchaseOrder", "cardinality": "ONE_TO_MANY"}],
                    "functions": [{"id": "CalculateDelayDays", "displayName": "Calculate Delay Days", "returnType": "INTEGER", "parameters": [], "sideEffectFree": true}],
                    "actions": []
                  }
                }
                """));

        assertThat(document.toDefinition().objectTypes().getFirst().id()).isEqualTo("PurchaseOrder");
        assertThat(document.toDefinition()
                        .objectTypes()
                        .getFirst()
                        .properties()
                        .getFirst()
                        .id())
                .isEqualTo("status");
        assertThat(document.toDefinition()
                        .objectTypes()
                        .getFirst()
                        .properties()
                        .getFirst()
                        .hidden())
                .isFalse();
        assertThat(document.toDefinition().linkTypes().getFirst().id()).isEqualTo("supplier_orders");
        assertThat(document.toDefinition().functions().getFirst().id()).isEqualTo("CalculateDelayDays");
    }

    @Test
    void documentUsesProjectAndVersionAsImmutableIdentity() {
        OntologyProjectDocument document =
                OntologyProjectDocument.from(new com.celanworksmith.ontology.project.OntologyProjectYamlImporter()
                        .importZip(com.celanworksmith.ontology.project.OntologyProjectZipFixtures.validZip()));

        assertThat(document.getId()).isEqualTo("celanworksmith-demo:1.0.0");
        assertThat(document.getProjectId()).isEqualTo("celanworksmith-demo");
        assertThat(document.getVersion()).isEqualTo("1.0.0");
    }

    @Test
    void isolationConfigurationDoesNotExposeGlobalMongoInfrastructureBeans() {
        for (Method method : CelanWorksmithMongoConfiguration.class.getDeclaredMethods()) {
            assertThat(MongoClient.class.isAssignableFrom(method.getReturnType()))
                    .isFalse();
            assertThat(ReactiveMongoTemplate.class.isAssignableFrom(method.getReturnType()))
                    .isFalse();
        }
    }

    @Test
    void retriesIndexInitializationAfterATransientFailure() {
        ReactiveMongoTemplate template = mock(ReactiveMongoTemplate.class);
        ReactiveIndexOperations indexOperations = mock(ReactiveIndexOperations.class);
        com.mongodb.reactivestreams.client.MongoClient client =
                mock(com.mongodb.reactivestreams.client.MongoClient.class);
        OntologyProjectDocument document =
                OntologyProjectDocument.from(new com.celanworksmith.ontology.project.OntologyProjectYamlImporter()
                        .importZip(com.celanworksmith.ontology.project.OntologyProjectZipFixtures.validZip()));
        when(template.indexOps("ontology_projects")).thenReturn(indexOperations);
        when(indexOperations.ensureIndex(any()))
                .thenReturn(
                        Mono.error(new IllegalStateException("temporary Mongo failure")),
                        Mono.just("project-version-index"));
        when(template.insert(any(OntologyProjectDocument.class), org.mockito.ArgumentMatchers.eq("ontology_projects")))
                .thenReturn(Mono.just(document));

        MongoOntologyProjectRegistry registry = new MongoOntologyProjectRegistry(template, client);

        StepVerifier.create(registry.save(document.toDefinition()))
                .expectError(IllegalStateException.class)
                .verify();
        StepVerifier.create(registry.save(document.toDefinition()))
                .expectNext(document.toDefinition())
                .verifyComplete();

        verify(indexOperations, times(2)).ensureIndex(any());
    }
}
