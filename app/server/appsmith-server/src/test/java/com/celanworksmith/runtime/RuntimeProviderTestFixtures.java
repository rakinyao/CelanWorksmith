package com.celanworksmith.runtime;

import com.celanworksmith.application.CelanworksmithApplicationBindingResolver;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.runtime.context.CelanworksmithRuntimeContext;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;

public final class RuntimeProviderTestFixtures {
    private RuntimeProviderTestFixtures() {}

    public static CelanworksmithRuntimeContext context(String applicationId) {
        return new CelanworksmithRuntimeContext(applicationId, false);
    }

    public static CelanworksmithApplicationBindingResolver.ResolvedBinding binding() {
        ObjectTypeDTO purchaseOrder = new ObjectTypeDTO(
                "PurchaseOrder",
                "Purchase Order",
                "purchase_orders",
                "id",
                List.of(
                        new PropertyDTO("supplierId", "Supplier", "reference", false, false, false),
                        new PropertyDTO("status", "Status", "string", false, false, false),
                        new PropertyDTO("delayDays", "Delay Days", "number", false, false, false)));
        ObjectTypeDTO supplier = new ObjectTypeDTO(
                "Supplier",
                "Supplier",
                "suppliers",
                "id",
                List.of(new PropertyDTO("name", "Name", "string", false, false, false)));
        OntologyProjectDefinition project = new OntologyProjectDefinition(
                "celanworksmith-demo",
                "1.0.0",
                1,
                List.of(purchaseOrder, supplier),
                List.of(new LinkTypeDTO("supplier_orders", "Supplier Orders", "Supplier", "PurchaseOrder", "MANY")),
                List.of(),
                List.of());
        return new CelanworksmithApplicationBindingResolver.ResolvedBinding(project, "mongodb-readonly");
    }

    public static ObjectSetQuery query(int offset, int limit) {
        return new ObjectSetQuery(null, "id", "asc", offset, limit);
    }

    public static ObjectNode filter(String property, String value) {
        ObjectNode filter = JsonNodeFactory.instance.objectNode();
        filter.put(property, value);
        return filter;
    }

    public static Map<String, Object> properties(Object... values) {
        return Map.of((String) values[0], values[1]);
    }
}
