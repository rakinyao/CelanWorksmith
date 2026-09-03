package com.celanworksmith.ontology.release;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OntologyModelReleaseParserTest {
    private final OntologyModelReleaseParser parser = new OntologyModelReleaseParser();

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
}
