package com.celanworksmith.ontology.project;

import com.celanworksmith.CelanWorksmithException;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OntologyProjectYamlImporterTest {
    private final OntologyProjectYamlImporter importer = new OntologyProjectYamlImporter();

    @Test
    void importsValidProjectAsNormalizedOntologyDefinition() {
        OntologyProjectDefinition definition = importer.importZip(OntologyProjectZipFixtures.validZip());

        assertEquals("celanworksmith-demo", definition.projectId());
        assertEquals("1.0.0", definition.version());
        assertEquals(1, definition.schemaVersion());
        assertEquals("Supplier", definition.objectTypes().getFirst().id());
        assertEquals(
                "DECIMAL",
                definition.objectTypes().get(1).properties().getFirst().dataType());
        assertEquals("supplier_orders", definition.linkTypes().getFirst().id());
        assertEquals("CalculateDelayDays", definition.functions().getFirst().id());
        assertEquals("UpdateProductionSchedule", definition.actions().getFirst().id());
    }

    @Test
    void importsOptionalPropertyPresentationMetadata() {
        Map<String, String> entries = validEntries();
        entries.put(
                "objects/Supplier.yaml",
                """
                id: Supplier
                displayName: Supplier
                properties:
                  - id: status
                    displayName: Status
                    dataType: ENUM
                    required: true
                    readOnly: false
                    derived: false
                    group: Commercial
                    order: 20
                    hidden: true
                    enumValues: [PENDING, APPROVED]
                  - id: accountManagerId
                    displayName: Account manager
                    dataType: REFERENCE
                    required: false
                    readOnly: false
                    derived: false
                    referenceTypeId: User
                """);

        var properties = importer.importZip(OntologyProjectZipFixtures.zipWithEntries(entries)).objectTypes().stream()
                .filter(objectType -> objectType.id().equals("Supplier"))
                .findFirst()
                .orElseThrow()
                .properties();

        assertEquals("Commercial", properties.getFirst().group());
        assertEquals(20, properties.getFirst().order());
        assertTrue(properties.getFirst().hidden());
        assertEquals(List.of("PENDING", "APPROVED"), properties.getFirst().enumValues());
        assertEquals("User", properties.get(1).referenceTypeId());
    }

    @Test
    void rejectsDuplicateDefinitionIds() {
        Map<String, String> entries = validEntries();
        entries.put(
                "objects/PurchaseOrder.yaml",
                entries.get("objects/PurchaseOrder.yaml").replace("PurchaseOrder", "Supplier"));

        assertError(entries, "PROJECT_VALIDATION_FAILED");
    }

    @Test
    void rejectsManifestFileThatIsMissingFromZip() {
        Map<String, String> entries = validEntries();
        entries.remove("objects/Supplier.yaml");

        assertError(entries, "PROJECT_INDEXED_FILE_MISSING");
    }

    @Test
    void rejectsLinkReferencingUnknownObjectType() {
        Map<String, String> entries = validEntries();
        entries.put(
                "links/supplier_orders.yaml",
                entries.get("links/supplier_orders.yaml").replace("PurchaseOrder", "MissingObject"));

        assertError(entries, "PROJECT_VALIDATION_FAILED");
    }

    @Test
    void rejectsUnsupportedSchemaVersion() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", entries.get("ontology.yaml").replace("schemaVersion: 1", "schemaVersion: 2"));

        assertError(entries, "PROJECT_SCHEMA_VERSION_UNSUPPORTED");
    }

    @Test
    void rejectsFractionalSchemaVersion() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", entries.get("ontology.yaml").replace("schemaVersion: 1", "schemaVersion: 1.5"));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsStringSchemaVersion() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", entries.get("ontology.yaml").replace("schemaVersion: 1", "schemaVersion: \"1\""));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsBooleanSchemaVersion() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", entries.get("ontology.yaml").replace("schemaVersion: 1", "schemaVersion: true"));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsZipEntryOutsideProjectRoot() {
        InputStream zip = OntologyProjectZipFixtures.zipWithEntry("../escape.yaml", "x");

        CelanWorksmithException exception = assertThrows(CelanWorksmithException.class, () -> importer.importZip(zip));

        assertTrue(exception.getMessage().contains("PROJECT_PATH_INVALID"));
    }

    @Test
    void rejectsZipEntryWithBackslashTraversal() {
        InputStream zip = OntologyProjectZipFixtures.zipWithEntry("..\\escape.yaml", "x");

        assertImporterError(zip, "PROJECT_PATH_INVALID");
    }

    @Test
    void rejectsZipEntryExceedingUncompressedSizeLimit() {
        assertImporterError(
                OntologyProjectZipFixtures.zipWithEntry("oversized.yaml", "x".repeat(1_048_577)),
                "PROJECT_ZIP_INVALID");
    }

    @Test
    void rejectsZipWithMoreThanMaximumEntryCount() {
        assertImporterError(OntologyProjectZipFixtures.zipWithEntryCount(1_001, 1), "PROJECT_ZIP_INVALID");
    }

    @Test
    void rejectsZipExceedingTotalUncompressedSizeLimit() {
        assertImporterError(OntologyProjectZipFixtures.zipWithEntryCount(11, 1_000_000), "PROJECT_ZIP_INVALID");
    }

    @Test
    void rejectsTraversalDirectoryEntryBeforeSkippingIt() {
        assertImporterError(OntologyProjectZipFixtures.zipWithDirectory("../"), "PROJECT_PATH_INVALID");
    }

    @Test
    void rejectsBackslashTraversalDirectoryEntryBeforeSkippingIt() {
        assertImporterError(OntologyProjectZipFixtures.zipWithDirectory("..\\/"), "PROJECT_PATH_INVALID");
    }

    @Test
    void rejectsManifestObjectsThatIsNotAList() {
        Map<String, String> entries = validEntries();
        entries.put(
                "ontology.yaml",
                entries.get("ontology.yaml")
                        .replace(
                                "objects: [objects/Supplier.yaml, objects/PurchaseOrder.yaml]",
                                "objects: objects/Supplier.yaml"));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsObjectPropertiesThatIsNotAList() {
        Map<String, String> entries = validEntries();
        entries.put(
                "objects/Supplier.yaml",
                entries.get("objects/Supplier.yaml").replace("properties: []", "properties: name"));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsStringRequiredFlag() {
        Map<String, String> entries = validEntries();
        entries.put(
                "objects/Supplier.yaml",
                """
                id: Supplier
                displayName: Supplier
                properties:
                  - id: name
                    displayName: Name
                    dataType: STRING
                    required: "true"
                    readOnly: false
                    derived: false
                """);

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsArrayReadOnlyFlag() {
        Map<String, String> entries = validEntries();
        entries.put(
                "objects/Supplier.yaml",
                """
                id: Supplier
                displayName: Supplier
                properties:
                  - id: name
                    displayName: Name
                    dataType: STRING
                    required: true
                    readOnly: []
                    derived: false
                """);

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsObjectDerivedFlag() {
        Map<String, String> entries = validEntries();
        entries.put(
                "objects/Supplier.yaml",
                """
                id: Supplier
                displayName: Supplier
                properties:
                  - id: name
                    displayName: Name
                    dataType: STRING
                    required: true
                    readOnly: false
                    derived: {value: false}
                """);

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsStringSideEffectFreeFlag() {
        Map<String, String> entries = validEntries();
        entries.put(
                "functions/CalculateDelayDays.yaml",
                entries.get("functions/CalculateDelayDays.yaml")
                        .replace("sideEffectFree: true", "sideEffectFree: \"true\""));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsArrayRequiresConfirmationFlag() {
        Map<String, String> entries = validEntries();
        entries.put(
                "actions/UpdateProductionSchedule.yaml",
                entries.get("actions/UpdateProductionSchedule.yaml")
                        .replace("requiresConfirmation: true", "requiresConfirmation: []"));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsManifestWithoutProjectId() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", entries.get("ontology.yaml").replace("projectId: demo\n", ""));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsManifestWithBlankProjectId() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", entries.get("ontology.yaml").replace("projectId: demo", "projectId: \"\""));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsArrayProjectId() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", entries.get("ontology.yaml").replace("projectId: demo", "projectId: []"));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsManifestWithoutVersion() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", entries.get("ontology.yaml").replace("version: 1.0.0\n", ""));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsManifestWithBlankVersion() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", entries.get("ontology.yaml").replace("version: 1.0.0", "version: \"\""));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsObjectVersion() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", entries.get("ontology.yaml").replace("version: 1.0.0", "version: {x: y}"));

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsEmptyYamlDocument() {
        Map<String, String> entries = validEntries();
        entries.put("ontology.yaml", "");

        assertError(entries, "PROJECT_YAML_INVALID");
    }

    @Test
    void rejectsTraversalPathFromInvalidPathResource() throws IOException {
        try (InputStream resource =
                getClass().getResourceAsStream("/celanworksmith/ontology-projects/invalid-path/ontology.yaml")) {
            assertNotNull(resource);

            assertImporterError(
                    OntologyProjectZipFixtures.zipWithEntry(
                            "ontology.yaml", new String(resource.readAllBytes(), StandardCharsets.UTF_8)),
                    "PROJECT_PATH_INVALID");
        }
    }

    @Test
    void createsZipEntriesWithFixedTimestamp() throws IOException {
        try (ZipInputStream zip =
                new ZipInputStream(OntologyProjectZipFixtures.zipWithEntry("ontology.yaml", "projectId: demo"))) {
            assertEquals(315532800000L, zip.getNextEntry().getTime());
        }
    }

    private static Map<String, String> validEntries() {
        return new LinkedHashMap<>(
                Map.ofEntries(
                        Map.entry(
                                "ontology.yaml",
                                """
                        projectId: demo
                        version: 1.0.0
                        schemaVersion: 1
                        objects: [objects/Supplier.yaml, objects/PurchaseOrder.yaml]
                        links: [links/supplier_orders.yaml]
                        functions: [functions/CalculateDelayDays.yaml]
                        actions: [actions/UpdateProductionSchedule.yaml]
                        """),
                        Map.entry(
                                "objects/Supplier.yaml",
                                """
                        id: Supplier
                        displayName: Supplier
                        properties: []
                        """),
                        Map.entry(
                                "objects/PurchaseOrder.yaml",
                                """
                        id: PurchaseOrder
                        displayName: Purchase Order
                        properties: []
                        """),
                        Map.entry(
                                "links/supplier_orders.yaml",
                                """
                        id: supplier_orders
                        displayName: Supplier Orders
                        sourceTypeId: Supplier
                        targetTypeId: PurchaseOrder
                        cardinality: ONE_TO_MANY
                        """),
                        Map.entry(
                                "functions/CalculateDelayDays.yaml",
                                """
                        id: CalculateDelayDays
                        displayName: Calculate Delay Days
                        returnType: INTEGER
                        parameters: []
                        sideEffectFree: true
                        """),
                        Map.entry(
                                "actions/UpdateProductionSchedule.yaml",
                                """
                        id: UpdateProductionSchedule
                        displayName: Update Production Schedule
                        objectTypeId: PurchaseOrder
                        parameters: []
                        requiresConfirmation: true
                        """)));
    }

    private void assertError(Map<String, String> entries, String expectedCode) {
        assertImporterError(OntologyProjectZipFixtures.zipWithEntries(entries), expectedCode);
    }

    private void assertImporterError(InputStream zip, String expectedCode) {
        CelanWorksmithException exception = assertThrows(CelanWorksmithException.class, () -> importer.importZip(zip));

        assertTrue(exception.getMessage().contains(expectedCode));
    }
}
