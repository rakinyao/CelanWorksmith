import { aggregateValues, validateVariableDefinitions } from "./variableUtils";
import type { VariableDefinition } from "./types";

const objectSet = (id: string, name: string): VariableDefinition => ({
  id,
  name,
  kind: "OBJECT_SET",
  version: 1,
  updatedAt: 1,
  dependencies: [],
  config: { typeId: "PurchaseOrder", limit: 100 },
});

describe("CelanWorksmith variable utilities", () => {
  test("orders valid dependencies and rejects duplicate names", () => {
    const result = validateVariableDefinitions([
      {
        id: "delayCount",
        name: "delayCount",
        kind: "AGGREGATION",
        version: 1,
        updatedAt: 1,
        dependencies: ["orders"],
        config: {
          sourceVariableId: "orders",
          operation: "count",
        },
      },
      objectSet("orders", "orders"),
    ]);

    expect(result.valid).toBe(true);
    expect(result.order).toEqual(["orders", "delayCount"]);

    const duplicate = validateVariableDefinitions([
      objectSet("orders", "orders"),
      objectSet("orders-2", "orders"),
    ]);

    expect(duplicate.valid).toBe(false);
    expect(duplicate.errors[0]).toContain("duplicate variable name");
  });

  test("reports a dependency cycle with its path", () => {
    const first = objectSet("first", "first");
    const second = objectSet("second", "second");
    first.dependencies = ["second"];
    second.dependencies = ["first"];

    const result = validateVariableDefinitions([first, second]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Variable dependency cycle: first -> second -> first",
    );
  });

  test("aggregates numeric values and returns null for an empty set", () => {
    expect(aggregateValues([2, 4, 8], "count")).toBe(3);
    expect(aggregateValues([2, 4, 8], "sum")).toBe(14);
    expect(aggregateValues([2, 4, 8], "avg")).toBe(14 / 3);
    expect(aggregateValues([2, 4, 8], "min")).toBe(2);
    expect(aggregateValues([2, 4, 8], "max")).toBe(8);
    expect(aggregateValues([], "avg")).toBeNull();
  });
});
