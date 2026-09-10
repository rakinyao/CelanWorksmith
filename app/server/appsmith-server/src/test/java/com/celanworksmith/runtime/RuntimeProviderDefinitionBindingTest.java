package com.celanworksmith.runtime;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.runtime.dto.ActionExecutionRequest;
import com.celanworksmith.runtime.dto.ActionResult;
import com.celanworksmith.runtime.dto.FunctionExecutionRequest;
import com.celanworksmith.runtime.dto.ObjectInstanceDTO;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.celanworksmith.runtime.dto.ReasoningRequest;
import com.celanworksmith.runtime.dto.ReasoningResult;
import com.celanworksmith.runtime.port.RuntimeProvider;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RuntimeProviderDefinitionBindingTest {
    @Test
    void rejectsDefinitionBoundObjectLookupWhenProviderOnlyImplementsLegacyLookup() {
        LegacyRuntimeProvider provider = new LegacyRuntimeProvider();

        StepVerifier.create(provider.getObject(definition(), "PurchaseOrder", "PO001"))
                .expectErrorSatisfies(error -> {
                    assertThat(error).isInstanceOf(UnsupportedOperationException.class);
                    assertThat(error)
                            .hasMessage("Runtime Provider does not support definition-bound object resolution");
                })
                .verify();

        assertThat(provider.legacyObjectLookupCalls).isZero();
    }

    private static OntologyProjectDefinition definition() {
        return new OntologyProjectDefinition("supply-chain", "1.0.0", 1, List.of(), List.of(), List.of(), List.of());
    }

    private static final class LegacyRuntimeProvider implements RuntimeProvider {
        private int legacyObjectLookupCalls;

        @Override
        public Mono<ObjectSetResult> queryObjects(String typeId, ObjectSetQuery query) {
            return Mono.error(new UnsupportedOperationException());
        }

        @Override
        public Mono<ObjectInstanceDTO> getObject(String typeId, String instanceId) {
            legacyObjectLookupCalls++;
            return Mono.just(new ObjectInstanceDTO(instanceId, typeId, java.util.Map.of()));
        }

        @Override
        public Mono<ObjectSetResult> getLinks(
                String typeId, String instanceId, String linkTypeId, ObjectSetQuery query) {
            return Mono.error(new UnsupportedOperationException());
        }

        @Override
        public Mono<ActionResult> executeAction(String actionId, ActionExecutionRequest request) {
            return Mono.error(new UnsupportedOperationException());
        }

        @Override
        public Mono<Object> executeFunction(String functionId, FunctionExecutionRequest request) {
            return Mono.error(new UnsupportedOperationException());
        }

        @Override
        public Mono<ReasoningResult> reason(ReasoningRequest request) {
            return Mono.error(new UnsupportedOperationException());
        }
    }
}
