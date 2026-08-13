package com.celanworksmith.application;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.domains.Application;
import com.appsmith.server.solutions.ApplicationPermission;
import com.celanworksmith.CelanWorksmithExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CelanworksmithApplicationBindingControllerTest {
    @Mock
    ApplicationService applicationService;

    @Mock
    ApplicationPermission applicationPermission;

    @Mock
    CelanworksmithApplicationBindingService bindingService;

    @Mock
    AclPermission readPermission;

    @Mock
    AclPermission editPermission;

    private WebTestClient client;

    @BeforeEach
    void setUp() {
        client = WebTestClient.bindToController(new CelanworksmithApplicationBindingController(
                        applicationService, applicationPermission, bindingService))
                .controllerAdvice(new CelanWorksmithExceptionHandler())
                .build();
    }

    @Test
    void getUsesReadAclAndReturnsUnboundResult() {
        when(applicationPermission.getReadPermission()).thenReturn(readPermission);
        when(applicationService.findById(eq("app-1"), eq(readPermission))).thenReturn(Mono.just(new Application()));
        when(bindingService.get("app-1")).thenReturn(Mono.empty());
        client.get()
                .uri("/api/v1/celanworksmith/applications/app-1/ontology-binding")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data.bound")
                .isEqualTo(false);
        verify(applicationService).findById("app-1", readPermission);
    }

    @Test
    void putAndDeleteUseEditAcl() {
        when(applicationPermission.getEditPermission()).thenReturn(editPermission);
        when(applicationService.findById(eq("app-1"), eq(editPermission))).thenReturn(Mono.just(new Application()));
        var request = new CelanworksmithApplicationBindingRequest("celanworksmith-demo", "1.0.0", "mongodb-readonly");
        var binding = new CelanworksmithApplicationBinding(
                "app-1", request.projectId(), request.projectVersion(), request.providerId());
        when(bindingService.bind("app-1", request)).thenReturn(Mono.just(binding));
        when(bindingService.unbind("app-1")).thenReturn(Mono.empty());

        client.put()
                .uri("/api/v1/celanworksmith/applications/app-1/ontology-binding")
                .bodyValue(request)
                .exchange()
                .expectStatus()
                .isOk();
        client.delete()
                .uri("/api/v1/celanworksmith/applications/app-1/ontology-binding")
                .exchange()
                .expectStatus()
                .isNoContent();
        verify(applicationService, org.mockito.Mockito.times(2)).findById("app-1", editPermission);
    }

    @Test
    void getRejectsMissingApplicationBeforeCallingBindingService() {
        when(applicationPermission.getReadPermission()).thenReturn(readPermission);
        when(applicationService.findById(eq("app-1"), eq(readPermission))).thenReturn(Mono.empty());

        client.get()
                .uri("/api/v1/celanworksmith/applications/app-1/ontology-binding")
                .exchange()
                .expectStatus()
                .is4xxClientError()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("APPLICATION_NOT_FOUND");
        verifyNoInteractions(bindingService);
    }

    @Test
    void putRejectsMissingApplicationBeforeCallingBindingService() {
        when(applicationPermission.getEditPermission()).thenReturn(editPermission);
        when(applicationService.findById(eq("app-1"), eq(editPermission))).thenReturn(Mono.empty());

        client.put()
                .uri("/api/v1/celanworksmith/applications/app-1/ontology-binding")
                .bodyValue(new CelanworksmithApplicationBindingRequest("project", "1.0.0", "mongodb-readonly"))
                .exchange()
                .expectStatus()
                .is4xxClientError()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("APPLICATION_NOT_FOUND");
        verifyNoInteractions(bindingService);
    }

    @Test
    void deleteRejectsMissingApplicationBeforeCallingBindingService() {
        when(applicationPermission.getEditPermission()).thenReturn(editPermission);
        when(applicationService.findById(eq("app-1"), eq(editPermission))).thenReturn(Mono.empty());

        client.delete()
                .uri("/api/v1/celanworksmith/applications/app-1/ontology-binding")
                .exchange()
                .expectStatus()
                .is4xxClientError()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("APPLICATION_NOT_FOUND");
        verifyNoInteractions(bindingService);
    }
}
