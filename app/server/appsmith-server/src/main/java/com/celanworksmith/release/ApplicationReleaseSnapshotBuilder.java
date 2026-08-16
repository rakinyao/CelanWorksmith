package com.celanworksmith.release;

import com.appsmith.external.views.Views;
import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import com.celanworksmith.release.model.ApplicationReleaseStatus;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import reactor.core.publisher.Mono;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

public class ApplicationReleaseSnapshotBuilder {

    private static final String RELEASE_SCHEMA_VERSION = "1";
    private static final Set<String> TRANSIENT_KEYS = Set.of(
            "createdat",
            "updatedat",
            "createdby",
            "modifiedby",
            "deletedat",
            "policymap",
            "policies",
            "userpermissions",
            "publishedpages",
            "publishedapplicationdetail",
            "publishedapplayout",
            "publishedcustomjslibs",
            "viewmode",
            "unreadcommentthreads",
            "appexample",
            "messages",
            "datasourcestorages",
            "isrecentlycreated",
            "lastdeployedat",
            "lasteditedat",
            "modifiedat");
    private static final Pattern URL_USER_INFO =
            Pattern.compile("^([a-z][a-z0-9+.-]*://)[^/@?#]+@", Pattern.CASE_INSENSITIVE);

    private final ObjectMapper objectMapper;

    public ApplicationReleaseSnapshotBuilder() {
        this(new ObjectMapper().findAndRegisterModules());
    }

    public ApplicationReleaseSnapshotBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy();
        this.objectMapper.setConfig(this.objectMapper.getSerializationConfig().withView(Views.Public.class));
    }

    public Mono<ApplicationReleaseSnapshot> build(
            ApplicationReleaseCandidate candidate,
            List<ReleaseDatasourcePin> datasourcePins,
            String actor,
            String message) {
        return build(candidate, datasourcePins, actor, message, List.of());
    }

    public Mono<ApplicationReleaseSnapshot> build(
            ApplicationReleaseCandidate candidate,
            List<ReleaseDatasourcePin> datasourcePins,
            String actor,
            String message,
            List<ReleaseDiagnostic> diagnostics) {
        return Mono.fromSupplier(() -> buildSnapshot(candidate, datasourcePins, actor, message, diagnostics));
    }

    private ApplicationReleaseSnapshot buildSnapshot(
            ApplicationReleaseCandidate candidate,
            List<ReleaseDatasourcePin> datasourcePins,
            String actor,
            String message,
            List<ReleaseDiagnostic> diagnostics) {
        List<ReleaseDatasourcePin> sortedPins = datasourcePins.stream()
                .sorted(Comparator.comparing(ReleaseDatasourcePin::datasourceId, nullableStrings())
                        .thenComparing(ReleaseDatasourcePin::pluginId, nullableStrings())
                        .thenComparing(ReleaseDatasourcePin::kind, nullableStrings())
                        .thenComparing(ReleaseDatasourcePin::providerId, nullableStrings())
                        .thenComparing(ReleaseDatasourcePin::metadataSnapshotId, nullableStrings())
                        .thenComparing(ReleaseDatasourcePin::metadataDigest, nullableStrings())
                        .thenComparing(ReleaseDatasourcePin::providerContractVersion, nullableStrings()))
                .toList();
        ObjectNode applicationContent = objectMapper.createObjectNode();
        applicationContent.set(
                "application", redact(objectMapper.valueToTree(candidate.application()), RedactionContext.SAFE));
        applicationContent.set(
                "pages", redact(objectMapper.valueToTree(candidate.unpublishedPages()), RedactionContext.SAFE));
        applicationContent.set(
                "actions", redact(objectMapper.valueToTree(candidate.unpublishedActions()), RedactionContext.SAFE));
        applicationContent.set(
                "datasources",
                redact(objectMapper.valueToTree(candidate.usedDatasources()), RedactionContext.DATASOURCE));

        ObjectNode digestInput = objectMapper.createObjectNode();
        digestInput.set("applicationContent", ReleaseContentCanonicalizer.canonicalize(applicationContent));
        digestInput.set(
                "datasourcePins", ReleaseContentCanonicalizer.canonicalize(objectMapper.valueToTree(sortedPins)));
        String digest = digest(digestInput);
        Map<String, Object> content =
                objectMapper.convertValue(applicationContent, new TypeReference<Map<String, Object>>() {});
        return new ApplicationReleaseSnapshot(
                UUID.randomUUID().toString(),
                candidate.application().getId(),
                candidate.application().getWorkspaceId(),
                candidate.baseRevisionId(),
                RELEASE_SCHEMA_VERSION,
                actor,
                Instant.now(),
                message,
                digest,
                content,
                sortedPins,
                diagnostics == null ? List.of() : List.copyOf(diagnostics),
                ApplicationReleaseStatus.SNAPSHOT_CREATED);
    }

    private JsonNode redact(JsonNode value, RedactionContext context) {
        if (value == null || value.isValueNode() || value.isNull()) {
            return value;
        }
        if (value.isArray()) {
            ArrayNode result = objectMapper.createArrayNode();
            value.forEach(child -> {
                JsonNode redacted = redact(child, context);
                if (redacted != null && !redacted.isMissingNode()) {
                    result.add(redacted);
                }
            });
            return result;
        }
        JsonNode propertyKey = value.get("key");
        if ((context == RedactionContext.PROPERTY || context == RedactionContext.AUTH_PROPERTY)
                && propertyKey != null
                && propertyKey.isTextual()
                && isSensitiveKey(propertyKey.textValue())) {
            return MissingNode.getInstance();
        }
        ObjectNode result = objectMapper.createObjectNode();
        value.fields().forEachRemaining(entry -> {
            String fieldName = entry.getKey();
            JsonNode fieldValue = entry.getValue();
            String normalizedFieldName = normalizeKey(fieldName);
            if (isSensitiveKey(fieldName)
                    || TRANSIENT_KEYS.contains(normalizedFieldName)
                    || normalizedFieldName.startsWith("published")) {
                return;
            }
            if (context == RedactionContext.AUTH && isAuthenticationSecretField(normalizedFieldName)) {
                return;
            }
            if ((context == RedactionContext.AUTH_PROPERTY || context == RedactionContext.ACTION_PROPERTY)
                    && normalizedFieldName.equals("value")) {
                return;
            }
            if (context == RedactionContext.ACTION_CONFIGURATION && normalizedFieldName.equals("body")) {
                result.set(fieldName, redactActionBody(fieldValue));
                return;
            }
            RedactionContext childContext = childContext(context, normalizedFieldName);
            JsonNode redacted = redact(fieldValue, childContext);
            if (redacted != null
                    && redacted.isTextual()
                    && (context == RedactionContext.DATASOURCE || context == RedactionContext.ACTION_CONFIGURATION)
                    && isUrlField(normalizedFieldName)) {
                redacted = objectMapper.getNodeFactory().textNode(redactUrl(redacted.textValue()));
            }
            if (redacted != null && !redacted.isMissingNode()) {
                result.set(fieldName, redacted);
            }
        });
        return result;
    }

    private JsonNode redactActionBody(JsonNode value) {
        if (value == null || !value.isTextual()) {
            return objectMapper.getNodeFactory().textNode("REDACTED_BODY");
        }
        try {
            JsonNode parsed = objectMapper.readTree(value.textValue());
            if (parsed == null
                    || (!parsed.isObject() && !parsed.isArray())
                    || (parsed.isArray() && containsUnkeyedScalar(parsed))) {
                return objectMapper.getNodeFactory().textNode("REDACTED_BODY");
            }
            JsonNode redacted = redact(parsed, RedactionContext.ACTION_CONFIGURATION);
            return objectMapper.getNodeFactory().textNode(objectMapper.writeValueAsString(redacted));
        } catch (JsonProcessingException exception) {
            return objectMapper.getNodeFactory().textNode("REDACTED_BODY");
        }
    }

    private boolean containsUnkeyedScalar(JsonNode value) {
        if (value.isValueNode() || value.isNull()) {
            return true;
        }
        if (value.isArray()) {
            for (JsonNode child : value) {
                if (containsUnkeyedScalar(child)) {
                    return true;
                }
            }
            return false;
        }
        var fields = value.fields();
        while (fields.hasNext()) {
            JsonNode child = fields.next().getValue();
            if (child.isArray() && containsUnkeyedScalar(child)) {
                return true;
            }
        }
        return false;
    }

    private RedactionContext childContext(RedactionContext context, String normalizedFieldName) {
        if (context == RedactionContext.SAFE) {
            if (normalizedFieldName.equals("datasource")) {
                return RedactionContext.DATASOURCE;
            }
            if (normalizedFieldName.equals("actionconfiguration")) {
                return RedactionContext.ACTION_CONFIGURATION;
            }
        }
        if (context == RedactionContext.DATASOURCE) {
            if (normalizedFieldName.equals("authentication")
                    || normalizedFieldName.equals("sshproxy")
                    || normalizedFieldName.equals("ssl")) {
                return RedactionContext.AUTH;
            }
            if (normalizedFieldName.equals("headers")
                    || normalizedFieldName.equals("queryparameters")
                    || normalizedFieldName.equals("properties")) {
                return RedactionContext.PROPERTY;
            }
            return RedactionContext.DATASOURCE;
        }
        if (context == RedactionContext.ACTION_CONFIGURATION
                && (normalizedFieldName.equals("headers")
                        || normalizedFieldName.equals("autogeneratedheaders")
                        || normalizedFieldName.equals("queryparameters")
                        || normalizedFieldName.equals("bodyformdata")
                        || normalizedFieldName.equals("routeparameters")
                        || normalizedFieldName.equals("pluginspecifiedtemplates")
                        || normalizedFieldName.equals("formdata"))) {
            return normalizedFieldName.equals("bodyformdata") || normalizedFieldName.equals("formdata")
                    ? RedactionContext.ACTION_PROPERTY
                    : RedactionContext.PROPERTY;
        }
        if (context == RedactionContext.AUTH && normalizedFieldName.equals("customauthenticationparameters")) {
            return RedactionContext.AUTH_PROPERTY;
        }
        return context;
    }

    private boolean isAuthenticationSecretField(String normalizedFieldName) {
        return normalizedFieldName.equals("value")
                || normalizedFieldName.equals("password")
                || normalizedFieldName.equals("bearertoken")
                || normalizedFieldName.equals("privatekey")
                || normalizedFieldName.equals("keyfile")
                || normalizedFieldName.equals("base64content")
                || normalizedFieldName.equals("decodedcontent")
                || normalizedFieldName.contains("certificatefile")
                || normalizedFieldName.contains("certificate");
    }

    private enum RedactionContext {
        SAFE,
        DATASOURCE,
        AUTH,
        ACTION_CONFIGURATION,
        PROPERTY,
        AUTH_PROPERTY,
        ACTION_PROPERTY
    }

    private boolean isSensitiveKey(String key) {
        String normalized = normalizeKey(key);
        return normalized.contains("token")
                || normalized.contains("password")
                || normalized.contains("secret")
                || normalized.contains("authorization")
                || normalized.contains("apikey");
    }

    private String normalizeKey(String key) {
        return key.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private Comparator<String> nullableStrings() {
        return Comparator.nullsFirst(String::compareTo);
    }

    private boolean isUrlField(String normalizedFieldName) {
        return normalizedFieldName.contains("url") || normalizedFieldName.contains("endpoint");
    }

    private String redactUrl(String value) {
        String withoutUserInfo = URL_USER_INFO.matcher(value).replaceFirst("$1");
        int queryStart = withoutUserInfo.indexOf('?');
        if (queryStart < 0) {
            return withoutUserInfo;
        }
        int fragmentStart = withoutUserInfo.indexOf('#', queryStart);
        String query =
                withoutUserInfo.substring(queryStart + 1, fragmentStart < 0 ? withoutUserInfo.length() : fragmentStart);
        StringBuilder safeQuery = new StringBuilder();
        for (String parameter : query.split("&")) {
            if (parameter.isBlank()) {
                continue;
            }
            String key = parameter.split("=", 2)[0];
            if (isSensitiveKey(key)) {
                continue;
            }
            if (safeQuery.length() > 0) {
                safeQuery.append('&');
            }
            safeQuery.append(parameter);
        }
        String suffix = fragmentStart < 0 ? "" : withoutUserInfo.substring(fragmentStart);
        return withoutUserInfo.substring(0, queryStart) + (safeQuery.length() == 0 ? "" : "?" + safeQuery) + suffix;
    }

    private String digest(JsonNode value) {
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(ReleaseContentCanonicalizer.canonicalize(value));
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
            StringBuilder result = new StringBuilder("sha256:");
            for (byte current : digest) {
                result.append(String.format("%02x", current));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException | JsonProcessingException exception) {
            throw new IllegalStateException("Unable to digest release content", exception);
        }
    }
}
