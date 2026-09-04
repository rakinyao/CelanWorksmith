package com.celanworksmith.ontology.datasource;

import org.junit.jupiter.api.Test;
import reactor.test.StepVerifier;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WorkspaceDomainRuntimeBindingResolverTest {
    @Test
    void resolvesOnlyTheExactWorkspaceAndDomainBinding() {
        ReleaseRuntimeBindingProperties properties =
                new ReleaseRuntimeBindingProperties(List.of(new ReleaseRuntimeBindingProperties.Binding(
                        "workspace-a",
                        "business",
                        "managed-business",
                        "demo-mongo-readonly",
                        "GOVERNED_DATASET",
                        List.of(new ReleaseRuntimeBindingProperties.AssetAuthorization(
                                "dataset:demo:public.ont_supplier", "sha256:" + "0".repeat(64))),
                        List.of())));
        WorkspaceDomainRuntimeBindingResolver resolver = new WorkspaceDomainRuntimeBindingResolver(properties);

        StepVerifier.create(resolver.resolveRequired("workspace-a", "business"))
                .assertNext(binding -> assertThat(binding.runtimeProviderId()).isEqualTo("demo-mongo-readonly"))
                .verifyComplete();

        StepVerifier.create(resolver.resolveRequired("workspace-b", "business"))
                .expectErrorMatches(error -> error.getMessage().equals("The workspace release binding is unavailable."))
                .verify();
    }
}
