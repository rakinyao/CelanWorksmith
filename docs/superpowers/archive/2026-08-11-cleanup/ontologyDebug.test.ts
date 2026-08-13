import {
  buildOntologyDebugInfo,
  createStableBindingKey,
  sanitizeOntologyDebugValue,
} from "./ontologyDebug";

describe("ontology debug helpers", () => {
  it("builds stable binding and request details without secrets", () => {
    const info = buildOntologyDebugInfo({
      applicationId: "app-1",
      binding: {
        applicationId: "app-1",
        projectId: "celanworksmith-demo",
        projectVersion: "1.0.0",
        providerId: "mongodb-readonly",
      },
      status: "ready",
      objectTypeIds: ["PurchaseOrder"],
      request: {
        requestKey: "app-1|celanworksmith-demo|1.0.0|mongodb-readonly",
        apiPath:
          "/api/v1/celanworksmith/ontology/object-types?applicationId=app-1&token=secret",
        responseStatus: 200,
        durationMs: 42,
        cacheHit: true,
        refreshReason: "binding-load",
      },
    });

    expect(info.bindingKey).toBe(
      "app-1|celanworksmith-demo|1.0.0|mongodb-readonly",
    );
    expect(info.request.apiPath).toBe(
      "/api/v1/celanworksmith/ontology/object-types",
    );
    expect(info.request.requestKey).toBe(info.bindingKey);
    expect(info.request.responseStatus).toBe(200);
    expect(info.objectTypeIds).toEqual(["PurchaseOrder"]);
    expect(info.request).not.toHaveProperty("token");
  });

  it("keeps error and retry state safe and actionable", () => {
    const info = buildOntologyDebugInfo({
      applicationId: "app-1",
      binding: null,
      status: "error",
      error: {
        code: "BACKEND_ERROR",
        message: "MongoDB password=secret\n at java.lang.Error",
      },
      request: {
        requestKey: "request-1",
        apiPath: "/api/v1/celanworksmith/applications/app-1/ontology-binding",
        canRetry: true,
      },
    });

    expect(info.status).toBe("error");
    expect(info.request.canRetry).toBe(true);
    expect(info.error).toEqual({
      code: "BACKEND_ERROR",
      message: "[redacted]",
    });
  });

  it("creates a stable binding key and strips sensitive debug values", () => {
    expect(
      createStableBindingKey({
        applicationId: "app-1",
        projectId: "project",
        projectVersion: "1.0.0",
        providerId: "provider",
      }),
    ).toBe("app-1|project|1.0.0|provider");
    expect(sanitizeOntologyDebugValue("mongodb://user:pass@host/db")).toBe(
      "[redacted]",
    );
    expect(sanitizeOntologyDebugValue("/api/%74oken/secret/metadata")).toBe(
      "[redacted]",
    );
  });

  it("redacts every sensitive debug field and disables binding key copy", () => {
    const info = buildOntologyDebugInfo({
      applicationId: "app/token/secret-value",
      binding: {
        applicationId: "app/token/secret-value",
        projectId: "project?password=hunter2",
        projectVersion: "1.0.0",
        providerId: "mongodb://user:pass@host/db",
      },
      status: "error",
      error: {
        code: "PERMISSION_DENIED",
        message: "GET /api/v1/token/secret-value/metadata was denied",
      },
      request: {
        apiPath: "/api/v1/%74oken/secret-value/metadata?mode=debug",
      },
    });

    expect(info.applicationId).toBe("[redacted]");
    expect(info.projectId).toBe("[redacted]");
    expect(info.providerId).toBe("[redacted]");
    expect(info.bindingKey).toBe("[redacted]");
    expect(info.bindingKeySafeToCopy).toBe(false);
    expect(info.request.requestKey).toBeUndefined();
    expect(info.request.apiPath).toBe("[redacted]");
    expect(info.error?.message).toBe("[redacted]");
  });

  it("keeps non-sensitive error messages and permission details readable", () => {
    const info = buildOntologyDebugInfo({
      applicationId: "app-1",
      binding: null,
      status: "error",
      error: {
        code: "PERMISSION_DENIED",
        message: "Permission denied for PurchaseOrder",
      },
      request: {
        apiPath: "/api/v1/celanworksmith/runtime/objects/PurchaseOrder",
        responseStatus: 403,
      },
    });

    expect(info.error).toEqual({
      code: "PERMISSION_DENIED",
      message: "Permission denied for PurchaseOrder",
    });
    expect(info.request.apiPath).toBe(
      "/api/v1/celanworksmith/runtime/objects/PurchaseOrder",
    );
    expect(info.request.responseStatus).toBe(403);
  });
});
