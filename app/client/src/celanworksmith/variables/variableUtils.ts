import type {
  AggregationOperation,
  VariableDefinition,
  VariableValidationResult,
} from "./types";

const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const getDependencies = (definition: VariableDefinition): string[] => {
  const dependencies = new Set(definition.dependencies);

  if (definition.kind === "AGGREGATION") {
    dependencies.add(definition.config.sourceVariableId);
  }

  return [...dependencies];
};

export const validateVariableDefinitions = (
  definitions: VariableDefinition[],
): VariableValidationResult => {
  const errors: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  const definitionsById = new Map<string, VariableDefinition>();

  definitions.forEach((definition) => {
    if (ids.has(definition.id)) {
      errors.push(`duplicate variable id: ${definition.id}`);
    }

    if (names.has(definition.name)) {
      errors.push(`duplicate variable name: ${definition.name}`);
    }

    if (!VARIABLE_NAME_PATTERN.test(definition.name)) {
      errors.push(`invalid variable name: ${definition.name}`);
    }

    ids.add(definition.id);
    names.add(definition.name);
    definitionsById.set(definition.id, definition);
  });

  definitions.forEach((definition) => {
    getDependencies(definition).forEach((dependencyId) => {
      if (!definitionsById.has(dependencyId)) {
        errors.push(
          `missing variable dependency: ${definition.id} -> ${dependencyId}`,
        );
      }
    });
  });

  const order: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  const visit = (id: string) => {
    if (visited.has(id)) return;

    if (visiting.has(id)) {
      const cycleStart = path.indexOf(id);
      const cycle = [...path.slice(cycleStart), id];

      errors.push(`Variable dependency cycle: ${cycle.join(" -> ")}`);

      return;
    }

    const definition = definitionsById.get(id);

    if (!definition) return;

    visiting.add(id);
    path.push(id);
    getDependencies(definition).forEach(visit);
    path.pop();
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  };

  definitions.forEach((definition) => visit(definition.id));

  return {
    valid: errors.length === 0,
    order,
    errors: [...new Set(errors)],
  };
};

export const aggregateValues = (
  values: unknown[],
  operation: AggregationOperation,
): number | null => {
  if (operation === "count") return values.length;

  const numbers = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  if (!numbers.length) return null;

  if (operation === "sum")
    return numbers.reduce((total, value) => total + value, 0);

  if (operation === "avg") {
    return numbers.reduce((total, value) => total + value, 0) / numbers.length;
  }

  if (operation === "min") return Math.min(...numbers);

  return Math.max(...numbers);
};

export const getVariableDependencies = getDependencies;
