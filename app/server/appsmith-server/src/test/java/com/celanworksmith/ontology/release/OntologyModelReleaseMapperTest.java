package com.celanworksmith.ontology.release;

import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OntologyModelReleaseMapperTest {
    private final OntologyModelReleaseParser parser = new OntologyModelReleaseParser();
    private final OntologyModelReleaseMapper mapper = new OntologyModelReleaseMapper();

    @Test
    void mapsTheAuditedBusinessReleaseToItsFourObjectsAndLinks() {
        OntologyProjectDefinition definition = mapper.map(parser.parse(fixtureBytes()));

        assertThat(definition.projectId()).isEqualTo("business-core-demo");
        assertThat(definition.version()).isEqualTo("1.0.0");
        assertThat(definition.objectTypes()).extracting(ObjectTypeDTO::id)
                .containsExactlyInAnyOrder("supplier", "customer", "contract", "purchase_order");
        assertThat(definition.linkTypes()).extracting(LinkTypeDTO::id)
                .containsExactlyInAnyOrder(
                        "contract_customer", "contract_supplier", "purchase_order_contract", "purchase_order_supplier");
        assertThat(definition.runtimeMappings().objectMappings()).hasSize(4);
        assertThat(definition.runtimeMappings().linkMappings()).hasSize(4);
        assertThat(definition.objectTypes().stream()
                        .filter(objectType -> objectType.id().equals("contract"))
                        .findFirst()
                        .orElseThrow()
                        .runtimePropertyMappings()
                        .get("customer_code")
                        .column())
                .isEqualTo("customer_code");
        assertThat(definition.linkTypes().stream()
                        .filter(link -> link.id().equals("contract_customer"))
                        .findFirst()
                        .orElseThrow()
                        .fieldMappings())
                .containsExactly(new LinkTypeDTO.FieldMapping("customer_code", "customer_code"));
    }

    @Test
    void rejectsUnsupportedCapabilities() {
        assertThatThrownBy(() -> mapper.map(releaseWithKind("function"))).hasMessageContaining("unsupported");
    }

    @Test
    void rejectsUnverifiedLinks() {
        assertThatThrownBy(() -> mapper.map(releaseWithLinkStatus("INFERRED"))).hasMessageContaining("VERIFIED");
    }

    private OntologyModelRelease releaseWithKind(String kind) {
        OntologyModelRelease release = parser.parse(fixtureBytes());
        List<OntologyModelRelease.Element> elements = new ArrayList<>(release.elements());
        elements.add(new OntologyModelRelease.UnsupportedElement("business", kind, "deferred", "1.0.0"));
        return new OntologyModelRelease(release.format(), release.formatVersion(), release.release(), elements);
    }

    private OntologyModelRelease releaseWithLinkStatus(String status) {
        OntologyModelRelease release = parser.parse(fixtureBytes());
        List<OntologyModelRelease.Element> elements = new ArrayList<>();
        for (OntologyModelRelease.Element element : release.elements()) {
            if (element instanceof OntologyModelRelease.EntitySetLink link) {
                elements.add(new OntologyModelRelease.EntitySetLink(
                        link.domain(),
                        link.name(),
                        link.version(),
                        link.sourceEntitySet(),
                        link.destinationEntitySet(),
                        link.cardinality(),
                        status,
                        link.fieldMappings()));
            } else elements.add(element);
        }
        return new OntologyModelRelease(release.format(), release.formatVersion(), release.release(), elements);
    }

    private static byte[] fixtureBytes() {
        try {
            return Files.readAllBytes(Path.of("../../../docs/superpowers/fixtures/ontology-model-release-demo.json"));
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
