package com.celanworksmith.ontology.adapter.mock;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.FunctionDTO;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.port.OntologyProvider;
import reactor.core.publisher.Mono;

import java.util.List;

public class MockOntologyProvider implements OntologyProvider {
    private static final List<ObjectTypeDTO> OBJECT_TYPES = List.of(
            new ObjectTypeDTO(
                    "Supplier",
                    "Supplier",
                    List.of(
                            property("name", "Name", "STRING", true, false, false),
                            property("contactName", "Contact Name", "STRING", false, false, false),
                            property("riskLevel", "Risk Level", "ENUM", true, false, false),
                            property("averageRating", "Average Rating", "DECIMAL", false, true, true))),
            new ObjectTypeDTO(
                    "PurchaseOrder",
                    "Purchase Order",
                    List.of(
                            property("supplierId", "Supplier", "REFERENCE", true, false, false),
                            property("status", "Status", "ENUM", true, false, false),
                            property("orderDate", "Order Date", "DATETIME", true, false, false),
                            property("expectedDeliveryDate", "Expected Delivery", "DATETIME", true, false, false),
                            property("actualDeliveryDate", "Actual Delivery", "DATETIME", false, false, false),
                            property("amount", "Amount", "DECIMAL", true, false, false),
                            property("delayDays", "Delay Days", "INTEGER", false, true, true))),
            new ObjectTypeDTO(
                    "ProductionOrder",
                    "Production Order",
                    List.of(
                            property("purchaseOrderId", "Purchase Order", "REFERENCE", true, false, false),
                            property("status", "Status", "ENUM", true, false, false),
                            property("scheduleDate", "Schedule Date", "DATETIME", true, false, false),
                            property("quantity", "Quantity", "INTEGER", true, false, false))),
            new ObjectTypeDTO(
                    "DeliveryOrder",
                    "Delivery Order",
                    List.of(
                            property("purchaseOrderId", "Purchase Order", "REFERENCE", true, false, false),
                            property("status", "Status", "ENUM", true, false, false),
                            property("plannedDate", "Planned Date", "DATETIME", true, false, false),
                            property("deliveredDate", "Delivered Date", "DATETIME", false, false, false))),
            new ObjectTypeDTO(
                    "FinancialRecord",
                    "Financial Record",
                    List.of(
                            property("purchaseOrderId", "Purchase Order", "REFERENCE", true, false, false),
                            property("revenue", "Revenue", "DECIMAL", true, false, false),
                            property("cost", "Cost", "DECIMAL", true, false, false),
                            property("penalty", "Penalty", "DECIMAL", false, false, false),
                            property("profit", "Profit", "DECIMAL", false, true, true))),
            new ObjectTypeDTO(
                    "SupplierRating",
                    "Supplier Rating",
                    List.of(
                            property("supplierId", "Supplier", "REFERENCE", true, false, false),
                            property("rating", "Rating", "DECIMAL", true, false, false),
                            property("reviewDate", "Review Date", "DATETIME", true, false, false))));

    private static final List<LinkTypeDTO> LINK_TYPES = List.of(
            new LinkTypeDTO("supplier_orders", "Supplier Orders", "Supplier", "PurchaseOrder", "ONE_TO_MANY"),
            new LinkTypeDTO(
                    "po_production", "Purchase Order Production", "PurchaseOrder", "ProductionOrder", "ONE_TO_ONE"),
            new LinkTypeDTO("po_delivery", "Purchase Order Delivery", "PurchaseOrder", "DeliveryOrder", "ONE_TO_ONE"),
            new LinkTypeDTO("po_finance", "Purchase Order Finance", "PurchaseOrder", "FinancialRecord", "ONE_TO_ONE"),
            new LinkTypeDTO("supplier_ratings", "Supplier Ratings", "Supplier", "SupplierRating", "ONE_TO_MANY"));

    private static final List<FunctionDTO> FUNCTIONS = List.of(
            new FunctionDTO(
                    "CalculateDelayDays",
                    "Calculate Delay Days",
                    "INTEGER",
                    List.of(parameter("poId", "Purchase Order", "STRING")),
                    true),
            new FunctionDTO(
                    "CalculatePenalty",
                    "Calculate Penalty",
                    "DECIMAL",
                    List.of(parameter("poId", "Purchase Order", "STRING")),
                    true),
            new FunctionDTO(
                    "CalculateAdjustedProfit",
                    "Calculate Adjusted Profit",
                    "DECIMAL",
                    List.of(parameter("poId", "Purchase Order", "STRING")),
                    true),
            new FunctionDTO(
                    "CalculateMarginRate",
                    "Calculate Margin Rate",
                    "DECIMAL",
                    List.of(parameter("poId", "Purchase Order", "STRING")),
                    true),
            new FunctionDTO(
                    "CalculateSupplierGrade",
                    "Calculate Supplier Grade",
                    "DECIMAL",
                    List.of(parameter("supplierId", "Supplier", "STRING")),
                    true));

    private static final List<ActionTypeDTO> ACTIONS = List.of(
            new ActionTypeDTO(
                    "UpdateProductionSchedule",
                    "Update Production Schedule",
                    "PurchaseOrder",
                    List.of(parameter("newScheduleDate", "New Schedule Date", "DATETIME")),
                    true),
            new ActionTypeDTO(
                    "UpdateDeliveryDate",
                    "Update Delivery Date",
                    "PurchaseOrder",
                    List.of(parameter("newDeliveryDate", "New Delivery Date", "DATETIME")),
                    true),
            new ActionTypeDTO(
                    "UpdateFinancialRecord",
                    "Update Financial Record",
                    "PurchaseOrder",
                    List.of(parameter("penalty", "Penalty", "DECIMAL")),
                    true),
            new ActionTypeDTO(
                    "NotifyProductionTeam",
                    "Notify Production Team",
                    "PurchaseOrder",
                    List.of(parameter("message", "Message", "STRING")),
                    false));

    private static PropertyDTO property(
            String id, String displayName, String dataType, boolean required, boolean readOnly, boolean derived) {
        return new PropertyDTO(id, displayName, dataType, required, readOnly, derived);
    }

    private static PropertyDTO parameter(String id, String displayName, String dataType) {
        return property(id, displayName, dataType, true, false, false);
    }

    @Override
    public Mono<List<ObjectTypeDTO>> getObjectTypes() {
        return Mono.just(OBJECT_TYPES);
    }

    @Override
    public Mono<ObjectTypeDTO> getObjectType(String typeId) {
        return OBJECT_TYPES.stream()
                .filter(type -> type.id().equals(typeId))
                .findFirst()
                .map(Mono::just)
                .orElseGet(() -> Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.OBJECT_TYPE_NOT_FOUND, "Unknown object type: " + typeId)));
    }

    @Override
    public Mono<List<LinkTypeDTO>> getLinkTypes(String sourceTypeId) {
        if (sourceTypeId == null || sourceTypeId.isBlank()) return Mono.just(LINK_TYPES);
        if (OBJECT_TYPES.stream().noneMatch(type -> type.id().equals(sourceTypeId))) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.OBJECT_TYPE_NOT_FOUND, "Unknown object type: " + sourceTypeId));
        }
        return Mono.just(LINK_TYPES.stream()
                .filter(link -> link.sourceTypeId().equals(sourceTypeId))
                .toList());
    }

    @Override
    public Mono<List<FunctionDTO>> getFunctions() {
        return Mono.just(FUNCTIONS);
    }

    @Override
    public Mono<List<ActionTypeDTO>> getActions(String objectTypeId) {
        if (objectTypeId == null || objectTypeId.isBlank()) return Mono.just(ACTIONS);
        if (OBJECT_TYPES.stream().noneMatch(type -> type.id().equals(objectTypeId))) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.OBJECT_TYPE_NOT_FOUND, "Unknown object type: " + objectTypeId));
        }
        return Mono.just(ACTIONS.stream()
                .filter(action -> action.objectTypeId().equals(objectTypeId))
                .toList());
    }
}
