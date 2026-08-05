package com.celanworksmith;

import com.celanworksmith.ontology.adapter.mock.MockOntologyProvider;
import com.celanworksmith.ontology.adapter.production.ProductionOntologyProvider;
import com.celanworksmith.ontology.port.OntologyProvider;
import com.celanworksmith.runtime.adapter.mock.MockRuntimeProvider;
import com.celanworksmith.runtime.adapter.production.ProductionRuntimeProvider;
import com.celanworksmith.runtime.mock.MockDataStore;
import com.celanworksmith.runtime.port.RuntimeProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CelanWorksmithConfiguration {
    @Bean
    @ConditionalOnProperty(name = "celanworksmith.ontology.provider", havingValue = "mock", matchIfMissing = true)
    public OntologyProvider mockOntologyProvider() {
        return new MockOntologyProvider();
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.ontology.provider", havingValue = "production")
    public OntologyProvider productionOntologyProvider() {
        return new ProductionOntologyProvider();
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.runtime.provider", havingValue = "mock", matchIfMissing = true)
    public MockDataStore mockDataStore() {
        return new MockDataStore();
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.runtime.provider", havingValue = "mock", matchIfMissing = true)
    public RuntimeProvider mockRuntimeProvider(MockDataStore dataStore) {
        return new MockRuntimeProvider(dataStore);
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.runtime.provider", havingValue = "production")
    public RuntimeProvider productionRuntimeProvider() {
        return new ProductionRuntimeProvider();
    }
}
