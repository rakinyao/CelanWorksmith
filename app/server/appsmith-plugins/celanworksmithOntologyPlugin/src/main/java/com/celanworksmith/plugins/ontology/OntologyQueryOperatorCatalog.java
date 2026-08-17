package com.celanworksmith.plugins.ontology;

import java.util.List;

public final class OntologyQueryOperatorCatalog {
    private static final List<MetadataOperator> STRING_OPERATORS = List.of(
            new MetadataOperator("equals", "Equals"),
            new MetadataOperator("contains", "Contains"),
            new MetadataOperator("startsWith", "Starts with"),
            new MetadataOperator("isEmpty", "Is empty"));
    private static final List<MetadataOperator> COMPARISON_OPERATORS = List.of(
            new MetadataOperator("equals", "Equals"),
            new MetadataOperator("gt", "Greater than"),
            new MetadataOperator("gte", "Greater than or equal to"),
            new MetadataOperator("lt", "Less than"),
            new MetadataOperator("lte", "Less than or equal to"));
    private static final List<MetadataOperator> BOOLEAN_OPERATORS =
            List.of(new MetadataOperator("equals", "Equals"), new MetadataOperator("isEmpty", "Is empty"));
    private static final List<MetadataOperator> FALLBACK_OPERATORS = List.of(new MetadataOperator("equals", "Equals"));

    private OntologyQueryOperatorCatalog() {}

    public static List<MetadataOperator> operatorsFor(String dataType) {
        if (dataType == null) {
            return FALLBACK_OPERATORS;
        }
        return switch (dataType) {
            case "integer", "number", "decimal", "date", "datetime" -> COMPARISON_OPERATORS;
            case "string" -> STRING_OPERATORS;
            case "boolean" -> BOOLEAN_OPERATORS;
            default -> FALLBACK_OPERATORS;
        };
    }

    public record MetadataOperator(String value, String label) {}
}
