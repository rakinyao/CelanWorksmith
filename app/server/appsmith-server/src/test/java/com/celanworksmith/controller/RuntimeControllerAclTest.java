package com.celanworksmith.controller;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.domains.Application;
import com.appsmith.server.solutions.ApplicationPermission;
import com.celanworksmith.CelanWorksmithExceptionHandler;
import com.celanworksmith.runtime.context.CelanworksmithRuntimeContext;
import com.celanworksmith.runtime.controller.RuntimeController;
import com.celanworksmith.runtime.dto.ActionResult;
import com.celanworksmith.runtime.port.RuntimeProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RuntimeControllerAclTest {
    @Mock
    RuntimeProvider runtimeProvider;

    @Mock
    ApplicationService applicationService;

    @Mock
    ApplicationPermission applicationPermission;

    @Mock
    AclPermission readPermission;

    @Test
    void rejectsMissingApplicationBeforeRuntimeProviderForAllBoundReads() {
        when(applicationPermission.getReadPermission()).thenReturn(readPermission);
        when(applicationService.findById(eq("missing"), eq(readPermission))).thenReturn(Mono.empty());
        WebTestClient client = WebTestClient.bindToController(new RuntimeController(
                        runtimeProvider, new ObjectMapper(), applicationService, applicationPermission))
                .controllerAdvice(new CelanWorksmithExceptionHandler())
                .build();

        client.get()
                .uri("/api/v1/celanworksmith/runtime/objects/PurchaseOrder?applicationId=missing")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("APPLICATION_NOT_FOUND");
        client.get()
                .uri("/api/v1/celanworksmith/runtime/objects/PurchaseOrder/PO001?applicationId=missing")
                .exchange()
                .expectStatus()
                .isNotFound();
        client.get()
                .uri(
                        "/api/v1/celanworksmith/runtime/objects/Supplier/S001/links?linkTypeId=supplier_orders&applicationId=missing")
                .exchange()
                .expectStatus()
                .isNotFound();
        client.post()
                .uri("/api/v1/celanworksmith/runtime/actions/UpdateProductionSchedule/execute?applicationId=missing")
                .bodyValue(Map.of(
                        "objectTypeId", "PurchaseOrder",
                        "objectId", "PO005",
                        "parameters", Map.of("newScheduleDate", "2026-03-15")))
                .exchange()
                .expectStatus()
                .isNotFound();
        verify(runtimeProvider, never())
                .queryObjects(
                        org.mockito.ArgumentMatchers.any(), eq("PurchaseOrder"), org.mockito.ArgumentMatchers.any());
        verify(runtimeProvider, never())
                .getObject(org.mockito.ArgumentMatchers.any(), eq("PurchaseOrder"), eq("PO001"));
        verify(runtimeProvider, never())
                .getLinks(
                        org.mockito.ArgumentMatchers.any(),
                        eq("Supplier"),
                        eq("S001"),
                        eq("supplier_orders"),
                        org.mockito.ArgumentMatchers.any());
        verify(runtimeProvider, never())
                .executeAction(
                        org.mockito.ArgumentMatchers.any(),
                        eq("UpdateProductionSchedule"),
                        org.mockito.ArgumentMatchers.any());
    }

    @Test
    void boundReadUsesAclAndLegacyConstructorRemainsCompatible() {
        when(applicationPermission.getReadPermission()).thenReturn(readPermission);
        when(applicationService.findById(eq("app-1"), eq(readPermission))).thenReturn(Mono.just(new Application()));
        when(runtimeProvider.queryObjects(
                        org.mockito.ArgumentMatchers.any(), eq("PurchaseOrder"), org.mockito.ArgumentMatchers.any()))
                .thenReturn(Mono.just(new com.celanworksmith.runtime.dto.ObjectSetResult(
                        "PurchaseOrder", java.util.List.of(), 0, 10, 0)));
        WebTestClient client = WebTestClient.bindToController(new RuntimeController(
                        runtimeProvider, new ObjectMapper(), applicationService, applicationPermission))
                .controllerAdvice(new CelanWorksmithExceptionHandler())
                .build();

        client.get()
                .uri("/api/v1/celanworksmith/runtime/objects/PurchaseOrder?applicationId=app-1")
                .exchange()
                .expectStatus()
                .isOk();
        verify(applicationService).findById("app-1", readPermission);
    }

    @Test
    void boundActionUsesAclAndApplicationContext() {
        CelanworksmithRuntimeContext context = new CelanworksmithRuntimeContext("app-1", false);
        when(applicationPermission.getReadPermission()).thenReturn(readPermission);
        when(applicationService.findById(eq("app-1"), eq(readPermission))).thenReturn(Mono.just(new Application()));
        when(runtimeProvider.executeAction(
                        eq(context), eq("UpdateProductionSchedule"), org.mockito.ArgumentMatchers.any()))
                .thenReturn(Mono.just(new ActionResult(
                        true, "Action executed", "execution-1", List.of(), List.of(), List.of(), List.of())));
        WebTestClient client = WebTestClient.bindToController(new RuntimeController(
                        runtimeProvider, new ObjectMapper(), applicationService, applicationPermission))
                .controllerAdvice(new CelanWorksmithExceptionHandler())
                .build();

        client.post()
                .uri("/api/v1/celanworksmith/runtime/actions/UpdateProductionSchedule/execute?applicationId=app-1")
                .bodyValue(Map.of(
                        "objectTypeId", "PurchaseOrder",
                        "objectId", "PO005",
                        "parameters", Map.of("newScheduleDate", "2026-03-15")))
                .exchange()
                .expectStatus()
                .isOk();

        verify(applicationService).findById("app-1", readPermission);
        verify(runtimeProvider)
                .executeAction(eq(context), eq("UpdateProductionSchedule"), org.mockito.ArgumentMatchers.any());
    }
}
