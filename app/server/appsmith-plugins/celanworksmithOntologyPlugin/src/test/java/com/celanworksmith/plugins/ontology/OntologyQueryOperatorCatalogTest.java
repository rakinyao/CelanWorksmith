package com.celanworksmith.plugins.ontology;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OntologyQueryOperatorCatalogTest {

    @Test
    void returnsStringOperatorsWithStableValuesAndLabels() {
        assertEquals(
                List.of(
                        new OntologyQueryOperatorCatalog.MetadataOperator("equals", "Equals"),
                        new OntologyQueryOperatorCatalog.MetadataOperator("contains", "Contains"),
                        new OntologyQueryOperatorCatalog.MetadataOperator("startsWith", "Starts with"),
                        new OntologyQueryOperatorCatalog.MetadataOperator("isEmpty", "Is empty")),
                OntologyQueryOperatorCatalog.operatorsFor("string"));
    }

    @Test
    void returnsNumericOperators() {
        assertEquals(
                List.of(
                        new OntologyQueryOperatorCatalog.MetadataOperator("equals", "Equals"),
                        new OntologyQueryOperatorCatalog.MetadataOperator("gt", "Greater than"),
                        new OntologyQueryOperatorCatalog.MetadataOperator("gte", "Greater than or equal to"),
                        new OntologyQueryOperatorCatalog.MetadataOperator("lt", "Less than"),
                        new OntologyQueryOperatorCatalog.MetadataOperator("lte", "Less than or equal to")),
                OntologyQueryOperatorCatalog.operatorsFor("integer"));
    }

    @Test
    void returnsBooleanOperators() {
        assertEquals(
                List.of(
                        new OntologyQueryOperatorCatalog.MetadataOperator("equals", "Equals"),
                        new OntologyQueryOperatorCatalog.MetadataOperator("isEmpty", "Is empty")),
                OntologyQueryOperatorCatalog.operatorsFor("boolean"));
    }

    @Test
    void fallsBackToEqualsForUnsupportedMetadataTypes() {
        assertEquals(
                List.of(new OntologyQueryOperatorCatalog.MetadataOperator("equals", "Equals")),
                OntologyQueryOperatorCatalog.operatorsFor("unsupported"));
    }
}
