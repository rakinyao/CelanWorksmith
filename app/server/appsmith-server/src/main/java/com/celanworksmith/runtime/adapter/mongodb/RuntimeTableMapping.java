package com.celanworksmith.runtime.adapter.mongodb;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;

import java.util.Map;
import java.util.Set;

public final class RuntimeTableMapping {
    private static final Map<String, String> ALLOWLIST = Map.ofEntries(
            Map.entry("suppliers", "suppliers"),
            Map.entry("purchase_orders", "purchase_orders"),
            Map.entry("production_orders", "production_orders"),
            Map.entry("delivery_orders", "delivery_orders"),
            Map.entry("financial_records", "financial_records"),
            Map.entry("supplier_ratings", "supplier_ratings"));
    private static final Set<String> RELEASE_TABLES =
            Set.of("ont_supplier", "ont_customer", "ont_contract", "ont_purchase_order");

    private RuntimeTableMapping() {}

    public static String collectionFor(String runtimeTable) {
        String collection = ALLOWLIST.get(runtimeTable);
        if (collection != null) return collection;
        throw new CelanWorksmithException(
                CelanWorksmithErrorCode.INVALID_ARGUMENT, "Runtime table is not allowed: " + runtimeTable);
    }

    public static String releaseCollectionFor(String runtimeTable) {
        String releaseTable = releaseTable(runtimeTable);
        if (RELEASE_TABLES.contains(releaseTable)) return releaseTable;
        throw new CelanWorksmithException(
                CelanWorksmithErrorCode.INVALID_ARGUMENT, "Runtime table is not allowed: " + runtimeTable);
    }

    private static String releaseTable(String runtimeTable) {
        if (runtimeTable == null) return "";
        if (RELEASE_TABLES.contains(runtimeTable)) return runtimeTable;
        int separator = runtimeTable.lastIndexOf(":public.");
        return separator < 0 ? "" : runtimeTable.substring(separator + ":public.".length());
    }
}
