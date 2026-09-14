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
    void normalizesManyObjectTargetAndEnforcesFunctionMaxItems() {
        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action(Map.of(
                "operation", "FUNCTION_QUERY",
                "queryMode", "BUILDER",
                "objectTypeId", "Contract",
                "functionId", "CalculateContractGrossAmount",
                "target", Map.of("source", "OBJECT_SET", "objectIds", List.of("C1", "C2")))));

        OntologyQueryValidator.ValidatedCapabilityQuery query =
                validator.validateFunctionQuery(configuration, snapshotWithManyFunction(2));

        assertEquals(new OntologyObjectSet("Contract", List.of("C1", "C2")), query.targets());
    }

    @Test
    void rejectsManyObjectTargetAboveFunctionMaxItems() {
        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action(Map.of(
                "operation", "FUNCTION_QUERY",
                "queryMode", "BUILDER",
                "objectTypeId", "Contract",
                "functionId", "CalculateContractGrossAmount",
                "target", Map.of("source", "MANY_OBJECTS", "objectIds", List.of("C1", "C2", "C3")))));

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateFunctionQuery(configuration, snapshotWithManyFunction(2)));
        assertEquals("Ontology function target exceeds maxItems: 2", error.getMessage());
    }

    @Test
    void rejectsMalformedFunctionObjectSetTargetsBeforeValidationCompletes() {
        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateFunctionQuery(
                        configuration(
                                "FUNCTION_QUERY",
                                "functionId",
                                "CalculateContractGrossAmount",
                                Map.of("source", "OBJECT_SET", "objectIds", List.of("C1", "  "))),
                        snapshotWithManyFunction(2)));
        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateFunctionQuery(
                        configuration(
                                "FUNCTION_QUERY",
                                "functionId",
                                "CalculateContractGrossAmount",
                                Map.of("source", "OBJECT_SET", "objectIds", List.of("C1", 2))),
                        snapshotWithManyFunction(2)));
        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateFunctionQuery(
                        configuration(
                                "FUNCTION_QUERY",
                                "functionId",
                                "CalculateContractGrossAmount",
                                Map.of("source", "OBJECT_SET", "objectIds", List.of("C1", "C1"))),
                        snapshotWithManyFunction(2)));
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
    void actionQueryEnforcesDeclaredMaximumTargetItems() {
        OntologyActionConfiguration manyTargetConfiguration = OntologyActionConfiguration.from(action(Map.of(
                "operation", "ACTION_QUERY",
                "queryMode", "BUILDER",
                "objectTypeId", "contract",
                "actionId", "ApplyContractChange",
                "target", Map.of("source", "OBJECT_SET", "objectIds", List.of("C1", "C2")))));
        OntologyActionConfiguration singleTargetConfiguration = OntologyActionConfiguration.from(action(Map.of(
                "operation", "ACTION_QUERY",
                "queryMode", "BUILDER",
                "objectTypeId", "contract",
                "actionId", "ApplyContractChange",
                "target", Map.of("source", "SINGLE_OBJECT", "objectId", "C1"))));

        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateActionQuery(manyTargetConfiguration, snapshotWithBoundedAction(1)));
        OntologyQueryValidator.ValidatedCapabilityQuery query =
                validator.validateActionQuery(singleTargetConfiguration, snapshotWithBoundedAction(1));
        assertEquals(new OntologyObjectSet("contract", List.of("C1")), query.targets());
        assertEquals(true, query.atomic());
    }

    @Test
    void legacyActionWithoutMaxItemsRemainsSingleTargetOnly() {
        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action(Map.of(
                "operation", "ACTION_QUERY",
                "queryMode", "BUILDER",
                "objectTypeId", "PurchaseOrder",
                "actionId", "UpdatePurchaseOrder",
                "target", Map.of("source", "OBJECT_SET", "objectIds", List.of("PO001", "PO002")))));

        assertThrows(IllegalArgumentException.class, () -> validator.validateActionQuery(configuration, snapshot()));
    }

    @Test
    void malformedNonpositiveActionMaxItemsAreRejected() {
        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action(Map.of(
                "operation", "ACTION_QUERY",
                "queryMode", "BUILDER",
                "objectTypeId", "contract",
                "actionId", "ApplyContractChange",
                "target", Map.of("source", "SINGLE_OBJECT", "objectId", "C1"))));

        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateActionQuery(configuration, snapshotWithBoundedAction(0)));
        assertThrows(
                IllegalArgumentException.class,
                () -> validator.validateActionQuery(configuration, snapshotWithBoundedAction(-1)));
    }

    @Test
    void unknownRuntimeFunctionIdIsRejectedBeforeValidatedQueryCreation() {
        OntologyActionConfiguration configuration = configuration(
                "FUNCTION_QUERY",
                "functionId",
                "missing-function",
                Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"));

        assertThrows(IllegalArgumentException.class, () -> validator.validateFunctionQuery(configuration, snapshot()));
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
                "operation",
                operation,
                "queryMode",
                "BUILDER",
                "objectTypeId",
                "PurchaseOrder",
                capabilityField,
                capabilityId,
                "target",
                target)));
    }

    private Snapshot snapshot() {
        return new Snapshot(
                "snapshot",
                "digest",
                List.of(
                        new ObjectTypeMetadata("PurchaseOrder", List.of()),
                        new ObjectTypeMetadata("Supplier", List.of())),
                List.of(new FunctionMetadata("CalculateDelayDays", "number", List.of("PurchaseOrder"), List.of())),
                List.of(),
                List.of(new ActionMetadata("UpdatePurchaseOrder", List.of("PurchaseOrder"), true, List.of())));
    }

    private Snapshot snapshotWithManyFunction(int maxItems) {
        return new Snapshot(
                "snapshot",
                "digest",
                List.of(new ObjectTypeMetadata("Contract", List.of())),
                List.of(new FunctionMetadata(
                        "CalculateContractGrossAmount",
                        "Contract gross amount",
                        "decimal",
                        List.of("Contract"),
                        List.of(),
                        maxItems)),
                List.of(),
                List.of());
    }

    private Snapshot snapshotWithBoundedAction(int maxItems) {
        return new Snapshot(
                "snapshot",
                "digest",
                List.of(new ObjectTypeMetadata("contract", List.of())),
                List.of(),
                List.of(),
                List.of(new ActionMetadata(
                        "ApplyContractChange",
                        "Apply contract change",
                        List.of("contract"),
                        maxItems,
                        true,
                        List.of(),
                        true)));
    }

    private ActionConfiguration action(Map<String, Object> formData) {
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(formData);
        return action;
    }
}
