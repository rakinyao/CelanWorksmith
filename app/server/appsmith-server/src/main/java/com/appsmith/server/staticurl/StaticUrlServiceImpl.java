package com.appsmith.server.staticurl;

import com.appsmith.external.annotations.FeatureFlagged;
import com.appsmith.external.constants.AnalyticsEvents;
import com.appsmith.external.dtos.UniqueSlugDTO;
import com.appsmith.external.enums.FeatureFlagEnum;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.constants.FieldName;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.Application.Fields;
import com.appsmith.server.domains.Application.StaticUrlSettings;
import com.appsmith.server.domains.ApplicationMode;
import com.appsmith.server.domains.ApplicationPage;
import com.appsmith.server.domains.GitArtifactMetadata;
import com.appsmith.server.domains.NewPage;
import com.appsmith.server.dtos.PageDTO;
import com.appsmith.server.exceptions.AppsmithError;
import com.appsmith.server.exceptions.AppsmithException;
import com.appsmith.server.helpers.GitUtils;
import com.appsmith.server.helpers.TextUtils;
import com.appsmith.server.newpages.base.NewPageService;
import com.appsmith.server.solutions.ApplicationPermission;
import com.appsmith.server.solutions.PagePermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.function.Tuple2;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.appsmith.server.helpers.GitUtils.MAX_RETRIES;

/**
 * Service implementation for managing static URLs and unique slugs for applications and pages.
 *
 * <p>This service provides functionality to:</p>
 * <ul>
 *   <li>Generate and validate unique application slugs</li>
 *   <li>Manage page-level unique slugs within applications</li>
 *   <li>Handle static URL enablement and configuration</li>
 *   <li>Support Git-connected applications with branch-specific slug management</li>
 *   <li>Process slug generation during application imports</li>
 * </ul>
 *
 * <p>The service ensures slug uniqueness across applications and pages while maintaining
 * compatibility with Git workflows and import/export operations.</p>
 *
 * @author Appsmith Team
 * @since 1.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StaticUrlServiceImpl extends StaticUrlServiceCECompatibleImpl implements StaticUrlService {

    protected final NewPageService pageService;
    protected final PagePermission pagePermission;

    protected final ApplicationService applicationService;
    protected final ApplicationPermission applicationPermission;

    protected final StaticUrlAnalyticsUtils staticUrlAnalyticsUtils;

    private static final String SLUG_APPEND_FORMAT = "%s-%s";
    private static final List<String> pageFields = List.of(
            NewPage.Fields.id,
            NewPage.Fields.baseId,
            NewPage.Fields.applicationId,
            NewPage.Fields.refName,
            NewPage.Fields.refType,
            NewPage.Fields.branchName,
            NewPage.Fields.gitSyncId,
            NewPage.Fields.unpublishedPage_uniqueSlug);

    /**
     * Updates the unique slug for an application.
     *
     * <p>This method validates the provided slug format and ensures uniqueness across
     * all applications. For Git-connected applications, it considers the base application
     * ID to maintain proper slug isolation between branches.</p>
     *
     * @param branchedApplicationId the ID of the application (supports branched applications)
     * @param staticUrlDTO contains the unique application slug to be set
     * @return Mono&lt;Application&gt; the updated application with the new slug
     * @throws AppsmithException if the application ID is invalid or slug format is invalid
     * @throws AppsmithException if the slug is already taken by another application
     *
     * @see #isApplicationSlugUnique(Application, String)
     * @see TextUtils#isSlugFormatValid(String)
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<Application> updateApplicationSlug(String branchedApplicationId, UniqueSlugDTO staticUrlDTO) {
        log.info("Starting application slug update for applicationId: {}", branchedApplicationId);

        if (!StringUtils.hasLength(branchedApplicationId)) {
            log.error("Invalid application ID provided: {}", branchedApplicationId);
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PARAMETER, FieldName.APPLICATION_ID));
        }

        if (!StringUtils.hasText(staticUrlDTO.getUniqueApplicationSlug())) {
            log.error("Invalid slug provided for applicationId: {}", branchedApplicationId);
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PROPERTIES_CONFIGURATION));
        }

        log.debug("Input slug: {}", staticUrlDTO.getUniqueApplicationSlug());
        return setUniqueApplicationSlug(branchedApplicationId, staticUrlDTO)
                .doOnSuccess(app ->
                        log.info("Application slug updated successfully for applicationId: {}", branchedApplicationId))
                .doOnError(error -> log.error(
                        "Failed to update application slug for applicationId: {}", branchedApplicationId, error));
    }

    /**
     * Suggests a unique application slug based on the application's current name or slug.
     *
     * <p>This method generates a unique slug by:</p>
     * <ol>
     *   <li>Using the existing slug if available and valid</li>
     *   <li>Converting the application name to a slug format</li>
     *   <li>Appending a random suffix if the slug is already taken</li>
     * </ol>
     *
     * <p>This method is feature-flagged and requires the {@code license_static_url_enabled}
     * feature flag to be enabled.</p>
     *
     * @param branchedApplicationId the ID of the application
     * @return Mono&lt;String&gt; a unique slug suggestion
     * @throws AppsmithException if the application ID is invalid
     * @throws AppsmithException if the application is not found or access is denied
     * @throws AppsmithException if the current slug format is invalid
     *
     * @see #generateUniqueApplicationSlug(Application, String, int)
     * @see FeatureFlagEnum#license_static_url_enabled
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<String> suggestUniqueApplicationSlug(String branchedApplicationId) {
        log.info("Suggesting unique application slug for applicationId: {}", branchedApplicationId);

        if (!StringUtils.hasLength(branchedApplicationId)) {
            log.error("Invalid application ID provided: {}", branchedApplicationId);
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PARAMETER, FieldName.APPLICATION_ID));
        }

        return applicationService
                .findById(branchedApplicationId, applicationPermission.getReadPermission())
                .switchIfEmpty(Mono.error(new AppsmithException(
                        AppsmithError.ACL_NO_RESOURCE_FOUND, FieldName.APPLICATION, branchedApplicationId)))
                .flatMap(application -> {
                    String applicationSlug = getApplicationSlug(application);
                    log.debug("Current application slug: {}", applicationSlug);

                    if (!TextUtils.isSlugFormatValid(applicationSlug)) {
                        log.error("Invalid slug format: {}", applicationSlug);
                        return Mono.error(new AppsmithException(
                                AppsmithError.INVALID_PARAMETER, Fields.staticUrlSettings_uniqueSlug));
                    }

                    return generateUniqueApplicationSlug(application, applicationSlug, 0);
                })
                .doOnSuccess(suggestedSlug -> log.info(
                        "Generated unique slug: {} for applicationId: {}", suggestedSlug, branchedApplicationId))
                .doOnError(error ->
                        log.error("Failed to suggest unique slug for applicationId: {}", branchedApplicationId, error));
    }

    /**
     * Automatically generates and enables static URL for an application.
     *
     * <p>This method enables static URLs for an application by:</p>
     * <ol>
     *   <li>Validating the provided unique slug</li>
     *   <li>Checking slug availability across applications</li>
     *   <li>Enabling static URL settings on the application</li>
     *   <li>Generating unique slugs for all pages in the application</li>
     * </ol>
     *
     * <p>This method is feature-flagged and requires the {@code license_static_url_enabled}
     * feature flag to be enabled.</p>
     *
     * @param branchedApplicationId the ID of the application
     * @param uniqueSlugDTO contains the unique application slug to be set
     * @return Mono&lt;Application&gt; the updated application with static URL enabled
     * @throws AppsmithException if the application ID is invalid
     * @throws AppsmithException if the slug format is invalid
     * @throws AppsmithException if the slug is already taken by another application
     *
     * @see FeatureFlagEnum#license_static_url_enabled
     * @see #generateUniquePageSlugsForApplication(Application)
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<Application> autoGenerateStaticUrl(String branchedApplicationId, UniqueSlugDTO uniqueSlugDTO) {
        log.info("Auto-generating static URL for applicationId: {}", branchedApplicationId);

        if (!StringUtils.hasLength(branchedApplicationId)) {
            log.error("Invalid application ID provided: {}", branchedApplicationId);
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PARAMETER, FieldName.APPLICATION_ID));
        }

        if (!StringUtils.hasText(uniqueSlugDTO.getUniqueApplicationSlug())) {
            log.error("Invalid slug provided for applicationId: {}", branchedApplicationId);
            return Mono.error(
                    new AppsmithException(AppsmithError.INVALID_PARAMETER, Fields.staticUrlSettings_uniqueSlug));
        }

        return applicationService
                .findById(branchedApplicationId, applicationPermission.getEditPermission())
                .switchIfEmpty(Mono.error(new AppsmithException(
                        AppsmithError.ACL_NO_RESOURCE_FOUND, FieldName.APPLICATION, branchedApplicationId)))
                .flatMap(application -> {
                    StaticUrlSettings staticUrlSettings = application.getStaticUrlSettings();

                    // No action required for already enabled static urls
                    if (staticUrlSettings != null && Boolean.TRUE.equals(staticUrlSettings.getEnabled())) {
                        log.info("Static URL already enabled for applicationId: {}", branchedApplicationId);
                        return Mono.just(application);
                    }

                    String normalizedUniqueSlug = TextUtils.makeSlug(uniqueSlugDTO.getUniqueApplicationSlug());
                    log.debug("Normalized slug: {}", normalizedUniqueSlug);

                    if (!TextUtils.isSlugFormatValid(normalizedUniqueSlug)) {
                        log.error("Invalid slug format: {}", normalizedUniqueSlug);
                        return Mono.error(new AppsmithException(
                                AppsmithError.INVALID_PARAMETER, Fields.staticUrlSettings_uniqueSlug));
                    }

                    return isApplicationSlugUnique(application, normalizedUniqueSlug)
                            .flatMap(isSlugAvailable -> {
                                if (!isSlugAvailable) {
                                    log.error("Slug not available: {}", normalizedUniqueSlug);
                                    return Mono.error(new AppsmithException(
                                            AppsmithError.UNIQUE_SLUG_UNAVAILABLE,
                                            FieldName.APPLICATION,
                                            normalizedUniqueSlug));
                                }

                                UniqueSlugDTO slugDTO = new UniqueSlugDTO();
                                slugDTO.setUniqueApplicationSlug(normalizedUniqueSlug);
                                slugDTO.setStaticUrlEnabled(Boolean.TRUE);

                                return applicationService
                                        .findById(application.getId())
                                        .flatMap(dbApplication -> generateUniquePageSlugsForApplication(dbApplication)
                                                .then(Mono.defer(() -> {
                                                    modifyStaticUrlSettings(dbApplication, slugDTO);
                                                    return applicationService.save(dbApplication);
                                                })))
                                        .flatMap(savedApp -> staticUrlAnalyticsUtils
                                                .sendApplicationStaticUrlEvent(
                                                        AnalyticsEvents.STATIC_URL_ENABLED,
                                                        savedApp,
                                                        normalizedUniqueSlug)
                                                .onErrorResume(error -> {
                                                    log.error(
                                                            "Failed to send analytics for STATIC_URL_ENABLED, continuing without analytics",
                                                            error);
                                                    return Mono.just(savedApp);
                                                }));
                            });
                })
                .doOnSuccess(app ->
                        log.info("Static URL auto-generated successfully for applicationId: {}", branchedApplicationId))
                .doOnError(error -> log.error(
                        "Failed to auto-generate static URL for applicationId: {}", branchedApplicationId, error));
    }

    /**
     * Gets the application slug from the application object.
     *
     * <p>This method returns the slug in the following priority order:</p>
     * <ol>
     *   <li>Existing slug if available and not empty</li>
     *   <li>Slug generated from application name</li>
     *   <li>null if neither is available</li>
     * </ol>
     *
     * @param application the application to extract slug from
     * @return String the application slug or null if not available
     */
    private String getApplicationSlug(Application application) {
        if (StringUtils.hasText(application.getSlug())) {
            return application.getSlug();
        }

        if (StringUtils.hasText(application.getName())) {
            return TextUtils.makeSlug(application.getName());
        }

        return null;
    }

    /**
     * Generates a unique application slug by appending random suffixes if needed.
     *
     * <p>This method recursively generates unique slugs by appending a 4-character
     * random UUID suffix when the original slug is already taken. It will retry
     * up to MAX_RETRIES times before giving up.</p>
     *
     * @param application the application for which to generate the slug
     * @param slugName the base slug name to make unique
     * @param retry the current retry count (0-based)
     * @return Mono&lt;String&gt; a unique slug
     * @throws AppsmithException if unable to generate a unique slug after MAX_RETRIES attempts
     *
     * @see #isApplicationSlugUnique(Application, String)
     * @see GitUtils#MAX_RETRIES
     */
    private Mono<String> generateUniqueApplicationSlug(Application application, String slugName, int retry) {
        log.debug("Generating unique application slug: {} (retry: {})", slugName, retry);

        return isApplicationSlugUnique(application, slugName).flatMap(isUniqueNameAvailable -> {
            if (Boolean.TRUE.equals(isUniqueNameAvailable)) {
                log.debug("Slug is unique: {}", slugName);
                return Mono.just(slugName);
            }

            if (retry > MAX_RETRIES) {
                log.error("Failed to generate unique slug after {} retries for base slug: {}", MAX_RETRIES, slugName);
                return Mono.error(new AppsmithException(AppsmithError.DUPLICATE_KEY));
            }

            String suffix = UUID.randomUUID().toString().substring(0, 4);
            String newUniqueSlug = String.format(SLUG_APPEND_FORMAT, slugName, suffix);
            log.debug("Generated new slug with suffix: {}", newUniqueSlug);
            return generateUniqueApplicationSlug(application, newUniqueSlug, retry + 1);
        });
    }

    /**
     * Sets a unique application slug after validation.
     *
     * <p>This method validates the provided slug and ensures it's unique before
     * updating the application. It handles both Git-connected and non-Git applications.</p>
     *
     * @param branchedApplicationId the ID of the application
     * @param staticUrlDTO contains the unique application slug to be set
     * @return Mono&lt;Application&gt; the updated application
     * @throws AppsmithException if the application ID is invalid
     * @throws AppsmithException if the slug format is invalid
     * @throws AppsmithException if the slug is already taken
     */
    private Mono<Application> setUniqueApplicationSlug(String branchedApplicationId, UniqueSlugDTO staticUrlDTO) {
        log.debug("Setting unique application slug for applicationId: {}", branchedApplicationId);

        if (!StringUtils.hasText(branchedApplicationId)) {
            log.error("Invalid application ID provided: {}", branchedApplicationId);
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PARAMETER, FieldName.APPLICATION_ID));
        }

        final String normalizedSlug = TextUtils.makeSlug(staticUrlDTO.getUniqueApplicationSlug());
        log.debug("Normalized slug: {}", normalizedSlug);

        if (!TextUtils.isSlugFormatValid(normalizedSlug)) {
            log.error("Invalid slug format: {}", normalizedSlug);
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PROPERTIES_CONFIGURATION));
        }

        return applicationService
                .findById(branchedApplicationId, applicationPermission.getEditPermission())
                .switchIfEmpty(Mono.error(new AppsmithException(
                        AppsmithError.ACL_NO_RESOURCE_FOUND, FieldName.APPLICATION, branchedApplicationId)))
                .flatMap(application -> {
                    return setUniqueApplicationSlug(application, normalizedSlug);
                });
    }

    /**
     * Sets a unique application slug for the given application.
     *
     * <p>This method checks slug uniqueness and updates the application if the slug
     * is available. It preserves the existing static URL enabled status.</p>
     *
     * @param application the application to update
     * @param normalizedSlug the normalized slug to set
     * @return Mono&lt;Application&gt; the updated application
     * @throws AppsmithException if the slug is already taken
     */
    private Mono<Application> setUniqueApplicationSlug(Application application, String normalizedSlug) {
        log.debug("Setting unique slug: {} for application: {}", normalizedSlug, application.getId());

        StaticUrlSettings staticUrlSettings = application.getStaticUrlSettings();
        if (staticUrlSettings == null || !Boolean.TRUE.equals(staticUrlSettings.getEnabled())) {
            log.error("Static url is not enabled for app: {}", application.getId());
            return Mono.error(new AppsmithException(
                    AppsmithError.INVALID_PARAMETER, Fields.staticUrlSettings, StaticUrlSettings.Fields.enabled));
        }

        return isApplicationSlugUnique(application, normalizedSlug).flatMap(isUniqueSlugAvailable -> {
            if (!Boolean.TRUE.equals(isUniqueSlugAvailable)) {
                log.error("Slug not available: {}", normalizedSlug);
                return Mono.error(new AppsmithException(
                        AppsmithError.DUPLICATE_KEY_USER_ERROR, normalizedSlug, Fields.staticUrlSettings_uniqueSlug));
            }

            UniqueSlugDTO uniqueSlugDTO = new UniqueSlugDTO();
            uniqueSlugDTO.setUniqueApplicationSlug(normalizedSlug);
            uniqueSlugDTO.setStaticUrlEnabled(Boolean.TRUE);

            return applicationService.findById(application.getId()).flatMap(appFromDB -> {
                // Capture previous slug before update for analytics
                String previousSlug = null;
                if (appFromDB.getStaticUrlSettings() != null) {
                    previousSlug = appFromDB.getStaticUrlSettings().getUniqueSlug();
                }
                final String capturedPreviousSlug = previousSlug;

                modifyStaticUrlSettings(appFromDB, uniqueSlugDTO);
                return applicationService.save(appFromDB).flatMap(savedApp -> staticUrlAnalyticsUtils
                        .sendApplicationStaticUrlEvent(
                                AnalyticsEvents.STATIC_URL_APP_SLUG_UPDATED,
                                savedApp,
                                normalizedSlug,
                                capturedPreviousSlug)
                        .onErrorResume(error -> {
                            log.error(
                                    "Failed to send analytics for STATIC_URL_APP_SLUG_UPDATED, continuing without analytics",
                                    error);
                            return Mono.just(savedApp);
                        }));
            });
        });
    }

    /**
     * Checks if the given application slug is unique across all applications.
     *
     * <p>For Git-connected applications, this method ensures that slugs are unique
     * within the same base application (across all branches). For non-Git applications,
     * it checks uniqueness across all applications.</p>
     *
     * @param application the application for which to check slug uniqueness
     * @param normalizedUniqueApplicationSlug the slug to check (must be normalized)
     * @return Mono&lt;Boolean&gt; true if the slug is unique, false otherwise
     *
     * @see GitUtils#isArtifactConnectedToGit(GitArtifactMetadata)
     */
    protected Mono<Boolean> isApplicationSlugUnique(Application application, String normalizedUniqueApplicationSlug) {
        log.debug(
                "Checking application slug uniqueness: {} for applicationId: {}",
                normalizedUniqueApplicationSlug,
                application.getId());

        String baseApplicationId = application.getBaseId();
        log.debug("Base application ID: {}", baseApplicationId);

        return applicationService
                .findByUniqueAppName(normalizedUniqueApplicationSlug, null)
                .filter(app -> {
                    // the base id for other applications should be same as the current one.
                    if (GitUtils.isArtifactConnectedToGit(app.getGitArtifactMetadata())) {
                        log.debug("Git connected application found: {}", app.getId());
                        return !baseApplicationId.equals(
                                app.getGitArtifactMetadata().getDefaultArtifactId());
                    }

                    // valid if the current app has acquired the old name
                    if (app.getId().equals(application.getId())) {
                        log.debug("Same application found, slug is not unique");
                        return Boolean.FALSE;
                    }

                    log.debug("Different application found with same slug: {}", app.getId());
                    return Boolean.TRUE;
                })
                .hasElements()
                .map(Boolean.FALSE::equals)
                .doOnNext(isUnique -> log.debug("Slug uniqueness result: {}", isUnique));
    }

    /**
     * Deletes static URL settings for an application.
     *
     * <p>This method disables static URLs and removes unique slugs from both the
     * application and all its pages. It ensures complete cleanup of static URL
     * configuration.</p>
     *
     * @param branchedApplicationId the ID of the application
     * @return Mono&lt;Application&gt; the updated application with static URL disabled
     * @throws AppsmithException if the application ID is invalid
     * @throws AppsmithException if the application is not found
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<Application> deleteStaticUrlSettings(String branchedApplicationId) {
        log.info("Deleting static URL settings for applicationId: {}", branchedApplicationId);

        if (!StringUtils.hasLength(branchedApplicationId)) {
            log.error("Invalid application ID provided: {}", branchedApplicationId);
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PARAMETER, FieldName.APPLICATION_ID));
        }

        return applicationService
                .findById(branchedApplicationId, applicationPermission.getEditPermission())
                .switchIfEmpty(Mono.error(new AppsmithException(
                        AppsmithError.NO_RESOURCE_FOUND, FieldName.APPLICATION, branchedApplicationId)))
                .flatMap(application -> deleteStaticUrlSettings(application))
                .doOnSuccess(app -> log.info(
                        "Static URL settings deleted successfully for applicationId: {}", branchedApplicationId))
                .doOnError(error -> log.error(
                        "Failed to delete static URL settings for applicationId: {}", branchedApplicationId, error));
    }

    /**
     * Deletes static URL settings for the given application.
     *
     * <p>This method performs the actual deletion by:</p>
     * <ol>
     *   <li>Disabling static URL settings on the application</li>
     *   <li>Removing unique slugs from all pages in the application</li>
     *   <li>Saving all changes to the database</li>
     * </ol>
     *
     * @param application the application to process
     * @return Mono&lt;Application&gt; the updated application
     */
    private Mono<Application> deleteStaticUrlSettings(Application application) {
        log.debug("Processing static URL deletion for application: {}", application.getId());

        disableStaticUrlSettings(application);
        return applicationService.save(application).flatMap(disabledStaticUrlApp -> {
            return pageService
                    .findNewPagesByApplicationId(disabledStaticUrlApp.getId(), null)
                    .collectList()
                    .flatMap(pages -> {
                        log.debug("Found {} pages to update", pages.size());
                        pages.forEach(page -> {
                            PageDTO editPage = page.getUnpublishedPage();
                            PageDTO viewPage = page.getPublishedPage();

                            if (editPage != null) {
                                editPage.setUniqueSlug(null);
                            }

                            if (viewPage != null) {
                                viewPage.setUniqueSlug(null);
                            }
                        });
                        return pageService.saveAll(pages).then(Mono.just(disabledStaticUrlApp));
                    })
                    .flatMap(savedApp -> staticUrlAnalyticsUtils
                            .sendApplicationStaticUrlEvent(AnalyticsEvents.STATIC_URL_DISABLED, savedApp, null)
                            .onErrorResume(error -> {
                                log.error(
                                        "Failed to send analytics for STATIC_URL_DISABLED, continuing without analytics",
                                        error);
                                return Mono.just(savedApp);
                            }));
        });
    }

    /**
     * Disables static URL settings on an application.
     *
     * <p>This method sets the static URL enabled flag to false and clears the
     * unique slug from the application.</p>
     *
     * @param application the application to disable static URLs for
     */
    protected void disableStaticUrlSettings(Application application) {
        log.debug("Disabling static URL settings for application: {}", application.getId());
        application.setStaticUrlSettings(null);
    }

    /**
     * Checks if an application slug is unique and returns the result.
     *
     * <p>This method validates the slug format and checks uniqueness across
     * applications. It returns a DTO containing both the normalized slug and
     * the availability status.</p>
     *
     * @param branchedApplicationId the ID of the application
     * @param uniqueSlug the slug to check for uniqueness
     * @return Mono&lt;UniqueSlugDTO&gt; contains the normalized slug and availability status
     * @throws AppsmithException if the application ID is invalid
     * @throws AppsmithException if the slug format is invalid
     * @throws AppsmithException if the application is not found
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<UniqueSlugDTO> isApplicationSlugUnique(String branchedApplicationId, String uniqueSlug) {
        log.info(
                "Checking application slug uniqueness for applicationId: {}, slug: {}",
                branchedApplicationId,
                uniqueSlug);

        if (!StringUtils.hasLength(branchedApplicationId)) {
            log.error("Invalid application ID provided: {}", branchedApplicationId);
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PARAMETER, FieldName.APPLICATION_ID));
        }

        final String normalizedAppSlug = TextUtils.makeSlug(uniqueSlug);
        log.debug("Normalized app slug: {}", normalizedAppSlug);

        if (!TextUtils.isSlugFormatValid(normalizedAppSlug)) {
            log.error("Invalid slug format: {}", normalizedAppSlug);
            return Mono.error(
                    new AppsmithException(AppsmithError.INVALID_PARAMETER, Fields.staticUrlSettings_uniqueSlug));
        }

        return applicationService
                .findById(branchedApplicationId, applicationPermission.getEditPermission())
                .switchIfEmpty(Mono.error(new AppsmithException(
                        AppsmithError.ACL_NO_RESOURCE_FOUND, FieldName.APPLICATION, branchedApplicationId)))
                .flatMap(application -> {
                    return isApplicationSlugUnique(application, normalizedAppSlug)
                            .map(isUniqueSlugAvailable -> {
                                log.debug("Slug uniqueness result: {}", isUniqueSlugAvailable);
                                UniqueSlugDTO uniqueSlugDTO = new UniqueSlugDTO();
                                uniqueSlugDTO.setUniqueApplicationSlug(normalizedAppSlug);
                                uniqueSlugDTO.setIsUniqueSlugAvailable(isUniqueSlugAvailable);
                                return uniqueSlugDTO;
                            });
                })
                .doOnSuccess(result -> log.info(
                        "Application slug uniqueness check completed for applicationId: {}", branchedApplicationId))
                .doOnError(error -> log.error(
                        "Failed to check application slug uniqueness for applicationId: {}",
                        branchedApplicationId,
                        error));
    }

    /**
     * Modifies static URL settings on an application.
     *
     * <p>This method updates the application's static URL configuration based on
     * the provided DTO. It handles both enabling/disabling static URLs and
     * setting unique slugs.</p>
     *
     * @param application the application to modify
     * @param uniqueSlugDTO contains the new static URL settings
     */
    protected void modifyStaticUrlSettings(Application application, UniqueSlugDTO uniqueSlugDTO) {
        log.debug("Modifying static URL settings for application: {}", application.getId());

        if (application.getStaticUrlSettings() == null) {
            application.setStaticUrlSettings(new StaticUrlSettings());
        }

        StaticUrlSettings staticUrlSettings = application.getStaticUrlSettings();

        if (uniqueSlugDTO.getStaticUrlEnabled() == null
                && !StringUtils.hasText(uniqueSlugDTO.getUniqueApplicationSlug())) {
            log.debug("Disabling static URL settings");
            application.setStaticUrlSettings(null);
            return;
        }

        if (uniqueSlugDTO.getStaticUrlEnabled() != null) {
            log.debug("Setting static URL enabled: {}", uniqueSlugDTO.getStaticUrlEnabled());
            application.getStaticUrlSettings().setEnabled(uniqueSlugDTO.getStaticUrlEnabled());
        }

        if (StringUtils.hasText(uniqueSlugDTO.getUniqueApplicationSlug())) {
            log.debug("Setting unique slug: {}", uniqueSlugDTO.getUniqueApplicationSlug());
            staticUrlSettings.setUniqueSlug(uniqueSlugDTO.getUniqueApplicationSlug());
        }
    }

    // -------------------------------------------- Page operations -------------------------------------------- //

    /**
     * Updates the unique slug for a page.
     *
     * <p>This method validates the provided page slug and ensures it's unique within
     * the application. It handles both setting new slugs and clearing existing ones.</p>
     *
     * @param uniqueSlugDTO contains the page ID and unique slug to be set
     * @return Mono&lt;NewPage&gt; the updated page
     * @throws AppsmithException if the page ID is invalid
     * @throws AppsmithException if the slug format is invalid
     * @throws AppsmithException if the slug is already taken by another page
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<NewPage> updatePageSlug(UniqueSlugDTO uniqueSlugDTO) {
        String pageId = uniqueSlugDTO.getBranchedPageId();
        final String normalizedPageSlug = TextUtils.makeSlug(uniqueSlugDTO.getUniquePageSlug());

        log.info("Updating page slug for pageId: {}", pageId);
        log.debug("Normalized page slug: {}", normalizedPageSlug);

        return verifyUniqueSlugArgs(pageId, normalizedPageSlug)
                .then(pageService.findById(pageId, pagePermission.getEditPermission()))
                .switchIfEmpty(
                        Mono.error(new AppsmithException(AppsmithError.ACL_NO_RESOURCE_FOUND, FieldName.PAGE, pageId)))
                .zipWhen(page -> {
                    return applicationService
                            .findById(page.getApplicationId(), applicationPermission.getEditPermission())
                            .switchIfEmpty(Mono.error(new AppsmithException(
                                    AppsmithError.NO_RESOURCE_FOUND, FieldName.APPLICATION, page.getApplicationId())));
                })
                .flatMap(pageAndAppTuple -> {
                    NewPage page = pageAndAppTuple.getT1();
                    Application app = pageAndAppTuple.getT2();
                    String applicationId = app.getId();

                    // Capture previous slug for analytics
                    String previousSlug = null;
                    if (page.getUnpublishedPage() != null) {
                        previousSlug = page.getUnpublishedPage().getUniqueSlug();
                    }
                    final String capturedPreviousSlug = previousSlug;

                    if (!StringUtils.hasText(normalizedPageSlug)) {
                        log.debug("Clearing page slug for pageId: {}", pageId);
                        PageDTO editPage = page.getUnpublishedPage();
                        if (editPage == null) {
                            return Mono.just(page);
                        }

                        editPage.setUniqueSlug(null);
                        return pageService.save(page).flatMap(savedPage -> staticUrlAnalyticsUtils
                                .sendPageStaticUrlEvent(
                                        AnalyticsEvents.STATIC_URL_PAGE_SLUG_UPDATED,
                                        savedPage,
                                        applicationId,
                                        null,
                                        capturedPreviousSlug)
                                .onErrorResume(error -> {
                                    log.error(
                                            "Failed to send analytics for STATIC_URL_PAGE_SLUG_UPDATED, continuing without analytics",
                                            error);
                                    return Mono.just(savedPage);
                                }));
                    }

                    return isUniquePageSlugAvailable(app, page, normalizedPageSlug)
                            .flatMap(isUniquePageSlugAvailable -> {
                                if (!Boolean.TRUE.equals(isUniquePageSlugAvailable)) {
                                    log.error("Page slug not available: {}", normalizedPageSlug);
                                    return Mono.error(new AppsmithException(
                                            AppsmithError.UNIQUE_SLUG_UNAVAILABLE, FieldName.PAGE, normalizedPageSlug));
                                }

                                return pageService.findById(pageId, null).flatMap(pageFromDB -> {
                                    // Capture previous slug from fresh DB fetch for analytics
                                    String prevSlugFromDB = null;
                                    if (pageFromDB.getUnpublishedPage() != null) {
                                        prevSlugFromDB =
                                                pageFromDB.getUnpublishedPage().getUniqueSlug();
                                    }
                                    final String capturedPrevSlugFromDB = prevSlugFromDB;

                                    PageDTO editPage = pageFromDB.getUnpublishedPage();
                                    if (editPage != null) {
                                        editPage.setUniqueSlug(normalizedPageSlug);
                                    }

                                    return pageService.save(pageFromDB).flatMap(savedPage -> staticUrlAnalyticsUtils
                                            .sendPageStaticUrlEvent(
                                                    AnalyticsEvents.STATIC_URL_PAGE_SLUG_UPDATED,
                                                    savedPage,
                                                    applicationId,
                                                    normalizedPageSlug,
                                                    capturedPrevSlugFromDB)
                                            .onErrorResume(error -> {
                                                log.error(
                                                        "Failed to send analytics for STATIC_URL_PAGE_SLUG_UPDATED, continuing without analytics",
                                                        error);
                                                return Mono.just(savedPage);
                                            }));
                                });
                            });
                })
                .doOnSuccess(updatedPage -> log.info("Page slug updated successfully for pageId: {}", pageId))
                .doOnError(error -> log.error("Failed to update page slug for pageId: {}", pageId, error));
    }

    /**
     * Checks if a page slug is unique within an application.
     *
     * <p>This method ensures that page slugs are unique within the same application.
     * It excludes the current page from the uniqueness check.</p>
     *
     * @param application the application containing the pages
     * @param newPage the page for which to check slug uniqueness
     * @param normalizedUniquePageSlug the slug to check (must be normalized)
     * @return Mono&lt;Boolean&gt; true if the slug is unique, false otherwise
     * @throws AppsmithException if the slug is empty or invalid
     */
    protected Mono<Boolean> isUniquePageSlugAvailable(
            Application application, NewPage newPage, String normalizedUniquePageSlug) {
        log.debug(
                "Checking page slug uniqueness: {} for pageId: {} in applicationId: {}",
                normalizedUniquePageSlug,
                newPage.getId(),
                application.getId());

        if (!StringUtils.hasText(normalizedUniquePageSlug)) {
            log.error("Empty slug provided for pageId: {}", newPage.getId());
            return Mono.error(
                    new AppsmithException(AppsmithError.INVALID_PARAMETER, Fields.staticUrlSettings_uniqueSlug));
        }

        return pageService
                .findAllByApplicationIds(List.of(application.getId()), pageFields)
                .filter(page -> {
                    boolean isDifferentPage = !page.getId().equals(newPage.getId());
                    PageDTO editPageDTO = page.getUnpublishedPage();
                    // unique-page slug utilized by any other page of same app should result in a clash
                    boolean haveSameUniqueSlug =
                            editPageDTO != null && normalizedUniquePageSlug.equals(editPageDTO.getUniqueSlug());
                    return isDifferentPage && haveSameUniqueSlug;
                })
                .hasElements()
                .map(Boolean.FALSE::equals)
                .doOnNext(isUnique -> log.debug("Page slug uniqueness result: {}", isUnique));
    }

    /**
     * Checks if a page slug is unique for Git-connected applications.
     *
     * <p>This method is deprecated and should not be used for new implementations.
     * It was designed for Git-connected applications but has been replaced by
     * {@link #isUniquePageSlugAvailable(Application, NewPage, String)}.</p>
     *
     * @param gitApplication the Git-connected application
     * @param newPage the page for which to check slug uniqueness
     * @param normalizedUniquePageSlug the slug to check (must be normalized)
     * @return Mono&lt;Boolean&gt; true if the slug is unique, false otherwise
     * @throws AppsmithException if the slug is empty or invalid
     *
     * @deprecated Use {@link #isUniquePageSlugAvailable(Application, NewPage, String)} instead
     */
    @Deprecated
    protected Mono<Boolean> isUniquePageSlugAvailableForGitApp(
            Application gitApplication, NewPage newPage, String normalizedUniquePageSlug) {
        log.debug("Using deprecated method isUniquePageSlugAvailableForGitApp for pageId: {}", newPage.getId());

        if (!StringUtils.hasText(normalizedUniquePageSlug)) {
            log.error("Empty slug provided for pageId: {}", newPage.getId());
            return Mono.error(
                    new AppsmithException(AppsmithError.INVALID_PARAMETER, Fields.staticUrlSettings_uniqueSlug));
        }

        String basePageId = newPage.getBaseIdOrFallback();
        String defaultArtifactId = gitApplication.getGitArtifactMetadata().getDefaultArtifactId();

        return applicationService
                .findAllApplicationsByBaseApplicationId(defaultArtifactId, null)
                .map(app -> app.getId())
                .collectList()
                .flatMapMany(applicationIds -> {
                    return pageService.findAllByApplicationIds(applicationIds, pageFields);
                })
                .filter(page -> {
                    // pages with same base page id is not counted as those are the page in question.
                    // unique-page slug should not be utilized by any other page across all branches of the git app.
                    boolean hasDifferentBasePage = !basePageId.equals(page.getBaseIdOrFallback());
                    PageDTO editPageDTO = page.getUnpublishedPage();
                    boolean haveSameUniqueSlug =
                            editPageDTO != null && normalizedUniquePageSlug.equals(editPageDTO.getUniqueSlug());
                    // unique-page slug utilized by any other page of same app should result in a clash
                    return hasDifferentBasePage && haveSameUniqueSlug;
                })
                .hasElements()
                .map(Boolean.FALSE::equals);
    }

    /**
     * Checks if a page slug is unique and returns the result.
     *
     * <p>This method validates the slug format and checks uniqueness within
     * the application. It returns a DTO containing both the normalized slug and
     * the availability status.</p>
     *
     * @param branchedPageId the ID of the page
     * @param uniquePageSlug the slug to check for uniqueness
     * @return Mono&lt;UniqueSlugDTO&gt; contains the normalized slug and availability status
     * @throws AppsmithException if the page ID or slug is invalid
     * @throws AppsmithException if the page or application is not found
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<UniqueSlugDTO> isPageSlugUnique(String branchedPageId, String uniquePageSlug) {
        log.info("Checking page slug uniqueness for pageId: {}, slug: {}", branchedPageId, uniquePageSlug);

        if (!StringUtils.hasText(branchedPageId) || !StringUtils.hasText(uniquePageSlug)) {
            log.error("Invalid parameters - pageId: {}, slug: {}", branchedPageId, uniquePageSlug);
            return Mono.error(new AppsmithException(AppsmithError.GENERIC_BAD_REQUEST));
        }

        final String normalizedPageSlug = TextUtils.makeSlug(uniquePageSlug);
        log.debug("Normalized page slug: {}", normalizedPageSlug);

        return verifyUniqueSlugArgs(branchedPageId, normalizedPageSlug)
                .then(pageService.findById(branchedPageId, pagePermission.getEditPermission()))
                .switchIfEmpty(Mono.error(
                        new AppsmithException(AppsmithError.ACL_NO_RESOURCE_FOUND, FieldName.PAGE, branchedPageId)))
                .zipWhen(page -> {
                    return applicationService
                            .findById(page.getApplicationId(), applicationPermission.getEditPermission())
                            .switchIfEmpty(Mono.error(new AppsmithException(
                                    AppsmithError.NO_RESOURCE_FOUND, FieldName.APPLICATION, page.getApplicationId())));
                })
                .flatMap(pageAndAppTuple -> {
                    NewPage page = pageAndAppTuple.getT1();
                    Application app = pageAndAppTuple.getT2();

                    return isUniquePageSlugAvailable(app, page, normalizedPageSlug)
                            .map(isUniquePageSlugAvailable -> {
                                log.debug("Page slug uniqueness result: {}", isUniquePageSlugAvailable);
                                UniqueSlugDTO uniqueSlugDTO1 = new UniqueSlugDTO();
                                uniqueSlugDTO1.setUniquePageSlug(normalizedPageSlug);
                                uniqueSlugDTO1.setIsUniqueSlugAvailable(isUniquePageSlugAvailable);
                                return uniqueSlugDTO1;
                            });
                })
                .doOnSuccess(result -> log.info("Page slug uniqueness check completed for pageId: {}", branchedPageId))
                .doOnError(error ->
                        log.error("Failed to check page slug uniqueness for pageId: {}", branchedPageId, error));
    }

    /**
     * Verifies the arguments for unique slug operations.
     *
     * <p>This method validates that the page ID is provided and that the slug
     * format is valid if a slug is provided.</p>
     *
     * @param pageId the page ID to validate
     * @param normalizedPageSlug the normalized slug to validate
     * @return Mono&lt;Boolean&gt; true if validation passes
     * @throws AppsmithException if validation fails
     */
    private Mono<Boolean> verifyUniqueSlugArgs(String pageId, String normalizedPageSlug) {
        log.debug("Verifying unique slug arguments for pageId: {}", pageId);

        if (!StringUtils.hasText(pageId)) {
            log.error("Empty page ID provided");
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PARAMETER, FieldName.PAGE_ID));
        }

        if (StringUtils.hasText(normalizedPageSlug) && !TextUtils.isSlugFormatValid(normalizedPageSlug)) {
            log.error("Invalid slug format: {}", normalizedPageSlug);
            return Mono.error(
                    new AppsmithException(AppsmithError.INVALID_PARAMETER, Fields.staticUrlSettings_uniqueSlug));
        }

        return Mono.just(Boolean.TRUE);
    }

    /**
     * Generates unique page slugs for all pages in an application.
     *
     * <p>This method processes all pages in an application and generates unique slugs
     * for pages missing valid static slugs. Existing valid slugs are reserved before allocation,
     * and duplicate slugs or missing unpublished pages are rejected before saving.</p>
     *
     * @param dbApplication the application containing the pages
     * @return Flux&lt;NewPage&gt; the updated pages with unique slugs
     */
    private Flux<NewPage> generateUniquePageSlugsForApplication(Application dbApplication) {
        log.info("Generating unique page slugs for application: {}", dbApplication.getId());

        return pageService
                .findNewPagesByApplicationId(dbApplication.getId(), null)
                .filter(page -> page.getUnpublishedPage() == null
                        || page.getUnpublishedPage().getDeletedAt() == null)
                .collectList()
                .flatMapMany(pages -> {
                    Set<String> reservedSlugs = new HashSet<>();
                    // Preflight the full collection before mutating any page or enabling static URLs.
                    for (NewPage page : pages) {
                        PageDTO editPageDTO = page.getUnpublishedPage();
                        if (editPageDTO == null) {
                            return Flux.error(new AppsmithException(
                                    AppsmithError.INVALID_PARAMETER, "unpublishedPage for page " + page.getId()));
                        }
                        String uniqueSlug = editPageDTO.getUniqueSlug();
                        if (TextUtils.isSlugFormatValid(uniqueSlug) && !reservedSlugs.add(uniqueSlug)) {
                            return Flux.error(new AppsmithException(
                                    AppsmithError.UNIQUE_SLUG_UNAVAILABLE, FieldName.PAGE, uniqueSlug));
                        }
                    }

                    Map<String, Integer> pageOrder = new HashMap<>();
                    if (dbApplication.getPages() != null) {
                        for (int index = 0; index < dbApplication.getPages().size(); index++) {
                            pageOrder.putIfAbsent(
                                    dbApplication.getPages().get(index).getId(), index);
                        }
                    }
                    pages.sort(Comparator.comparingInt(
                                    (NewPage page) -> pageOrder.getOrDefault(page.getId(), Integer.MAX_VALUE))
                            .thenComparing(NewPage::getId, Comparator.nullsLast(Comparator.naturalOrder())));

                    for (NewPage page : pages) {
                        PageDTO editPageDTO = page.getUnpublishedPage();
                        if (TextUtils.isSlugFormatValid(editPageDTO.getUniqueSlug())) {
                            continue;
                        }
                        String preferredSlug = TextUtils.isSlugFormatValid(editPageDTO.getSlug())
                                ? editPageDTO.getSlug()
                                : TextUtils.makeSlug(editPageDTO.getName());
                        editPageDTO.setUniqueSlug(PageSlugAllocator.allocate(
                                TextUtils.isSlugFormatValid(preferredSlug) ? preferredSlug : null, reservedSlugs));
                    }

                    log.info("Generated unique slugs for {} pages", pages.size());
                    return pageService.saveAll(pages);
                });
    }

    // ------------------------- Routing Section ---------------------

    /**
     * Resolves an application and page tuple from static URL names.
     *
     * <p>This method handles the routing logic for static URLs by:</p>
     * <ol>
     *   <li>Finding the application by its unique slug</li>
     *   <li>Verifying that static URLs are enabled for the application</li>
     *   <li>Handling Git-connected applications by resolving to the correct branch</li>
     *   <li>Finding the page by its unique slug or falling back to the default page</li>
     * </ol>
     *
     * <p>For Git-connected applications, if no refName is provided, it resolves to
     * the default branch. If a page slug is not provided, it returns the default page.</p>
     *
     * @param uniqueAppSlug the unique slug of the application
     * @param uniquePageSlug the unique slug of the page (can be null for default page)
     * @param refName the Git reference name (branch name for Git-connected apps)
     * @param mode the application mode (PUBLISHED or EDIT)
     * @return Mono&lt;Tuple2&lt;Application, NewPage&gt;&gt; tuple containing the resolved application and page
     * @throws AppsmithException if the application is not found
     * @throws AppsmithException if the page is not found
     *
     * @see ApplicationMode
     * @see GitUtils#isArtifactConnectedToGit(GitArtifactMetadata)
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<Tuple2<Application, NewPage>> getApplicationAndPageTupleFromStaticNames(
            String uniqueAppSlug, String uniquePageSlug, String refName, ApplicationMode mode) {

        log.info(
                "Resolving application and page from static names - appSlug: {}, pageSlug: {}, mode: {}",
                uniqueAppSlug,
                uniquePageSlug,
                mode);

        Mono<Application> applicationWithUniqueNameMono = applicationService
                .findByUniqueAppNameRefNameAndApplicationMode(uniqueAppSlug, null, mode)
                .filter(application -> {
                    StaticUrlSettings staticUrlSettings = application.getStaticUrlSettings();
                    if (staticUrlSettings == null || !Boolean.TRUE.equals(staticUrlSettings.getEnabled())) {
                        log.debug("Application found with static url has settings disabled");
                        return Boolean.FALSE;
                    }

                    return Boolean.TRUE;
                })
                .next()
                .flatMap(application -> {
                    GitArtifactMetadata gitArtifactMetadata = application.getGitArtifactMetadata();
                    log.debug("Git connected application: {}", GitUtils.isArtifactConnectedToGit(gitArtifactMetadata));
                    // non git connected app, then it's already unique.
                    if (!GitUtils.isArtifactConnectedToGit(gitArtifactMetadata)) {
                        return Mono.just(application);
                    }

                    // Git application only
                    String defaultArtifactId = application.getBaseId();

                    // No name has been provided, moving to default page.
                    return applicationService.findByBaseIdBranchNameAndApplicationMode(
                            defaultArtifactId, refName, mode);
                })
                .switchIfEmpty(Mono.error(
                        new AppsmithException(AppsmithError.NO_RESOURCE_FOUND, FieldName.APPLICATION, uniqueAppSlug)));

        return applicationWithUniqueNameMono
                .zipWhen(application -> {
                    // unique name is not present, let's get to default page
                    if (!StringUtils.hasText(uniquePageSlug)) {
                        log.debug("No page slug provided, resolving to default page");
                        List<ApplicationPage> applicationPages = ApplicationMode.PUBLISHED.equals(mode)
                                ? application.getPublishedPages()
                                : application.getPages();

                        String homePageId = applicationPages.stream()
                                .filter(ApplicationPage::getIsDefault)
                                .map(applicationPage -> applicationPage.getId())
                                .findAny()
                                .get();

                        return pageService
                                .findByIdAndApplicationMode(homePageId, mode)
                                .switchIfEmpty(Mono.error(
                                        new AppsmithException(AppsmithError.NO_RESOURCE_FOUND, FieldName.PAGE)));
                    }

                    log.debug("Resolving page with slug: {}", uniquePageSlug);
                    Mono<NewPage> pageWithPageSlugMono = pageService
                            .findByApplicationIdAndPageSlug(application.getId(), uniquePageSlug, mode, null)
                            .switchIfEmpty(Mono.error(new AppsmithException(
                                    AppsmithError.NO_RESOURCE_FOUND, FieldName.PAGE, uniquePageSlug)));

                    return pageService
                            .findByApplicationIdAndUniquePageSlug(application.getId(), uniquePageSlug, mode)
                            .switchIfEmpty(pageWithPageSlugMono);
                })
                .doOnSuccess(tuple -> log.info("Successfully resolved application and page from static names"))
                .doOnError(error -> log.error("Failed to resolve application and page from static names", error));
    }

    // ------------------------- Import Section ---------------------

    /**
     * Generates and updates application slug for new imports.
     *
     * <p>This method is called when importing a new application to ensure that
     * the application has a unique slug. If the static URL is not enabled or
     * the slug format is invalid, it clears the slug.</p>
     *
     * <p>This method is feature-flagged and requires the {@code license_static_url_enabled}
     * feature flag to be enabled.</p>
     *
     * @param application the application being imported
     * @return Mono&lt;Application&gt; the application with updated slug
     *
     * @see FeatureFlagEnum#license_static_url_enabled
     * @see #generateUniqueApplicationSlug(Application, String, int)
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<Application> generateAndUpdateApplicationSlugForNewImports(Application application) {
        log.info("Generating application slug for new import - applicationId: {}", application.getId());
        StaticUrlSettings staticUrlSettingsFromJson = application.getStaticUrlSettings();
        if (staticUrlSettingsFromJson == null
                || !Boolean.TRUE.equals(staticUrlSettingsFromJson.getEnabled())
                || !TextUtils.isSlugFormatValid(staticUrlSettingsFromJson.getUniqueSlug())) {
            log.debug(
                    "Static URL not enabled or invalid slug format for new import : {}, clearing slug",
                    application.getName());
            application.setStaticUrlSettings(null);
            return Mono.just(application);
        }

        return generateUniqueApplicationSlug(application, staticUrlSettingsFromJson.getUniqueSlug(), 0)
                .map(uniqueApplicationSlug -> {
                    log.debug("Generated unique slug for import: {}", uniqueApplicationSlug);
                    application.getStaticUrlSettings().setUniqueSlug(uniqueApplicationSlug);
                    application.getStaticUrlSettings().setEnabled(Boolean.TRUE);
                    return application;
                })
                .switchIfEmpty(Mono.just(application));
    }

    /**
     * Generates and updates application slug for imports on existing applications.
     *
     * <p>This method is called when importing an application into an existing
     * application to ensure slug uniqueness. It uses the existing application
     * as the base for uniqueness checking.</p>
     *
     * <p>This method is feature-flagged and requires the {@code license_static_url_enabled}
     * feature flag to be enabled.</p>
     *
     * @param applicationFromJson the application being imported from JSON
     * @param applicationFromDB the existing application in the database
     * @return Mono&lt;Application&gt; the application with updated slug
     *
     * @see FeatureFlagEnum#license_static_url_enabled
     * @see #generateUniqueApplicationSlug(Application, String, int)
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<Application> generateAndUpdateApplicationSlugForImportsOnExistingApps(
            Application applicationFromJson, Application applicationFromDB) {
        log.info(
                "Generating application slug for import on existing app - jsonAppId: {}, dbAppId: {}",
                applicationFromJson.getId(),
                applicationFromDB.getId());

        StaticUrlSettings staticUrlSettingsFromJson = applicationFromJson.getStaticUrlSettings();
        if (staticUrlSettingsFromJson == null
                || !Boolean.TRUE.equals(staticUrlSettingsFromJson.getEnabled())
                || !TextUtils.isSlugFormatValid(staticUrlSettingsFromJson.getUniqueSlug())) {
            log.debug(
                    "Static URL not enabled or invalid slug format for import : {}, clearing slug",
                    applicationFromJson.getName());
            applicationFromJson.setStaticUrlSettings(null);
            // should we null it over here?
            applicationFromDB.setStaticUrlSettings(null);
            return Mono.just(applicationFromJson);
        }

        return generateUniqueApplicationSlug(applicationFromDB, staticUrlSettingsFromJson.getUniqueSlug(), 0)
                .map(uniqueApplicationSlug -> {
                    log.debug("Generated unique slug for existing app import: {}", uniqueApplicationSlug);
                    applicationFromJson.getStaticUrlSettings().setEnabled(Boolean.TRUE);
                    applicationFromJson.getStaticUrlSettings().setUniqueSlug(uniqueApplicationSlug);
                    return applicationFromJson;
                })
                .switchIfEmpty(Mono.just(applicationFromJson));
    }

    /**
     * Updates unique page slugs before importing pages.
     *
     * <p>This method processes pages to be imported and ensures that their unique
     * slugs don't conflict with existing pages. It handles both Git-connected
     * and non-Git applications differently.</p>
     *
     * <p>This method is feature-flagged and requires the {@code license_static_url_enabled}
     * feature flag to be enabled.</p>
     *
     * @param pagesToImport the pages being imported
     * @param pagesFromDb the existing pages in the database
     * @param importedApplication the application being imported into
     * @return Mono&lt;List&lt;NewPage&gt;&gt; the pages with updated unique slugs
     *
     * @see FeatureFlagEnum#license_static_url_enabled
     * @see GitUtils#isArtifactConnectedToGit(GitArtifactMetadata)
     */
    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<List<NewPage>> updateUniquePageSlugsBeforeImport(
            List<NewPage> pagesToImport, List<NewPage> pagesFromDb, Application importedApplication) {

        log.info("Updating unique page slugs before import - {} pages to process", pagesToImport.size());

        if (!isStaticUrlEnabled(importedApplication)) {
            return Mono.just(pagesToImport);
        }
        Set<String> reserved = new HashSet<>();
        Map<String, NewPage> existingByGitSyncId = new HashMap<>();
        for (NewPage page : pagesFromDb) {
            if (!importedApplication.getId().equals(page.getApplicationId())) {
                continue;
            }
            reserveSlugs(page, reserved);
            if (StringUtils.hasText(page.getGitSyncId())) {
                existingByGitSyncId.put(page.getGitSyncId(), page);
            }
        }
        List<PageDTO> needsAllocation = new ArrayList<>();
        for (NewPage page : pagesToImport) {
            PageDTO draft = page.getUnpublishedPage();
            if (draft == null || draft.getDeletedAt() != null) {
                continue;
            }
            NewPage existing = existingByGitSyncId.get(page.getGitSyncId());
            String existingSlug = existing == null ? null : stableSlug(existing);
            if (TextUtils.isSlugFormatValid(existingSlug)) {
                draft.setUniqueSlug(existingSlug);
            } else if (!TextUtils.isSlugFormatValid(draft.getUniqueSlug()) || !reserved.add(draft.getUniqueSlug())) {
                needsAllocation.add(draft);
            }
        }
        // Reserve every supplied identifier before allocating missing values in import order.
        for (PageDTO draft : needsAllocation) {
            draft.setUniqueSlug(PageSlugAllocator.allocate(preferredSlug(draft), reserved));
        }
        return Mono.just(pagesToImport);
    }

    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<PageDTO> updateUniqueSlugBeforeClone(PageDTO incomingPageDTO, List<NewPage> existingPagesFromApp) {
        return applicationService.findById(incomingPageDTO.getApplicationId()).map(application -> {
            if (isStaticUrlEnabled(application)) {
                Set<String> reserved = new HashSet<>();
                existingPagesFromApp.stream()
                        .filter(page -> application.getId().equals(page.getApplicationId()))
                        .forEach(page -> reserveSlugs(page, reserved));
                incomingPageDTO.setUniqueSlug(PageSlugAllocator.allocate(preferredSlug(incomingPageDTO), reserved));
            }
            return incomingPageDTO;
        });
    }

    private boolean isStaticUrlEnabled(Application application) {
        return application.getStaticUrlSettings() != null
                && Boolean.TRUE.equals(application.getStaticUrlSettings().getEnabled());
    }

    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<PageDTO> preparePageForCreate(PageDTO page, Application application) {
        if (!isStaticUrlEnabled(application)) {
            return Mono.just(page);
        }
        return pageService
                .findNewPagesByApplicationId(application.getId(), null)
                .collectList()
                .map(existingPages -> {
                    Set<String> reserved = new HashSet<>();
                    existingPages.forEach(existing -> reserveSlugs(existing, reserved));
                    page.setUniqueSlug(PageSlugAllocator.allocate(preferredSlug(page), reserved));
                    return page;
                });
    }

    @Override
    @FeatureFlagged(featureFlagName = FeatureFlagEnum.license_static_url_enabled)
    public Mono<Application> preparePagesForPublish(Application application) {
        if (!isStaticUrlEnabled(application)) {
            return Mono.just(application);
        }
        return pageService
                .findNewPagesByApplicationId(application.getId(), null)
                .collectList()
                .flatMap(pages -> {
                    Map<String, String> owners = new HashMap<>();
                    // Diagnose historical ownership conflicts before changing any draft.
                    for (NewPage page : pages) {
                        PageDTO published = page.getPublishedPage();
                        if (published != null && TextUtils.isSlugFormatValid(published.getUniqueSlug())) {
                            String previous = owners.putIfAbsent(published.getUniqueSlug(), page.getId());
                            if (previous != null && !previous.equals(page.getId())) {
                                return Mono.error(new AppsmithException(
                                        AppsmithError.INVALID_PARAMETER,
                                        "published slug " + published.getUniqueSlug() + " belongs to pages " + previous
                                                + ", " + page.getId()));
                            }
                        }
                    }
                    for (NewPage page : pages) {
                        PageDTO draft = page.getUnpublishedPage();
                        if (draft == null) {
                            return Mono.error(new AppsmithException(
                                    AppsmithError.INVALID_PARAMETER, "unpublishedPage for page " + page.getId()));
                        }
                        if (draft.getDeletedAt() != null) {
                            continue;
                        }
                        String slug = stableSlug(page);
                        if (TextUtils.isSlugFormatValid(slug)) {
                            String previous = owners.putIfAbsent(slug, page.getId());
                            if (previous != null && !previous.equals(page.getId())) {
                                return Mono.error(new AppsmithException(
                                        AppsmithError.INVALID_PARAMETER,
                                        "slug " + slug + " belongs to pages " + previous + ", " + page.getId()));
                            }
                        }
                    }
                    Set<String> reserved = new HashSet<>(owners.keySet());
                    List<NewPage> changed = new ArrayList<>();
                    for (NewPage page : pages) {
                        PageDTO draft = page.getUnpublishedPage();
                        if (draft == null
                                || draft.getDeletedAt() != null
                                || TextUtils.isSlugFormatValid(draft.getUniqueSlug())) {
                            continue;
                        }
                        String slug = stableSlug(page);
                        draft.setUniqueSlug(
                                TextUtils.isSlugFormatValid(slug)
                                        ? slug
                                        : PageSlugAllocator.allocate(preferredSlug(draft), reserved));
                        changed.add(page);
                    }
                    return changed.isEmpty()
                            ? Mono.just(application)
                            : pageService.saveAll(changed).then(Mono.just(application));
                });
    }

    private String preferredSlug(PageDTO page) {
        if (TextUtils.isSlugFormatValid(page.getUniqueSlug())) {
            return page.getUniqueSlug();
        }
        String slug = TextUtils.isSlugFormatValid(page.getSlug()) ? page.getSlug() : TextUtils.makeSlug(page.getName());
        return TextUtils.isSlugFormatValid(slug) ? slug : null;
    }

    private String stableSlug(NewPage page) {
        if (page.getUnpublishedPage() != null
                && TextUtils.isSlugFormatValid(page.getUnpublishedPage().getUniqueSlug())) {
            return page.getUnpublishedPage().getUniqueSlug();
        }
        return page.getPublishedPage() == null ? null : page.getPublishedPage().getUniqueSlug();
    }

    private void reserveSlugs(NewPage page, Set<String> reserved) {
        if (page.getUnpublishedPage() != null
                && TextUtils.isSlugFormatValid(page.getUnpublishedPage().getUniqueSlug())) {
            reserved.add(page.getUnpublishedPage().getUniqueSlug());
        }
        if (page.getPublishedPage() != null
                && TextUtils.isSlugFormatValid(page.getPublishedPage().getUniqueSlug())) {
            reserved.add(page.getPublishedPage().getUniqueSlug());
        }
    }
}
