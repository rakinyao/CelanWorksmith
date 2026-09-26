package com.appsmith.server.services.ce;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.acl.PolicyGenerator;
import com.appsmith.server.actioncollections.base.ActionCollectionService;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.Layout;
import com.appsmith.server.domains.NewPage;
import com.appsmith.server.dtos.ClonePageMetaDTO;
import com.appsmith.server.dtos.PageDTO;
import com.appsmith.server.exceptions.AppsmithException;
import com.appsmith.server.newactions.base.NewActionService;
import com.appsmith.server.newpages.base.NewPageService;
import com.appsmith.server.newpages.base.NewPageServiceCEImpl;
import com.appsmith.server.repositories.ApplicationRepository;
import com.appsmith.server.repositories.NewPageRepository;
import com.appsmith.server.solutions.ActionPermission;
import com.appsmith.server.solutions.ApplicationPermission;
import com.appsmith.server.solutions.PagePermission;
import com.appsmith.server.staticurl.StaticUrlServiceImpl;
import com.appsmith.server.themes.base.ThemeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PageStaticUrlLifecycleTest {
    @Mock
    ApplicationService applications;

    @Mock
    ApplicationPermission applicationPermission;

    @Mock
    PagePermission pagePermission;

    @Mock
    ActionPermission actionPermission;

    @Mock
    NewPageService pages;

    @Mock
    ApplicationRepository applicationRepository;

    @Mock
    PolicyGenerator policyGenerator;

    @Mock
    NewActionService actions;

    @Mock
    ActionCollectionService collections;

    @Mock
    ThemeService themes;

    @InjectMocks
    ApplicationPageServiceCEImpl service;

    private final Application application = new Application();
    private final List<PageDTO> saved = new ArrayList<>();
    private final List<String> published = new ArrayList<>();

    @BeforeEach
    void setup() {
        application.setId("app");
        application.setPages(new ArrayList<>());
        application.setStaticUrlSettings(new Application.StaticUrlSettings());
        application.getStaticUrlSettings().setEnabled(true);
        ReflectionTestUtils.setField(
                service,
                "staticUrlService",
                new StaticUrlServiceImpl(pages, pagePermission, applications, applicationPermission, null));
        when(applicationPermission.getPageCreatePermission()).thenReturn(Mono.just(AclPermission.MANAGE_APPLICATIONS));
        when(applications.findById(eq("app"), any())).thenReturn(Mono.just(application));
        when(applications.findById("app", applicationPermission.getEditPermission()))
                .thenReturn(Mono.just(application));
        when(pages.findNewPagesByApplicationId("app", null)).thenReturn(Flux.empty());
        when(pages.createDefault(any())).thenAnswer(invocation -> {
            PageDTO page = invocation.getArgument(0);
            page.setId("saved-page");
            saved.add(page);
            return Mono.just(page);
        });
        when(applicationRepository.addPageToApplication(eq("app"), anyString(), eq(false), anyString()))
                .thenReturn(Mono.just(1));
        when(applications.saveLastEditInformation("app")).thenReturn(Mono.just(application));
    }

    @Test
    void nativeCreateSavesChinesePageWithAllocatedIdentifier() {
        PageDTO page = new PageDTO();
        page.setApplicationId("app");
        page.setName("\u9996\u9875");
        page.setLayouts(List.of(new Layout()));
        service.createPage(page).block();
        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).getUniqueSlug()).isEqualTo("page");
        assertThat(saved.get(0).getId()).isEqualTo("saved-page");
    }

    @Test
    void nativeCreateLeavesOrdinaryApplicationWithoutStaticIdentifier() {
        application.setStaticUrlSettings(null);
        PageDTO page = new PageDTO();
        page.setApplicationId("app");
        page.setName("\u9996\u9875");
        page.setLayouts(List.of(new Layout()));
        service.createPage(page).block();
        assertThat(saved.get(0).getUniqueSlug()).isNull();
        assertThat(application.getStaticUrlSettings()).isNull();
    }

    @Test
    void nativeCloneReservesDestinationPublishedSlugAndRequestsItsProjection() {
        PageDTO source = new PageDTO();
        source.setId("source-page");
        source.setApplicationId("source-app");
        source.setName("\u9996\u9875");
        source.setSlug("");
        source.setLayouts(List.of());
        NewPage destination = conflictingPage("destination-page");
        destination.getUnpublishedPage().setName("Existing");
        destination.getUnpublishedPage().setUniqueSlug("existing");
        destination.getPublishedPage().setUniqueSlug("page");
        when(pages.findPageById("source-page", pagePermission.getEditPermission(), false))
                .thenReturn(Mono.just(source));
        when(pages.findNewPagesByApplicationId(eq("app"), any(), anyList())).thenAnswer(invocation -> {
            List<String> fields = invocation.getArgument(2);
            assertThat(fields).contains(NewPage.Fields.publishedPage_uniqueSlug);
            return Flux.just(destination);
        });
        when(pages.findNewPagesByApplicationId(eq("source-app"), any(), anyList()))
                .thenReturn(Flux.empty());
        when(applications.findById("app")).thenReturn(Mono.just(application));
        when(applications.save(application)).thenReturn(Mono.just(application));
        ApplicationPageServiceCEImpl cloning = spy(service);
        doReturn(Mono.empty()).when(cloning).clonePageDependentEntities(any());

        PageDTO cloned = cloning.clonePageGivenApplicationId("source-page", "app", null, new ClonePageMetaDTO())
                .block();

        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).getApplicationId()).isEqualTo("app");
        assertThat(saved.get(0).getUniqueSlug()).isEqualTo("page-1");
        assertThat(cloned.getUniqueSlug()).isEqualTo("page-1");
        assertThat(destination.getPublishedPage().getUniqueSlug()).isEqualTo("page");
    }

    @Test
    void nativePublishConflictPreventsActionAndPagePublication() {
        NewPage first = conflictingPage("a");
        NewPage second = conflictingPage("b");
        when(pages.findNewPagesByApplicationId("app", null)).thenReturn(Flux.just(first, second));
        when(actions.publishActions(eq("app"), any())).thenReturn(Mono.fromRunnable(() -> published.add("actions")));
        when(actions.countActionsByPluginType("app")).thenReturn(Flux.empty());
        when(collections.findAllByApplicationIdAndViewMode(eq("app"), eq(false), any(), any()))
                .thenReturn(Flux.defer(() -> {
                    published.add("collections");
                    return Flux.empty();
                }));
        when(pages.publishPages(any(), any())).thenReturn(Mono.fromRunnable(() -> published.add("pages")));
        when(applications.save(application)).thenReturn(Mono.fromSupplier(() -> {
            published.add("application");
            return application;
        }));
        when(themes.publishTheme("app")).thenReturn(Mono.empty());
        assertThatThrownBy(() -> service.publishAndGetMetadata("app", true).block())
                .isInstanceOf(AppsmithException.class)
                .hasMessageContaining("same");
        assertThat(published).isEmpty();
        assertThat(first.getUnpublishedPage().getUniqueSlug()).isNull();
    }

    private NewPage conflictingPage(String id) {
        NewPage page = new NewPage();
        page.setId(id);
        page.setApplicationId("app");
        page.setUnpublishedPage(new PageDTO());
        PageDTO publishedPage = new PageDTO();
        publishedPage.setUniqueSlug("same");
        page.setPublishedPage(publishedPage);
        return page;
    }

    @Test
    void nativeRenamePreservesPageIdAndStaticIdentifier() {
        NewPageRepository repository = mock(NewPageRepository.class);
        NewPageServiceCEImpl pageService = spy(new NewPageServiceCEImpl(
                null, repository, null, applications, null, applicationPermission, pagePermission, null));
        NewPage stored = conflictingPage("existing-id");
        stored.setUpdatedAt(java.time.Instant.now());
        stored.getUnpublishedPage().setName("Home");
        stored.getUnpublishedPage().setUniqueSlug("stable-home");
        when(repository.findById("existing-id", pagePermission.getEditPermission()))
                .thenReturn(Mono.just(stored));
        when(repository.findByNameAndApplicationIdAndViewMode("\u9996\u9875", "app", null, false))
                .thenReturn(Mono.empty());
        doReturn(Mono.just(stored)).when(pageService).update("existing-id", stored);
        PageDTO rename = new PageDTO();
        rename.setName("\u9996\u9875");
        PageDTO renamed = pageService.updatePage("existing-id", rename).block();
        assertThat(renamed.getId()).isEqualTo("existing-id");
        assertThat(renamed.getName()).isEqualTo("\u9996\u9875");
        assertThat(renamed.getUniqueSlug()).isEqualTo("stable-home");
        assertThat(stored.getPublishedPage().getUniqueSlug()).isEqualTo("same");
    }
}
