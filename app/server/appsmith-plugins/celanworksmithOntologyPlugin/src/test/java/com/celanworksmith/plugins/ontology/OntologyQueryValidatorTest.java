package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import com.celanworksmith.ontology.datasource.OntologyObjectSet;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.ActionMetadata;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.FunctionMetadata;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.ObjectTypeMetadata;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.Snapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OntologyQueryValidatorTest {

    private final OntologyQueryValidator validator = new OntologyQueryValidator(new ObjectMapper());

    @Test
    void normalizesSinglePurchaseOrderFunctionTargetToTypedObjectSet() {
        OntologyQueryValidator.ValidatedCapabilityQuery query = validator.validateFunctionQuery(
                configuration(
                        "FUNCTION_QUERY",
                        "functionId",
                        "CalculateDelayDays",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002")),
                snapshot());

        assertEquals("CalculateDelayDays", query.capabilityId());
        assertEquals("PurchaseOrder", query.objectTypeId());
        assertEquals(new OntologyObjectSet("PurchaseOrder", List.of("PO002")), query.targets());
        assertEquals(Map.of(), query.parameters());
        assertEquals(false, query.atomic());
    }

    @Test
    void actionQueryUsesAtomicityOnlyFromActionMetadata() {
        OntologyQueryValidator.ValidatedCapabilityQuery query = validator.validateActionQuery(
                configuration(
                        "ACTION_QUERY",
                        "actionId",
                        "UpdatePurchaseOrder",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002")),
                snapshot());

        assertEquals(true, query.atomic());
    }

    @Test
    void rejectsMissingUnknownAndBlankSingleObjectTargets() {
        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateFunctionQuery(
                        configuration("FUNCTION_QUERY", "functionId", "CalculateDelayDays", Map.of()), snapshot()));
        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateFunctionQuery(
                        configuration(
                                "FUNCTION_QUERY",
                                "functionId",
                                "CalculateDelayDays",
                                Map.of("source", "TABLE_ROWS", "objectId", "PO002")),
                        snapshot()));
        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateFunctionQuery(
                        configuration(
                                "FUNCTION_QUERY",
                                "functionId",
                                "CalculateDelayDays",
                                Map.of("source", "SINGLE_OBJECT", "objectId", "  ")),
                        snapshot()));
    }

    @Test
    void rejectsCapabilityTargetForAnIncompatibleOwnerType() {
        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action(Map.of(
                "operation", "FUNCTION_QUERY",
                "queryMode", "BUILDER",
                "objectTypeId", "Supplier",
                "functionId", "CalculateDelayDays",
                "target", Map.of("source", "SINGLE_OBJECT", "objectId", "SUP001"))));

        assertThrows(IllegalArgumentException.class, () -> validator.validateFunctionQuery(configuration, snapshot()));
    }

    @Test
    void objectSetRejectsEmptyBlankDuplicateAndOverLimitTargets() {
        assertThrows(IllegalArgumentException.class, () -> new OntologyObjectSet(" ", List.of("PO001")));
        assertThrows(IllegalArgumentException.class, () -> new OntologyObjectSet("PurchaseOrder", List.of()));
        assertThrows(IllegalArgumentException.class, () -> new OntologyObjectSet("PurchaseOrder", List.of(" ")));
        assertThrows(
                IllegalArgumentException.class,
                () -> new OntologyObjectSet("PurchaseOrder", List.of("PO001", "PO001")));
        assertThrows(
                IllegalArgumentException.class,
                () -> new OntologyObjectSet(
                        "PurchaseOrder",
                        IntStream.range(0, 1001).mapToObj(index -> "PO" + index).toList()));
    }

    private OntologyActionConfiguration configuration(
            String operation, String capabilityField, String capabilityId, Map<String, Object> target) {
        return OntologyActionConfiguration.from(action(Map.of(
                "operation", operation,
                "queryMode", "BUILDER",
                "objectTypeId", "PurchaseOrder",
                capabilityField, capabilityId,
                "target", target)));
    }

    private Snapshot snapshot() {
        return new Snapshot(
                "snapshot",
                "digest",
                List.of(new ObjectTypeMetadata("PurchaseOrder", List.of()), new ObjectTypeMetadata("Supplier", List.of())),
                List.of(new FunctionMetadata("CalculateDelayDays", "number", List.of("PurchaseOrder"), List.of())),
                List.of(),
                List.of(new ActionMetadata("UpdatePurchaseOrder", List.of("PurchaseOrder"), true, List.of())));
    }

    private ActionConfiguration action(Map<String, Object> formData) {
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(formData);
        return action;
    }
}
