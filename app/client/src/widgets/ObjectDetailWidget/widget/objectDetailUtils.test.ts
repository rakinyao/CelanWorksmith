import type { CelanworksmithObjectType } from "api/CelanworksmithAPI";
import {
  ObjectDetailDisplayMode,
  getObjectIdentity,
  getObjectPropertyValue,
  groupObjectProperties,
  normalizeObjectData,
} from "./objectDetailUtils";

const purchaseOrderMetadata: CelanworksmithObjectType = {
  id: "PurchaseOrder",
  displayName: "Purchase Order",
  properties: [
    {
      id: "status",
      displayName: "Status",
      dataType: "ENUM",
      required: true,
      readOnly: false,
      derived: false,
    },
    {
      id: "delayDays",
      displayName: "Delay Days",
      dataType: "INTEGER",
      required: false,
      readOnly: true,
      derived: true,
    },
  ],
};

const flatPurchaseOrder = {
  id: "PO001",
  typeId: "PurchaseOrder",
  status: "DELAYED",
  delayDays: 8,
};

describe("ObjectDetail object data utilities", () => {
  test("normalizes a flat DataTree object", () => {
    expect(normalizeObjectData(flatPurchaseOrder)).toEqual({
      id: "PO001",
      typeId: "PurchaseOrder",
      properties: {
        status: "DELAYED",
        delayDays: 8,
      },
    });
  });

  test("normalizes an API-shaped object without retaining a nested properties wrapper", () => {
    expect(
      normalizeObjectData({
        id: "PO001",
        typeId: "PurchaseOrder",
        properties: { status: "DELAYED", delayDays: 8 },
      }),
    ).toEqual({
      id: "PO001",
      typeId: "PurchaseOrder",
      properties: { status: "DELAYED", delayDays: 8 },
    });
  });

  test.each([
    null,
    undefined,
    {},
    { id: "PO001" },
    { typeId: "PurchaseOrder" },
  ])("rejects object data without both identity fields: %p", (value) => {
    expect(normalizeObjectData(value)).toBeUndefined();
  });

  test("builds a stable object identity", () => {
    const object = normalizeObjectData(flatPurchaseOrder);

    expect(getObjectIdentity(object)).toBe("PurchaseOrder/PO001");
    expect(getObjectIdentity(undefined)).toBeUndefined();
  });

  test("reports Object Instance and Property binding states without guessing IDs", () => {
    expect(getObjectPropertyValue(undefined, "status")).toEqual({
      state: "empty",
    });
    expect(
      getObjectPropertyValue(flatPurchaseOrder, "deletedProperty"),
    ).toEqual({
      state: "typeMismatch",
    });
    expect(getObjectPropertyValue(flatPurchaseOrder, "status")).toEqual({
      state: "ready",
      value: "DELAYED",
    });
  });

  test("groups business properties by metadata order in business-only mode", () => {
    const object = normalizeObjectData(flatPurchaseOrder)!;

    expect(
      groupObjectProperties(
        object,
        purchaseOrderMetadata,
        ObjectDetailDisplayMode.BUSINESS_ONLY,
      ),
    ).toEqual([
      {
        id: "basic",
        label: "Basic",
        properties: [
          { id: "id", label: "ID", value: "PO001", dataType: "STRING" },
          {
            id: "typeId",
            label: "Type",
            value: "PurchaseOrder",
            dataType: "STRING",
          },
        ],
      },
      {
        id: "business",
        label: "Business",
        properties: [
          {
            id: "status",
            label: "Status",
            value: "DELAYED",
            dataType: "ENUM",
          },
        ],
      },
    ]);
  });

  test("adds derived properties when the display mode allows them", () => {
    const object = normalizeObjectData(flatPurchaseOrder)!;

    expect(
      groupObjectProperties(
        object,
        purchaseOrderMetadata,
        ObjectDetailDisplayMode.BUSINESS_AND_DERIVED,
      ).map((group) => group.id),
    ).toEqual(["basic", "business", "derived"]);
  });

  test("applies metadata groups, order, and hidden fields to the default detail layout", () => {
    const object = normalizeObjectData({
      ...flatPurchaseOrder,
      amount: 100,
      internalNote: "not visible",
    })!;
    const metadata = {
      ...purchaseOrderMetadata,
      properties: [
        {
          ...purchaseOrderMetadata.properties[0],
          group: "Commercial",
          order: 20,
        },
        {
          ...purchaseOrderMetadata.properties[1],
          group: "Commercial",
          order: 30,
        },
        {
          dataType: "DECIMAL",
          derived: false,
          displayName: "Amount",
          id: "amount",
          readOnly: false,
          required: false,
          group: "Commercial",
          order: 5,
        },
        {
          dataType: "STRING",
          derived: false,
          displayName: "Internal note",
          hidden: true,
          id: "internalNote",
          readOnly: false,
          required: false,
        },
      ],
    };

    expect(
      groupObjectProperties(
        object,
        metadata,
        ObjectDetailDisplayMode.BUSINESS_AND_DERIVED,
      ),
    ).toEqual(
      expect.arrayContaining([
        {
          id: "group:Commercial",
          label: "Commercial",
          properties: [
            {
              dataType: "DECIMAL",
              id: "amount",
              label: "Amount",
              value: 100,
            },
            {
              dataType: "ENUM",
              id: "status",
              label: "Status",
              value: "DELAYED",
            },
            {
              dataType: "INTEGER",
              id: "delayDays",
              label: "Delay Days",
              value: 8,
            },
          ],
        },
      ]),
    );
    expect(
      groupObjectProperties(
        object,
        metadata,
        ObjectDetailDisplayMode.ALL_METADATA,
      )
        .flatMap((group) => group.properties)
        .map((property) => property.id),
    ).not.toContain("internalNote");
  });

  test("shows unknown runtime fields only in all-metadata mode", () => {
    const object = normalizeObjectData({
      ...flatPurchaseOrder,
      runtimeOnly: "visible only in fallback mode",
    })!;

    const groups = groupObjectProperties(
      object,
      purchaseOrderMetadata,
      ObjectDetailDisplayMode.ALL_METADATA,
    );
    const allProperties = groups.flatMap((group) => group.properties);

    expect(allProperties).toContainEqual({
      id: "runtimeOnly",
      label: "Runtime Only",
      value: "visible only in fallback mode",
      dataType: "STRING",
    });
  });
});
