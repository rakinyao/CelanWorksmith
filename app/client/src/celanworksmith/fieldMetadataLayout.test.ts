import type { CelanworksmithProperty } from "api/CelanworksmithAPI";
import {
  getDefaultFieldControl,
  getFieldLayout,
  isFieldEditable,
} from "./fieldMetadataLayout";

const property = (
  overrides: Partial<CelanworksmithProperty> &
    Pick<CelanworksmithProperty, "id">,
): CelanworksmithProperty => ({
  dataType: "STRING",
  derived: false,
  displayName: overrides.id,
  readOnly: false,
  required: false,
  ...overrides,
});

describe("getFieldLayout", () => {
  it("orders visible fields inside metadata groups and preserves ungrouped fields", () => {
    const layout = getFieldLayout([
      property({ id: "name", order: 20 }),
      property({ group: "Commercial", id: "amount", order: 30 }),
      property({ group: "Commercial", id: "currency", order: 10 }),
      property({ id: "internalNote", hidden: true, order: 1 }),
      property({ derived: true, id: "delayDays", order: 5 }),
    ]);

    expect(layout).toEqual([
      {
        id: "business",
        label: "Business",
        properties: [property({ id: "name", order: 20 })],
      },
      {
        id: "group:Commercial",
        label: "Commercial",
        properties: [
          property({ group: "Commercial", id: "currency", order: 10 }),
          property({ group: "Commercial", id: "amount", order: 30 }),
        ],
      },
    ]);
  });

  it("includes derived and explicitly restored hidden fields only when requested", () => {
    const hidden = property({ hidden: true, id: "internalNote" });
    const derived = property({ derived: true, id: "delayDays" });

    expect(
      getFieldLayout([hidden, derived], {
        includeDerived: true,
        includeHidden: true,
      }),
    ).toEqual([
      {
        id: "business",
        label: "Business",
        properties: [hidden],
      },
      {
        id: "derived",
        label: "Derived",
        properties: [derived],
      },
    ]);
  });

  it("places explicitly ordered fields before fields using declaration order", () => {
    expect(
      getFieldLayout([
        property({ id: "unranked" }),
        property({ id: "ranked", order: 10 }),
      ]),
    ).toEqual([
      {
        id: "business",
        label: "Business",
        properties: [
          property({ id: "ranked", order: 10 }),
          property({ id: "unranked" }),
        ],
      },
    ]);
  });
});

describe("default field controls", () => {
  it.each([
    ["STRING", "text"],
    ["INTEGER", "number"],
    ["DECIMAL", "number"],
    ["BOOLEAN", "checkbox"],
    ["ENUM", "select"],
    ["DATETIME", "datetime-local"],
    ["REFERENCE", "reference"],
  ] as const)("maps %s to %s", (dataType, control) => {
    expect(getDefaultFieldControl(dataType)).toBe(control);
  });

  it("keeps read-only and derived metadata fields non-editable", () => {
    expect(isFieldEditable(property({ id: "name" }))).toBe(true);
    expect(isFieldEditable(property({ id: "locked", readOnly: true }))).toBe(
      false,
    );
    expect(isFieldEditable(property({ derived: true, id: "computed" }))).toBe(
      false,
    );
  });
});
