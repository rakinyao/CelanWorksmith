package com.appsmith.server.staticurl;

import com.appsmith.external.dtos.UniqueSlugDTO;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.ApplicationPage;
import com.appsmith.server.domains.NewPage;
import com.appsmith.server.dtos.PageDTO;
import com.appsmith.server.exceptions.AppsmithException;
import com.appsmith.server.helpers.TextUtils;
import com.appsmith.server.newpages.base.NewPageService;
import com.appsmith.server.solutions.ApplicationPermission;
import com.appsmith.server.solutions.PagePermission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StaticUrlServiceImplTest {
    private final NewPageService pageService = mock(NewPageService.class);
    private final ApplicationService applicationService = mock(ApplicationService.class);
    private final ApplicationPermission applicationPermission = mock(ApplicationPermission.class);
    private final StaticUrlAnalyticsUtils analytics = mock(StaticUrlAnalyticsUtils.class);
    private final StaticUrlServiceImpl service = new StaticUrlServiceImpl(
            pageService, mock(PagePermission.class), applicationService, applicationPermission, analytics);
    private final Application application = new Application();
    private final List<NewPage> storedPages = new ArrayList<>();
    private final List<Application> storedApplications = new ArrayList<>();

    @BeforeEach
    void setUp() {
        application.setId("app");
        application.setName("Application");
        application.setStaticUrlSettings(new Application.StaticUrlSettings());
        when(applicationService.findById("app", applicationPermission.getEditPermission()))
                .thenReturn(Mono.just(application));
        when(applicationService.findById("app")).thenReturn(Mono.just(application));
        when(applicationService.findByUniqueAppName("application", null)).thenReturn(Flux.empty());
        when(applicationService.save(any(Application.class))).thenAnswer(invocation -> {
            Application saved = invocation.getArgument(0);
            storedApplications.add(saved);
            return Mono.just(saved);
        });
        when(pageService.saveAll(anyList())).thenAnswer(invocation -> {
            List<NewPage> pages = invocation.getArgument(0);
            storedPages.clear();
            storedPages.addAll(pages);
            return Flux.fromIterable(pages);
        });
        when(analytics.sendApplicationStaticUrlEvent(any(), eq(application), eq("application")))
                .thenReturn(Mono.just(application));
    }

    @Test
    void enablingAllocatesChinesePagesInApplicationOrderAndPreservesPublishedVersions() {
        NewPage first = page("b", "\u9996\u9875", "", null);
        NewPage second = page("a", "\u8be6\u60c5", "", null);
        pages(List.of(first, second), List.of(second, first));

        enable();

        assertThat(storedPages)
                .extracting(p -> p.getUnpublishedPage().getUniqueSlug())
                .containsExactly("page", "page-1");
        assertThat(storedPages).extracting(NewPage::getId).containsExactly("b", "a");
        assertThat(storedPages)
                .extracting(p -> p.getPublishedPage().getUniqueSlug())
                .containsExactly("published-b", "published-a");
        assertThat(application.getStaticUrlSettings().getEnabled()).isTrue();
    }

    @Test
    void enablingReservesAllExistingSlugsBeforeAllocatingAndIsRepeatable() {
        NewPage first = page("a", "\u9996\u9875", "", null);
        NewPage reserved = page("b", "Renamed", "renamed", "page");
        NewPage suffixed = page("c", "Other", "other", "page-1");
        NewPage english = page("d", "Dashboard", "dashboard", "old-dashboard");
        pages(List.of(first, reserved, suffixed, english), List.of(first, reserved, suffixed, english));

        enable();
        assertThat(storedPages)
                .extracting(p -> p.getUnpublishedPage().getUniqueSlug())
                .containsExactly("page-2", "page", "page-1", "old-dashboard");
        application.getStaticUrlSettings().setEnabled(false);
        enable();
        assertThat(storedPages)
                .extracting(p -> p.getUnpublishedPage().getUniqueSlug())
                .containsExactly("page-2", "page", "page-1", "old-dashboard");
    }

    @Test
    void enablingUsesNameWhenOrdinarySlugIsMissing() {
        NewPage page = page("a", "Sales Report", null, null);
        pages(List.of(page), List.of(page));
        enable();
        assertThat(storedPages.get(0).getUnpublishedPage().getUniqueSlug()).isEqualTo("sales-report");
    }

    @Test
    void enablingRejectsMissingUnpublishedPageBeforeAnyWrites() {
        NewPage valid = page("a", "Home", "home", null);
        NewPage malformed = page("b", "Other", "other", null);
        malformed.setUnpublishedPage(null);
        pages(List.of(valid, malformed), List.of(valid, malformed));

        assertThatThrownBy(this::enable).isInstanceOf(AppsmithException.class);
        assertThat(storedPages).isEmpty();
        assertThat(storedApplications).isEmpty();
        assertThat(application.getStaticUrlSettings().getEnabled()).isNotEqualTo(true);
        assertThat(valid.getUnpublishedPage().getUniqueSlug()).isNull();
    }

    @Test
    void enablingRejectsDuplicateExistingSlugsWithoutRenumberingOrEnabling() {
        NewPage first = page("a", "Home", "home", "same");
        NewPage second = page("b", "Other", "other", "same");
        pages(List.of(first, second), List.of(first, second));

        assertThatThrownBy(this::enable).isInstanceOf(AppsmithException.class).hasMessageContaining("same");
        assertThat(storedPages).isEmpty();
        assertThat(storedApplications).isEmpty();
        assertThat(application.getStaticUrlSettings().getEnabled()).isNotEqualTo(true);
        assertThat(first.getUnpublishedPage().getUniqueSlug()).isEqualTo("same");
        assertThat(second.getUnpublishedPage().getUniqueSlug()).isEqualTo("same");
    }

    @Test
    void enablingIgnoresEditDeletedPagesRetainedForPublishedVersions() {
        NewPage active = page("a", "Home", "home", "home");
        NewPage deletedDuplicate = page("b", "Old home", "old-home", "home");
        NewPage deletedMissing = page("c", "Old details", "old-details", null);
        deletedDuplicate.getUnpublishedPage().setDeletedAt(Instant.parse("2026-09-26T00:00:00Z"));
        deletedMissing.getUnpublishedPage().setDeletedAt(Instant.parse("2026-09-26T00:00:00Z"));
        pages(List.of(active), List.of(active, deletedDuplicate, deletedMissing));

        enable();

        assertThat(storedPages).extracting(NewPage::getId).containsExactly("a");
        assertThat(storedPages.get(0).getUnpublishedPage().getUniqueSlug()).isEqualTo("home");
        assertThat(deletedDuplicate.getUnpublishedPage().getUniqueSlug()).isEqualTo("home");
        assertThat(deletedMissing.getUnpublishedPage().getUniqueSlug()).isNull();
        assertThat(deletedDuplicate.getPublishedPage().getUniqueSlug()).isEqualTo("published-b");
        assertThat(deletedMissing.getPublishedPage().getUniqueSlug()).isEqualTo("published-c");
    }

    private void enable() {
        UniqueSlugDTO dto = new UniqueSlugDTO();
        dto.setUniqueApplicationSlug("application");
        service.autoGenerateStaticUrl("app", dto).block();
    }

    private void pages(List<NewPage> orderedPages, List<NewPage> repositoryPages) {
        application.setPages(orderedPages.stream()
                .map(page -> {
                    ApplicationPage reference = new ApplicationPage();
                    reference.setId(page.getId());
                    return reference;
                })
                .toList());
        when(pageService.findNewPagesByApplicationId("app", null)).thenReturn(Flux.fromIterable(repositoryPages));
    }

    private NewPage page(String id, String name, String slug, String uniqueSlug) {
        NewPage page = new NewPage();
        page.setId(id);
        page.setApplicationId("app");
        PageDTO draft = new PageDTO();
        draft.setName(name);
        draft.setSlug(slug);
        draft.setUniqueSlug(uniqueSlug);
        page.setUnpublishedPage(draft);
        PageDTO published = new PageDTO();
        published.setName(name);
        published.setSlug(TextUtils.makeSlug(name));
        published.setUniqueSlug("published-" + id);
        page.setPublishedPage(published);
        return page;
    }
}
