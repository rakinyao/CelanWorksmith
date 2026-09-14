package com.celanworksmith.runtime.demo;

import java.util.Set;

/** Explicit allow-list for provisional DEMO_HANDLER functions. No source code is evaluated. */
public final class DemoFunctionRegistry {
    private static final Set<String> FUNCTION_IDS = Set.of(
            "CalculateSupplierRisk",
            "CalculateContractChangeRate",
            "CalculateContractGrossAmount",
            "CalculateCustomerContractTotal");

    private DemoFunctionRegistry() {}

    public static boolean isRegistered(String functionId) {
        return FUNCTION_IDS.contains(functionId);
    }

    public static Set<String> functionIds() {
        return FUNCTION_IDS;
    }
}
