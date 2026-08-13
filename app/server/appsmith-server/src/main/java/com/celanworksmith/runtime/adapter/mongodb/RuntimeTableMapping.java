package com.celanworksmith.runtime.adapter.mongodb;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;

import java.util.Map;

public final class RuntimeTableMapping {
    private static final Map<String, String> ALLOWLIST = Map.ofEntries(
            Map.entry("suppliers", "suppliers"),
            Map.entry("purchase_orders", "purchase_orders"),
            Map.entry("production_orders", "production_orders"),
            Map.entry("delivery_orders", "delivery_orders"),
            Map.entry("financial_records", "financial_records"),
            Map.entry("supplier_ratings", "supplier_ratings"));

    private RuntimeTableMapping() {}

    public static String collectionFor(String runtimeTable) {
        String collection = ALLOWLIST.get(runtimeTable);
        if (collection == null) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Runtime table is not allowed: " + runtimeTable);
        }
        return collection;
    }
}
