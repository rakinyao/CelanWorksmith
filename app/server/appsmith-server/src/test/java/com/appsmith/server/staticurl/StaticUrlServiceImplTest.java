package com.appsmith.server.staticurl;

import com.appsmith.external.dtos.UniqueSlugDTO;
import com.appsmith.external.enums.FeatureFlagEnum;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.aspect.FeatureFlaggedMethodInvokerAspect;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.ApplicationPage;
import com.appsmith.server.domains.NewPage;
import com.appsmith.server.dtos.PageDTO;
import com.appsmith.server.exceptions.AppsmithException;
import com.appsmith.server.helpers.TextUtils;
import com.appsmith.server.newpages.base.NewPageService;
import com.appsmith.server.services.FeatureFlagService;
import com.appsmith.server.solutions.ApplicationPermission;
import com.appsmith.server.solutions.PagePermission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.context.ApplicationContext;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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

    @Test
    void manualSlugTransferRequiresPublishingOriginalPagesMoveFirst() {
        NewPage first = page("a", "First", "first", "old");
        first.getPublishedPage().setUniqueSlug("old");
        NewPage second = page("b", "Second", "second", "second");
        List<NewPage> existing = List.of(first, second);
        List<String> requestedFields = new ArrayList<>();
        when(pageService.findAllByApplicationIds(eq(List.of("app")), anyList())).thenAnswer(invocation -> {
            List<String> fields = invocation.getArgument(1);
            requestedFields.addAll(fields);
            return Flux.fromIterable(existing);
        });
        for (NewPage page : existing) {
            when(pageService.findById(eq(page.getId()), any())).thenReturn(Mono.just(page));
        }
        when(pageService.save(any(NewPage.class))).thenAnswer(invocation -> {
            NewPage page = invocation.getArgument(0);
            storedPages.add(page);
            return Mono.just(page);
        });
        when(analytics.sendPageStaticUrlEvent(any(), any(), eq("app"), any(), any()))
                .thenAnswer(invocation -> Mono.just(invocation.<NewPage>getArgument(1)));

        assertThat(service.isUniquePageSlugAvailable(application, first, "old").block())
                .isTrue();
        updateSlug(first, "new");
        assertThat(first.getUnpublishedPage().getUniqueSlug()).isEqualTo("new");
        assertThat(first.getPublishedPage().getUniqueSlug()).isEqualTo("old");
        assertThat(service.isUniquePageSlugAvailable(application, first, "old").block())
                .isTrue();
        assertThat(service.isUniquePageSlugAvailable(application, second, "old").block())
                .isFalse();
        assertThatThrownBy(() -> updateSlug(second, "old"))
                .isInstanceOf(AppsmithException.class)
                .hasMessageContaining("old")
                .hasMessageContaining("publish")
                .hasMessageContaining("first");
        assertThat(second.getUnpublishedPage().getUniqueSlug()).isEqualTo("second");
        assertThat(storedPages).containsExactly(first);

        // Model the reservation released by a separate successful native publication.
        first.getPublishedPage().setUniqueSlug("new");
        updateSlug(second, "old");
        assertThat(second.getUnpublishedPage().getUniqueSlug()).isEqualTo("old");
        assertThat(storedPages).containsExactly(first, second);
        assertThat(requestedFields).contains(NewPage.Fields.publishedPage_uniqueSlug);
    }

    private void updateSlug(NewPage page, String slug) {
        UniqueSlugDTO dto = new UniqueSlugDTO();
        dto.setBranchedPageId(page.getId());
        dto.setUniquePageSlug(slug);
        service.updatePageSlug(dto).block();
    }

    @Test
    void cloningMissingChineseIdentifierAllocatesWithinDestinationApplication() {
        application.getStaticUrlSettings().setEnabled(true);
        PageDTO incoming = page("new", "\u9996\u9875", "", null).getUnpublishedPage();
        incoming.setApplicationId("app");
        service.updateUniqueSlugBeforeClone(incoming, List.of(page("old", "Old", "old", "page")))
                .block();
        assertThat(incoming.getUniqueSlug()).isEqualTo("page-1");
    }

    @Test
    void importReservesDatabaseAndWholeBatchBeforeFillingChinesePages() {
        application.getStaticUrlSettings().setEnabled(true);
        NewPage missing = page("new", "\u9996\u9875", "", null);
        NewPage supplied = page("supplied", "Other", "other", "page");
        NewPage existing = page("existing", "Existing", "existing", "page-1");
        service.updateUniquePageSlugsBeforeImport(List.of(missing, supplied), List.of(existing), application)
                .block();
        assertThat(missing.getUnpublishedPage().getUniqueSlug()).isEqualTo("page-2");
        assertThat(supplied.getUnpublishedPage().getUniqueSlug()).isEqualTo("page");
        assertThat(existing.getUnpublishedPage().getUniqueSlug()).isEqualTo("page-1");
    }

    @Test
    void publishRepairRestoresOwnPublishedSlugAndOnlySavesDraft() {
        application.getStaticUrlSettings().setEnabled(true);
        NewPage missing = page("a", "\u9996\u9875", "", null);
        pages(List.of(missing), List.of(missing));
        service.preparePagesForPublish(application).block();
        assertThat(storedPages).hasSize(1);
        assertThat(storedPages.get(0).getUnpublishedPage().getUniqueSlug()).isEqualTo("published-a");
        assertThat(storedPages.get(0).getPublishedPage().getUniqueSlug()).isEqualTo("published-a");
        assertThat(storedApplications).isEmpty();
    }

    @Test
    void publishRepairRejectsPublishedDuplicatesBeforeSavingDrafts() {
        application.getStaticUrlSettings().setEnabled(true);
        NewPage first = page("a", "\u9996\u9875", "", null);
        NewPage second = page("b", "Other", "other", null);
        second.getPublishedPage().setUniqueSlug("published-a");
        pages(List.of(first, second), List.of(first, second));
        assertThatThrownBy(() -> service.preparePagesForPublish(application).block())
                .isInstanceOf(AppsmithException.class)
                .hasMessageContaining("published-a");
        assertThat(storedPages).isEmpty();
        assertThat(first.getUnpublishedPage().getUniqueSlug()).isNull();
    }

    @Test
    void prepareCreateAllocatesChineseIdentifierOnlyForEnabledSettings() {
        NewPage existing = page("a", "Home", "home", "page");
        pages(List.of(existing), List.of(existing));
        PageDTO draft = page("new", "\u9996\u9875", "", null).getUnpublishedPage();
        service.preparePageForCreate(draft, application).block();
        assertThat(draft.getUniqueSlug()).isNull();
        application.getStaticUrlSettings().setEnabled(true);
        service.preparePageForCreate(draft, application).block();
        assertThat(draft.getUniqueSlug()).isEqualTo("page-1");
        assertThat(draft.getSlug()).isEmpty();
    }

    @Test
    void importPreservesMatchedGitIdentityAndIgnoresOtherApplications() {
        application.getStaticUrlSettings().setEnabled(true);
        NewPage existing = page("existing", "Before", "before", "stable");
        existing.setGitSyncId("identity");
        NewPage incoming = page("incoming", "\u9996\u9875", "", null);
        incoming.setGitSyncId("identity");
        NewPage unrelated = page("other", "Other", "other", "page");
        unrelated.setApplicationId("other-branch");
        NewPage fresh = page("fresh", "\u8be6\u60c5", "", null);
        service.updateUniquePageSlugsBeforeImport(List.of(incoming, fresh), List.of(existing, unrelated), application)
                .block();
        assertThat(incoming.getUnpublishedPage().getUniqueSlug()).isEqualTo("stable");
        assertThat(fresh.getUnpublishedPage().getUniqueSlug()).isEqualTo("page");
        assertThat(existing.getId()).isEqualTo("existing");
    }

    @Test
    void disabledSettingsLeaveImportCloneAndPublishUnchanged() {
        NewPage page = page("new", "\u9996\u9875", "", null);
        page.getUnpublishedPage().setApplicationId("app");
        service.updateUniquePageSlugsBeforeImport(List.of(page), List.of(), application)
                .block();
        service.updateUniqueSlugBeforeClone(page.getUnpublishedPage(), List.of())
                .block();
        service.preparePagesForPublish(application).block();
        assertThat(page.getUnpublishedPage().getUniqueSlug()).isNull();
        assertThat(application.getStaticUrlSettings().getEnabled()).isNotEqualTo(true);
        assertThat(storedPages).isEmpty();
    }

    @Test
    void compatibleLifecycleHooksDoNotEnableSettingsOrAllocateIdentifiers() {
        StaticUrlServiceCECompatible compatible = new StaticUrlServiceCECompatibleImpl();
        application.getStaticUrlSettings().setEnabled(true);
        PageDTO page = page("new", "\u9996\u9875", "", null).getUnpublishedPage();
        compatible.preparePageForCreate(page, application).block();
        compatible.preparePagesForPublish(application).block();
        assertThat(page.getUniqueSlug()).isNull();
        assertThat(storedPages).isEmpty();
        assertThatThrownBy(() -> compatible
                        .autoGenerateStaticUrl("app", new UniqueSlugDTO())
                        .block())
                .isInstanceOf(AppsmithException.class);
    }

    @Test
    void featureFlagOffRoutesLifecycleHooksThroughCompatibleService() {
        FeatureFlagService flags = mock(FeatureFlagService.class);
        ApplicationContext context = mock(ApplicationContext.class);
        when(flags.check(FeatureFlagEnum.license_static_url_enabled)).thenReturn(Mono.just(false));
        when(context.getBeansOfType(StaticUrlServiceCECompatibleImpl.class))
                .thenReturn(Map.of("staticUrlServiceCECompatibleImpl", new StaticUrlServiceCECompatibleImpl()));
        AspectJProxyFactory factory = new AspectJProxyFactory(service);
        factory.setProxyTargetClass(true);
        factory.addAspect(new FeatureFlaggedMethodInvokerAspect(flags, context));
        StaticUrlService gated = factory.getProxy();
        application.getStaticUrlSettings().setEnabled(true);
        PageDTO draft = page("new", "\u9996\u9875", "", null).getUnpublishedPage();
        gated.preparePageForCreate(draft, application).block();
        gated.preparePagesForPublish(application).block();
        assertThat(draft.getUniqueSlug()).isNull();
        assertThat(storedPages).isEmpty();
    }

    @Test
    void creatingPageWhoseNameLooksLikeMongoIdUsesValidFallback() {
        application.getStaticUrlSettings().setEnabled(true);
        pages(List.of(), List.of());
        PageDTO draft = page("new", "0123456789abcdef01234567", null, null).getUnpublishedPage();
        service.preparePageForCreate(draft, application).block();
        assertThat(draft.getUniqueSlug()).isEqualTo("page");
    }

    @Test
    void publishRejectsMissingDraftBeforeSavingRepairs() {
        application.getStaticUrlSettings().setEnabled(true);
        NewPage missingIdentifier = page("a", "\u9996\u9875", "", null);
        NewPage malformed = page("b", "Other", "other", null);
        malformed.setUnpublishedPage(null);
        pages(List.of(missingIdentifier, malformed), List.of(missingIdentifier, malformed));
        assertThatThrownBy(() -> service.preparePagesForPublish(application).block())
                .isInstanceOf(AppsmithException.class);
        assertThat(storedPages).isEmpty();
        assertThat(missingIdentifier.getUnpublishedPage().getUniqueSlug()).isNull();
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
