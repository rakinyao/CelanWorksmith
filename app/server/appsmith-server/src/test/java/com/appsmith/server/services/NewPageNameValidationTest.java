package com.appsmith.server.services;

import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.domains.NewPage;
import com.appsmith.server.dtos.PageDTO;
import com.appsmith.server.exceptions.AppsmithError;
import com.appsmith.server.exceptions.AppsmithException;
import com.appsmith.server.newpages.base.NewPageServiceCEImpl;
import com.appsmith.server.repositories.NewPageRepository;
import com.appsmith.server.solutions.ApplicationPermission;
import com.appsmith.server.solutions.PagePermission;
import io.micrometer.observation.ObservationRegistry;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

class NewPageNameValidationTest {
    private final NewPageRepository repository = mock(NewPageRepository.class);
    private final ApplicationService applications = mock(ApplicationService.class);
    private final PagePermission permissions = mock(PagePermission.class);
    private NewPageServiceCEImpl service;
    private NewPage current;

    @BeforeEach
    void setup() {
        service = spy(new NewPageServiceCEImpl(
                mock(Validator.class),
                repository,
                mock(AnalyticsService.class),
                applications,
                mock(UserDataService.class),
                mock(ApplicationPermission.class),
                permissions,
                ObservationRegistry.NOOP));
        current = new NewPage();
        current.setId("current");
        current.setApplicationId("application");
        current.setUpdatedAt(Instant.now());
        current.setUnpublishedPage(new PageDTO());
        current.getUnpublishedPage().setName("合同管理");
        when(repository.findById("current", permissions.getEditPermission())).thenReturn(Mono.just(current));
        when(applications.saveLastEditInformation("application")).thenReturn(Mono.empty());
        // The inherited persistence operation is the external boundary; keep updatePage validation real.
        doAnswer(invocation -> Mono.just(invocation.getArgument(1)))
                .when(service)
                .update(eq("current"), any(NewPage.class));
    }

    @Test
    void directUpdateRejectsDuplicateChineseName() {
        NewPage other = new NewPage();
        other.setId("other");
        when(repository.findByNameAndApplicationIdAndViewMode("订单管理", "application", null, false))
                .thenReturn(Mono.just(other));
        PageDTO update = new PageDTO();
        update.setName("订单管理");

        StepVerifier.create(service.updatePage("current", update))
                .expectErrorSatisfies(error -> {
                    assertThat(error).isInstanceOf(AppsmithException.class);
                    assertThat(((AppsmithException) error).getError())
                            .isEqualTo(AppsmithError.DUPLICATE_KEY_USER_ERROR);
                    assertThat(current.getUnpublishedPage().getName()).isEqualTo("合同管理");
                })
                .verify();
    }

    @Test
    void directUpdateAllowsDifferentChineseName() {
        when(repository.findByNameAndApplicationIdAndViewMode("订单管理", "application", null, false))
                .thenReturn(Mono.empty());
        PageDTO update = new PageDTO();
        update.setName("订单管理");

        StepVerifier.create(service.updatePage("current", update))
                .assertNext(page -> assertThat(page.getName()).isEqualTo("订单管理"))
                .verifyComplete();
    }

    @Test
    void directUpdateAllowsCurrentPageName() {
        when(repository.findByNameAndApplicationIdAndViewMode("合同管理", "application", null, false))
                .thenReturn(Mono.just(current));
        PageDTO update = new PageDTO();
        update.setName("合同管理");

        StepVerifier.create(service.updatePage("current", update))
                .assertNext(page -> assertThat(page.getName()).isEqualTo("合同管理"))
                .verifyComplete();
    }

    @Test
    void directUpdateWithoutNamePreservesCurrentName() {
        PageDTO update = new PageDTO();
        update.setDescription("Updated description");

        StepVerifier.create(service.updatePage("current", update))
                .assertNext(page -> {
                    assertThat(page.getName()).isEqualTo("合同管理");
                    assertThat(page.getDescription()).isEqualTo("Updated description");
                })
                .verifyComplete();
    }
}
