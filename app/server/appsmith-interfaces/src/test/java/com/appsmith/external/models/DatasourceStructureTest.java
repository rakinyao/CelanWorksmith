package com.appsmith.external.models;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class DatasourceStructureTest {

    @Test
    void columnHasANoArgumentConstructorForPersistedStructureMapping() {
        assertDoesNotThrow(() -> {
            new DatasourceStructure.Column();
        });
    }
}
