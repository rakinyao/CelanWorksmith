package com.celanworksmith.release;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionDTO;
import com.appsmith.external.models.ApiKeyAuth;
import com.appsmith.external.models.Connection;
import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.Property;
import com.appsmith.external.models.SSHConnection;
import com.appsmith.external.models.SSHPrivateKey;
import com.appsmith.external.models.SSLDetails;
import com.appsmith.external.models.UploadedFile;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.Layout;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.domains.NewPage;
import com.appsmith.server.dtos.PageDTO;
import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import com.celanworksmith.release.model.ApplicationReleaseStatus;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.minidev.json.JSONObject;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApplicationReleaseSnapshotBuilderTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void canonicalizerSortsObjectKeysRecursivelyAndPreservesArrayOrder() throws Exception {
        JsonNode input = objectMapper.readTree(
                "{\"z\":1,\"nested\":{\"b\":2,\"deep\":{\"z\":4,\"a\":5},\"a\":3},\"items\":[{\"z\":4,\"a\":5},2]}");

        JsonNode canonical = ReleaseContentCanonicalizer.canonicalize(input);

        assertThat(canonical.toString())
                .isEqualTo(
                        "{\"items\":[{\"a\":5,\"z\":4},2],\"nested\":{\"a\":3,\"b\":2,\"deep\":{\"a\":5,\"z\":4}},\"z\":1}");
    }

    @Test
    void equivalentContentAndPinOrderProducesTheSameDigest() {
        ApplicationReleaseSnapshot first =
                buildSnapshot(application("app", "workspace", "same"), List.of(pin("b"), pin("a")));
        ApplicationReleaseSnapshot second =
                buildSnapshot(application("app", "workspace", "same"), List.of(pin("a"), pin("b")));

        assertThat(first.contentDigest()).isEqualTo(second.contentDigest());
    }

    @Test
    void duplicatePinIdentityStillSortsByEveryOptionalField() {
        ReleaseDatasourcePin providerA =
                new ReleaseDatasourcePin("a", "plugin", "ONTOLOGY", "provider-a", "snapshot", "digest", "1");
        ReleaseDatasourcePin providerB =
                new ReleaseDatasourcePin("a", "plugin", "ONTOLOGY", "provider-b", "snapshot", "digest", "1");

        ApplicationReleaseSnapshot first =
                buildSnapshot(application("app", "workspace", "same"), List.of(providerB, providerA));
        ApplicationReleaseSnapshot second =
                buildSnapshot(application("app", "workspace", "same"), List.of(providerA, providerB));

        assertThat(first.contentDigest()).isEqualTo(second.contentDigest());
    }

    @Test
    void builderDigestIgnoresNestedObjectInsertionOrder() {
        ApplicationReleaseSnapshot first = buildSnapshot(
                application("app", "workspace", "same"),
                List.of(unpublishedPageWithWidgetOrder(false)),
                List.of(pin("a")));
        ApplicationReleaseSnapshot second = buildSnapshot(
                application("app", "workspace", "same"),
                List.of(unpublishedPageWithWidgetOrder(true)),
                List.of(pin("a")));

        assertThat(first.contentDigest()).isEqualTo(second.contentDigest());
    }

    @Test
    void redactsSecretsFromEmbeddedUnpublishedActionDatasourceAndConfiguration() throws Exception {
        Datasource embeddedDatasource = new Datasource();
        embeddedDatasource.setId("embedded-datasource");
        embeddedDatasource.setPluginId("restApi");
        DatasourceConfiguration datasourceConfiguration = new DatasourceConfiguration();
        datasourceConfiguration.setUrl(
                "https://embedded-user:embedded-password@example.test?api_key=embedded-query-secret");
        ApiKeyAuth authentication =
                ApiKeyAuth.builder().value("embedded-api-secret").build();
        authentication.setCustomAuthenticationParameters(Set.of(new Property("custom", "embedded-custom-secret")));
        datasourceConfiguration.setAuthentication(authentication);
        embeddedDatasource.setDatasourceConfiguration(datasourceConfiguration);

        ActionConfiguration actionConfiguration = new ActionConfiguration();
        actionConfiguration.setHeaders(List.of(new Property("X-Api-Key", "embedded-header-secret")));
        actionConfiguration.setQueryParameters(List.of(new Property("password", "embedded-query-parameter-secret")));
        actionConfiguration.setBodyFormData(List.of(new Property("custom", "embedded-body-secret")));
        actionConfiguration.setBody(
                "{\"password\":\"embedded-json-body-secret\",\"token\":\"embedded-json-token\",\"authorization\":\"embedded-json-authorization\",\"safe\":\"safe-body\"}");
        ActionDTO actionDTO = new ActionDTO();
        actionDTO.setDatasource(embeddedDatasource);
        actionDTO.setActionConfiguration(actionConfiguration);
        NewAction action = new NewAction();
        action.setUnpublishedAction(actionDTO);

        ApplicationReleaseSnapshot snapshot =
                buildSnapshot(application("app", "workspace", "same"), List.of(), List.of(action), List.of(pin("a")));

        String serialized = objectMapper.writeValueAsString(snapshot.applicationContent());
        assertThat(serialized)
                .doesNotContain(
                        "embedded-user",
                        "embedded-password",
                        "embedded-query-secret",
                        "embedded-api-secret",
                        "embedded-custom-secret",
                        "embedded-header-secret",
                        "embedded-query-parameter-secret",
                        "embedded-body-secret",
                        "embedded-json-body-secret",
                        "embedded-json-token",
                        "embedded-json-authorization",
                        "\"password\"",
                        "\"token\"",
                        "\"authorization\"");

        actionConfiguration.setBody("not-json password=embedded-malformed-secret");
        ApplicationReleaseSnapshot malformedSnapshot =
                buildSnapshot(application("app", "workspace", "same"), List.of(), List.of(action), List.of(pin("a")));
        String malformedSerialized = objectMapper.writeValueAsString(malformedSnapshot.applicationContent());
        assertThat(malformedSerialized)
                .doesNotContain("embedded-malformed-secret")
                .contains("REDACTED_BODY");

        actionConfiguration.setBody("\"embedded-json-scalar-secret\"");
        ApplicationReleaseSnapshot scalarSnapshot =
                buildSnapshot(application("app", "workspace", "same"), List.of(), List.of(action), List.of(pin("a")));
        String scalarSerialized = objectMapper.writeValueAsString(scalarSnapshot.applicationContent());
        assertThat(scalarSerialized)
                .doesNotContain("embedded-json-scalar-secret", "\\\"embedded-json-scalar-secret\\\"");

        actionConfiguration.setBody("[\"embedded-json-array-secret\",\"ordinary-text\"]");
        ApplicationReleaseSnapshot scalarArraySnapshot =
                buildSnapshot(application("app", "workspace", "same"), List.of(), List.of(action), List.of(pin("a")));
        String scalarArraySerialized = objectMapper.writeValueAsString(scalarArraySnapshot.applicationContent());
        assertThat(scalarArraySerialized)
                .doesNotContain(
                        "embedded-json-array-secret", "[\\\"embedded-json-array-secret\\\",\\\"ordinary-text\\\"]");
    }

    @Test
    void unpublishedWidgetBindingChangeChangesContentAndDigest() throws Exception {
        NewPage firstPage = unpublishedPage("{{QueryA.data}}", "page-1");
        NewPage secondPage = unpublishedPage("{{QueryB.data}}", "page-1");
        ApplicationReleaseSnapshot first =
                buildSnapshot(application("app", "workspace", "same"), List.of(firstPage), List.of(pin("a")));
        ApplicationReleaseSnapshot second =
                buildSnapshot(application("app", "workspace", "same"), List.of(secondPage), List.of(pin("a")));

        assertThat(objectMapper.writeValueAsString(first.applicationContent())).contains("QueryA.data");
        assertThat(objectMapper.writeValueAsString(second.applicationContent())).contains("QueryB.data");
        assertThat(objectMapper.writeValueAsString(first.applicationContent())).doesNotContain("PublishedOnly");
        assertThat(first.contentDigest()).isNotEqualTo(second.contentDigest());
    }

    @Test
    void snapshotOmitsSecretsAndRuntimeOnlyUserData() throws Exception {
        Datasource datasource = new Datasource();
        datasource.setId("datasource-1");
        datasource.setPluginId("restApi");
        datasource.setDatasourceConfiguration(new DatasourceConfiguration());
        datasource
                .getDatasourceConfiguration()
                .setAuthentication(ApiKeyAuth.builder().value("api-key-secret").build());
        datasource
                .getDatasourceConfiguration()
                .setSshProxy(new SSHConnection(
                        "ssh.example",
                        22L,
                        null,
                        "ssh-user",
                        SSHConnection.AuthType.IDENTITY_FILE,
                        new SSHPrivateKey(new UploadedFile("id_rsa", "c3NoLWZpbGU="), "ssh-password")));
        datasource
                .getDatasourceConfiguration()
                .setConnection(new Connection(
                        null,
                        null,
                        new SSLDetails(
                                null,
                                null,
                                new UploadedFile("key", "c3NsLWtleQ=="),
                                new UploadedFile("certificate", "c3NsLWNlcnQ="),
                                new UploadedFile("ca", "c3NsLWNh"),
                                null,
                                null,
                                null),
                        null));
        ApiKeyAuth nestedAuthentication =
                ApiKeyAuth.builder().value("nested-api-secret").build();
        nestedAuthentication.setCustomAuthenticationParameters(Set.of(new Property("safe-label", "custom-secret")));
        datasource.getDatasourceConfiguration().setAuthentication(nestedAuthentication);
        datasource
                .getDatasourceConfiguration()
                .setUrl("https://user:password@example.test/items?api_key=query-secret&safe=1");
        datasource
                .getDatasourceConfiguration()
                .setHeaders(List.of(
                        new Property("Authorization", "Bearer secret-token"),
                        new Property("X-Api-Key", "header-secret"),
                        new Property("api_key", "underscore-secret"),
                        new Property("safe", "safe-value")));

        Application application = application("app", "workspace", "safe");
        application.setUnreadCommentThreads(7);

        ApplicationReleaseSnapshot snapshot = new ApplicationReleaseSnapshotBuilder(objectMapper)
                .build(
                        new ApplicationReleaseCandidate(
                                application, List.of(new NewAction()), List.of(), List.of(datasource), "revision-7"),
                        List.of(pin("datasource-1")),
                        "actor-1",
                        "release message")
                .block();

        String serialized = objectMapper.writeValueAsString(snapshot);
        assertThat(serialized)
                .doesNotContain(
                        "password",
                        "query-secret",
                        "secret-token",
                        "Bearer",
                        "header-secret",
                        "underscore-secret",
                        "Authorization",
                        "X-Api-Key",
                        "api_key",
                        "unreadCommentThreads",
                        "api-key-secret",
                        "nested-api-secret",
                        "custom-secret",
                        "c3NoLWZpbGU=",
                        "c3NsLWtleQ==",
                        "c3NsLWNlcnQ=",
                        "c3NsLWNh");
        assertThat(serialized).contains("safe-value", "safe=1");
    }

    @Test
    void snapshotIncludesProvenanceAndCreatedStatus() {
        ApplicationReleaseSnapshot snapshot = buildSnapshot(application("app", "workspace", "same"), List.of(pin("a")));

        assertThat(snapshot.applicationId()).isEqualTo("app");
        assertThat(snapshot.workspaceId()).isEqualTo("workspace");
        assertThat(snapshot.baseRevisionId()).isEqualTo("revision-7");
        assertThat(snapshot.createdBy()).isEqualTo("actor-1");
        assertThat(snapshot.releaseMessage()).isEqualTo("release message");
        assertThat(snapshot.status()).isEqualTo(ApplicationReleaseStatus.SNAPSHOT_CREATED);
        assertThat(snapshot.contentDigest()).startsWith("sha256:");
    }

    @Test
    void snapshotPreservesValidationDiagnostics() {
        ReleaseDiagnostic warning = new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.WARNING, "RELEASE_WARNING", "release", "safe warning", Map.of());

        ApplicationReleaseSnapshot snapshot = new ApplicationReleaseSnapshotBuilder(objectMapper)
                .build(
                        new ApplicationReleaseCandidate(
                                application("app", "workspace", "same"), List.of(), List.of(), "revision-7"),
                        List.of(),
                        "actor-1",
                        "release message",
                        List.of(warning))
                .block();

        assertThat(snapshot.diagnostics()).containsExactly(warning);
    }

    @Test
    void snapshotContentIsDeeplyImmutable() throws Exception {
        NewPage page = unpublishedPage("{{QueryA.data}}", "page-1");
        ApplicationReleaseSnapshot snapshot =
                buildSnapshot(application("app", "workspace", "same"), List.of(page), List.of(pin("a")));

        assertThatThrownBy(() ->
                        ((Map<String, Object>) snapshot.applicationContent().get("application")).put("changed", true))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> ((List<Object>) snapshot.applicationContent().get("pages")).add("changed"))
                .isInstanceOf(UnsupportedOperationException.class);
        Map<String, Object> pageMap = (Map<String, Object>)
                ((List<Object>) snapshot.applicationContent().get("pages")).get(0);
        Map<String, Object> pageContent = (Map<String, Object>) pageMap.get("unpublishedPage");
        List<Object> layouts = (List<Object>) pageContent.get("layouts");
        Map<String, Object> layout = (Map<String, Object>) layouts.get(0);
        assertThatThrownBy(() -> ((Map<String, Object>) layout.get("dsl")).put("changed", true))
                .isInstanceOf(UnsupportedOperationException.class);
        String serialized = objectMapper.writeValueAsString(snapshot.applicationContent());
        assertThat(serialized).contains("QueryA.data").doesNotContain("runtime-user", "userPermissions");
    }

    private ApplicationReleaseSnapshot buildSnapshot(Application application, List<ReleaseDatasourcePin> pins) {
        return buildSnapshot(application, List.of(), List.of(), pins);
    }

    private ApplicationReleaseSnapshot buildSnapshot(
            Application application, List<NewPage> pages, List<ReleaseDatasourcePin> pins) {
        return buildSnapshot(application, pages, List.of(), pins);
    }

    private ApplicationReleaseSnapshot buildSnapshot(
            Application application, List<NewPage> pages, List<NewAction> actions, List<ReleaseDatasourcePin> pins) {
        return new ApplicationReleaseSnapshotBuilder(objectMapper)
                .build(
                        new ApplicationReleaseCandidate(application, actions, pages, List.of(), "revision-7"),
                        pins,
                        "actor-1",
                        "release message")
                .block();
    }

    private NewPage unpublishedPage(String binding, String pageId) {
        return unpublishedPageWithWidgetOrder(binding, pageId, false);
    }

    private NewPage unpublishedPageWithWidgetOrder(boolean reverse) {
        return unpublishedPageWithWidgetOrder("{{QueryA.data}}", "page-1", reverse);
    }

    private NewPage unpublishedPageWithWidgetOrder(String binding, String pageId, boolean reverse) {
        JSONObject widget = new JSONObject();
        if (reverse) {
            widget.put("text", binding);
            widget.put("widgetName", "Text1");
        } else {
            widget.put("widgetName", "Text1");
            widget.put("text", binding);
        }
        JSONObject dsl = new JSONObject();
        dsl.put("widget", widget);
        Layout layout = new Layout();
        layout.setDsl(dsl);
        PageDTO pageDTO = new PageDTO();
        pageDTO.setName("Orders");
        pageDTO.setLayouts(List.of(layout));
        NewPage page = new NewPage();
        page.setId(pageId);
        page.setApplicationId("app");
        page.setUnpublishedPage(pageDTO);
        PageDTO publishedPage = new PageDTO();
        publishedPage.setName("PublishedOnly");
        page.setPublishedPage(publishedPage);
        page.getUnpublishedPage().getUserPermissions().add("runtime-user");
        layout.getUserPermissions().add("runtime-user");
        return page;
    }

    private Application application(String id, String workspaceId, String name) {
        Application application = new Application();
        application.setId(id);
        application.setWorkspaceId(workspaceId);
        application.setName(name);
        return application;
    }

    private ReleaseDatasourcePin pin(String datasourceId) {
        return new ReleaseDatasourcePin(datasourceId, "plugin", "NATIVE", null, null, null, null);
    }
}
