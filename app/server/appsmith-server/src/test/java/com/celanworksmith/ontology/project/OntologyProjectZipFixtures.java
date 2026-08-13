package com.celanworksmith.ontology.project;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public final class OntologyProjectZipFixtures {
    private static final long FIXED_ZIP_ENTRY_TIME = 315532800000L;

    private OntologyProjectZipFixtures() {}

    public static InputStream validZip() {
        Map<String, String> entries = new LinkedHashMap<>();
        entries.put(
                "ontology.yaml",
                """
                projectId: celanworksmith-demo
                version: 1.0.0
                schemaVersion: 1
                objects:
                  - objects/Supplier.yaml
                  - objects/PurchaseOrder.yaml
                links:
                  - links/supplier_orders.yaml
                functions:
                  - functions/CalculateDelayDays.yaml
                actions:
                  - actions/UpdateProductionSchedule.yaml
                """);
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
                    derived: false
                """);
        entries.put(
                "objects/PurchaseOrder.yaml",
                """
                id: PurchaseOrder
                displayName: Purchase Order
                properties:
                  - id: amount
                    displayName: Amount
                    dataType: DECIMAL
                    required: true
                    readOnly: false
                    derived: false
                """);
        entries.put(
                "links/supplier_orders.yaml",
                """
                id: supplier_orders
                displayName: Supplier Orders
                sourceTypeId: Supplier
                targetTypeId: PurchaseOrder
                cardinality: ONE_TO_MANY
                """);
        entries.put(
                "functions/CalculateDelayDays.yaml",
                """
                id: CalculateDelayDays
                displayName: Calculate Delay Days
                returnType: INTEGER
                parameters:
                  - id: poId
                    displayName: Purchase Order
                    dataType: STRING
                    required: true
                    readOnly: false
                    derived: false
                sideEffectFree: true
                """);
        entries.put(
                "actions/UpdateProductionSchedule.yaml",
                """
                id: UpdateProductionSchedule
                displayName: Update Production Schedule
                objectTypeId: PurchaseOrder
                parameters:
                  - id: newScheduleDate
                    displayName: New Schedule Date
                    dataType: DATETIME
                    required: true
                    readOnly: false
                    derived: false
                requiresConfirmation: true
                """);
        return zipWithEntries(entries);
    }

    public static InputStream invalidZip() {
        return zipWithEntries(Map.of(
                "ontology.yaml",
                "projectId: invalid\nversion: 1.0.0\nschemaVersion: 1\nobjects: [objects/Missing.yaml]\n"));
    }

    static InputStream zipWithEntry(String path, String content) {
        return zipWithEntries(Map.of(path, content));
    }

    static InputStream zipWithEntryCount(int entryCount, int contentLength) {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] content = new byte[contentLength];
            try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
                for (int index = 0; index < entryCount; index++) {
                    ZipEntry zipEntry = new ZipEntry("entry-" + index + ".yaml");
                    zipEntry.setTime(FIXED_ZIP_ENTRY_TIME);
                    zip.putNextEntry(zipEntry);
                    zip.write(content);
                    zip.closeEntry();
                }
            }
            return new ByteArrayInputStream(bytes.toByteArray());
        } catch (IOException exception) {
            throw new IllegalStateException("Could not create test ZIP", exception);
        }
    }

    static InputStream zipWithDirectory(String path) {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
                ZipEntry zipEntry = new ZipEntry(path);
                zipEntry.setTime(FIXED_ZIP_ENTRY_TIME);
                zip.putNextEntry(zipEntry);
                zip.closeEntry();
            }
            return new ByteArrayInputStream(bytes.toByteArray());
        } catch (IOException exception) {
            throw new IllegalStateException("Could not create test ZIP", exception);
        }
    }

    static InputStream zipWithEntries(Map<String, String> entries) {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
                for (Map.Entry<String, String> entry : entries.entrySet()) {
                    ZipEntry zipEntry = new ZipEntry(entry.getKey());
                    zipEntry.setTime(FIXED_ZIP_ENTRY_TIME);
                    zip.putNextEntry(zipEntry);
                    zip.write(entry.getValue().getBytes(StandardCharsets.UTF_8));
                    zip.closeEntry();
                }
            }
            return new ByteArrayInputStream(bytes.toByteArray());
        } catch (IOException exception) {
            throw new IllegalStateException("Could not create test ZIP", exception);
        }
    }
}
