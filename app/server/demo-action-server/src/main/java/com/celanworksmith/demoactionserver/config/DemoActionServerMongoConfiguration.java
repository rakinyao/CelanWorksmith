package com.celanworksmith.demoactionserver.config;

import com.celanworksmith.demoactionserver.audit.ActionExecutionAuditStore;
import com.mongodb.reactivestreams.client.MongoClient;
import com.mongodb.reactivestreams.client.MongoClients;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.ReactiveMongoDatabaseFactory;
import org.springframework.data.mongodb.ReactiveMongoTransactionManager;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.SimpleReactiveMongoDatabaseFactory;
import org.springframework.transaction.ReactiveTransactionManager;
import org.springframework.transaction.reactive.TransactionalOperator;

@Configuration
@EnableConfigurationProperties({DemoActionServerProperties.class, DemoActionServerRequestProperties.class})
public class DemoActionServerMongoConfiguration {
    @Bean(destroyMethod = "close")
    MongoClient demoActionServerMongoClient(DemoActionServerProperties properties) {
        return MongoClients.create(properties.getUri());
    }

    @Bean
    ReactiveMongoDatabaseFactory demoActionServerMongoDatabaseFactory(
            MongoClient demoActionServerMongoClient, DemoActionServerProperties properties) {
        return new SimpleReactiveMongoDatabaseFactory(demoActionServerMongoClient, properties.getDatabase());
    }

    @Bean
    ReactiveMongoTemplate demoActionServerReactiveMongoTemplate(
            ReactiveMongoDatabaseFactory demoActionServerMongoDatabaseFactory) {
        return new ReactiveMongoTemplate(demoActionServerMongoDatabaseFactory);
    }

    @Bean
    ReactiveTransactionManager demoActionServerReactiveTransactionManager(
            ReactiveMongoDatabaseFactory demoActionServerMongoDatabaseFactory) {
        return new ReactiveMongoTransactionManager(demoActionServerMongoDatabaseFactory);
    }

    @Bean
    TransactionalOperator demoActionServerTransactionalOperator(
            ReactiveTransactionManager demoActionServerReactiveTransactionManager) {
        return TransactionalOperator.create(demoActionServerReactiveTransactionManager);
    }

    @Bean
    ApplicationRunner actionExecutionAuditIndexInitializer(ActionExecutionAuditStore auditStore) {
        return arguments -> auditStore.ensureIdempotencyIndex().block();
    }
}
