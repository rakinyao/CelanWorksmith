import {
  createSemanticMetadataCacheKey,
  filterSemanticMetadata,
  isSemanticMetadataCacheValid,
} from "./semanticMetadata";

describe("semantic metadata helpers", () => {
  it("normalizes allowed descriptions and examples", () => {
    expect(
      filterSemanticMetadata(
        {
          description: { en: "Purchase order", zh: "采购订单" },
          semanticType: "business.document",
          examples: ["PO001", "", "PO002"],
        },
        { authorized: true },
      ),
    ).toEqual({
      description: { en: "Purchase order", zh: "采购订单" },
      semanticType: "business.document",
      examples: ["PO001", "PO002"],
    });
  });

  it("does not expose unauthorized or sensitive semantic values", () => {
    expect(
      filterSemanticMetadata(
        {
          description: "internal secret",
          semanticType: "secret.token",
          examples: ["mongodb://user:pass@host/db", "safe-example"],
        },
        { authorized: false },
      ),
    ).toEqual({});
    expect(
      filterSemanticMetadata(
        {
          description: "safe",
          semanticType: "credential",
          examples: ["mongodb://user:pass@host/db", "safe-example"],
        },
        { authorized: true, sensitive: true },
      ),
    ).toEqual({});
  });

  it("filters sensitive content from every semantic metadata field", () => {
    expect(
      filterSemanticMetadata(
        {
          description: {
            en: "GET /api/token/secret-value",
            zh: "safe description",
          },
          semanticType: "authorization=Bearer secret-value",
          examples: ["/api/password/secret-value", "safe-example"],
        },
        { authorized: true },
      ),
    ).toEqual({
      description: { zh: "safe description" },
      examples: ["safe-example"],
    });
  });

  it("keys cache entries by project version and stable node ID", () => {
    expect(
      createSemanticMetadataCacheKey({
        projectId: "project",
        projectVersion: "1.0.0",
        nodeId: "PurchaseOrder.total",
      }),
    ).toBe("project|1.0.0|PurchaseOrder.total");
    expect(
      isSemanticMetadataCacheValid({
        cachedProjectVersion: "1.0.0",
        currentProjectVersion: "1.0.0",
      }),
    ).toBe(true);
    expect(
      isSemanticMetadataCacheValid({
        cachedProjectVersion: "1.0.0",
        currentProjectVersion: "1.1.0",
      }),
    ).toBe(false);
  });
});
