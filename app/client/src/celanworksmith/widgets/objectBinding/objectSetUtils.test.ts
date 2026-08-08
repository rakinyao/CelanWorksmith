import type { CelanworksmithObjectSet } from "api/CelanworksmithAPI";
import { getObjectSetOptions, getObjectSetRows } from "./objectSetUtils";

const suppliers: CelanworksmithObjectSet = {
  typeId: "Supplier",
  offset: 0,
  limit: 100,
  total: 2,
  items: [
    {
      id: "supplier-acme",
      typeId: "Supplier",
      properties: { supplierId: "SUP-001", supplierName: "Acme" },
    },
    {
      id: "supplier-borealis",
      typeId: "Supplier",
      properties: { supplierId: "SUP-002", supplierName: "Borealis" },
    },
  ],
};

describe("ObjectSet widget mappings", () => {
  test("keeps Object Instance rows intact for collection widgets", () => {
    expect(getObjectSetRows(suppliers)).toEqual(suppliers.items);
  });

  test("maps selection labels and values from stable property IDs", () => {
    expect(
      getObjectSetOptions(suppliers, "supplierName", "supplierId"),
    ).toEqual({
      options: [
        { label: "Acme", value: "SUP-001" },
        { label: "Borealis", value: "SUP-002" },
      ],
      state: "ready",
    });
  });

  test("reports missing or non-scalar mappings as a type mismatch", () => {
    expect(getObjectSetOptions(suppliers, "missing", "supplierId")).toEqual({
      options: [],
      state: "typeMismatch",
    });
    expect(
      getObjectSetOptions(
        {
          ...suppliers,
          items: [
            {
              ...suppliers.items[0],
              properties: { supplierId: "SUP-001", supplierName: ["Acme"] },
            },
          ],
        },
        "supplierName",
        "supplierId",
      ),
    ).toEqual({ options: [], state: "typeMismatch" });
  });
});
