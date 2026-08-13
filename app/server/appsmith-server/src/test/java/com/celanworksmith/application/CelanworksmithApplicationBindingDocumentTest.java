package com.celanworksmith.application;

import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.core.mapping.MongoPersistentEntity;
import org.springframework.data.mongodb.core.mapping.MongoPersistentProperty;

import static org.assertj.core.api.Assertions.assertThat;

class CelanworksmithApplicationBindingDocumentTest {
    @Test
    void applicationIdIsTheMongoIdUsedForUpserts() {
        MongoMappingContext context = new MongoMappingContext();
        context.initialize();

        MongoPersistentEntity<?> entity = context.getPersistentEntity(CelanworksmithApplicationBindingDocument.class);
        MongoPersistentProperty property = entity.getPersistentProperty("applicationId");

        assertThat(property).isNotNull();
        assertThat(property.isIdProperty()).isTrue();
        assertThat(entity.getIdProperty()).isSameAs(property);
    }
}
