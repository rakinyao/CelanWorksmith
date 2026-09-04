package com.celanworksmith.ontology.release;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.erdtman.jcs.JsonCanonicalizer;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OntologyModelReleaseParserTest {
    private final OntologyModelReleaseParser parser = new OntologyModelReleaseParser();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parsesTheAuditedBusinessRelease() {
        OntologyModelRelease release = parser.parse(fixtureBytes());

        assertThat(release.release().modelId()).isEqualTo("business-core-demo");
        assertThat(release.release().version()).isEqualTo("1.0.0");
        assertThat(release.elements()).hasSize(20);
    }

    @Test
    void rejectsADigestMismatch() {
        byte[] tampered = fixtureWithReplacement("business-core-demo", "tampered-model");

        assertThatThrownBy(() -> parser.parse(tampered)).hasMessageContaining("digest");
    }

    @Test
    void acceptsAnRfc8785CanonicalDigestForExponentAndDecimalNumbers() {
        assertThat(parser.parse(signedMinimalRelease())).isNotNull();
    }

    @Test
    void rejectsUnknownEnvelopeMembersEvenWhenTheyAreSigned() {
        ObjectNode release = fixture();
        release.put("unrecognized_semantics", true);

        assertThatThrownBy(() -> parser.parse(signed(release))).hasMessageContaining("unknown");
    }

    @Test
    void rejectsRuntimeBindingCredentialsEvenWhenTheyAreSigned() {
        ObjectNode release = fixture();
        runtimeBinding(release).put("password", "not-a-secret");

        assertThatThrownBy(() -> parser.parse(signed(release))).hasMessageContaining("runtime");
    }

    @Test
    void rejectsCompositePrimaryKeysUntilTheLegacyProjectContractSupportsThem() {
        ObjectNode release = minimalRelease();
        ObjectNode entitySpec = (ObjectNode) release.at("/elements/0/spec");
        ((ArrayNode) entitySpec.path("fields")).add(field("b"));
        ((ArrayNode) entitySpec.path("primary_key_fields")).add("b");
        ((ObjectNode) release.at("/elements/1/spec/primary_key_mapping")).put("b", "b");
        ((ObjectNode) release.at("/elements/1/spec/field_mappings")).set("b", runtimeField("b"));

        assertThatThrownBy(() -> parser.parse(signed(release))).hasMessageContaining("composite");
    }

    @Test
    void rejectsElementsOutsideTheReleaseDomain() {
        ObjectNode release = fixture();
        ((ObjectNode) release.path("elements").get(0)).put("domain", "other-domain");

        assertThatThrownBy(() -> parser.parse(signed(release))).hasMessageContaining("domain");
    }

    private static byte[] fixtureBytes() {
        try {
            return Files.readAllBytes(Path.of("../../../docs/superpowers/fixtures/ontology-model-release-demo.json"));
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static byte[] fixtureWithReplacement(String expected, String replacement) {
        return new String(fixtureBytes(), java.nio.charset.StandardCharsets.UTF_8)
                .replace(expected, replacement)
                .getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private ObjectNode fixture() {
        try {
            return (ObjectNode) objectMapper.readTree(fixtureBytes());
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private byte[] signedMinimalRelease() {
        ObjectNode release = minimalRelease();
        ((ArrayNode) release.at("/release/change_set/changes"))
                .addObject()
                .put("weight", 1.0)
                .put("small", 1.0e-7)
                .put("negative_zero", -0.0);
        return signed(release);
    }

    private ObjectNode minimalRelease() {
        ObjectNode document = objectMapper.createObjectNode();
        document.put("format", "ontology-model");
        document.put("format_version", 2);
        ObjectNode release = document.putObject("release");
        release.put("domain", "business");
        release.put("model_id", "minimal");
        release.put("version", "1.0.0");
        release.putNull("previous_release_digest");
        release.put("released_at", "2026-09-02T00:00:00Z");
        release.putObject("change_set").put("compatibility", "INITIAL").putArray("changes");
        ArrayNode elements = document.putArray("elements");
        ObjectNode entity = elements.addObject();
        entity.put("kind", "entity_set");
        entity.put("domain", "business");
        entity.put("name", "thing");
        entity.put("version", "1.0.0");
        ObjectNode entitySpec = entity.putObject("spec");
        entitySpec.putObject("display_name").put("en-US", "Thing");
        entitySpec.putArray("fields").add(field("a"));
        entitySpec.putArray("primary_key_fields").add("a");
        ObjectNode binding = elements.addObject();
        binding.put("kind", "runtime_binding");
        binding.put("domain", "business");
        binding.put("name", "thing_runtime");
        binding.put("version", "1.0.0");
        ObjectNode bindingSpec = binding.putObject("spec");
        bindingSpec.put("entity_set", "thing");
        bindingSpec.put("provider_kind", "GOVERNED_DATASET");
        bindingSpec.put("asset_ref", "dataset:thing");
        bindingSpec.put("access_mode", "READ_ONLY");
        bindingSpec.putObject("primary_key_mapping").put("a", "a");
        bindingSpec.putObject("field_mappings").set("a", runtimeField("a"));
        return document;
    }

    private ObjectNode field(String name) {
        ObjectNode field = objectMapper.createObjectNode();
        field.put("name", name);
        field.put("type", "string");
        field.putObject("display_name").put("en-US", name);
        return field;
    }

    private ObjectNode runtimeField(String column) {
        ObjectNode mapping = objectMapper.createObjectNode();
        mapping.put("column", column);
        mapping.putNull("expression");
        mapping.put("status", "inferred");
        return mapping;
    }

    private ObjectNode runtimeBinding(ObjectNode document) {
        for (JsonNode element : document.path("elements")) {
            if ("runtime_binding".equals(element.path("kind").asText())) return (ObjectNode) element.path("spec");
        }
        throw new IllegalStateException("Fixture runtime binding is missing");
    }

    private byte[] signed(ObjectNode document) {
        try {
            ObjectNode release = (ObjectNode) document.path("release");
            release.remove("release_digest");
            byte[] canonical = new JsonCanonicalizer(objectMapper.writeValueAsBytes(document)).getEncodedUTF8();
            release.put(
                    "release_digest",
                    "sha256:" + hex(MessageDigest.getInstance("SHA-256").digest(canonical)));
            return objectMapper.writeValueAsBytes(document);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static String hex(byte[] bytes) {
        StringBuilder value = new StringBuilder(bytes.length * 2);
        for (byte current : bytes) value.append(String.format("%02x", current));
        return value.toString();
    }
}
