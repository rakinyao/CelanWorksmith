import Api from "api/Api";
import CelanworksmithAPI, {
  normalizeCelanworksmithError,
} from "api/CelanworksmithAPI";

jest.mock("api/Api", () => ({
  __esModule: true,
  default: class MockApi {
    static get = jest.fn();
    static post = jest.fn();
    static put = jest.fn();
  },
}));

describe("CelanworksmithAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls ontology metadata endpoints", async () => {
    (Api.get as jest.Mock).mockResolvedValue({});

    await CelanworksmithAPI.getObjectTypes();
    await CelanworksmithAPI.getLinkTypes();
    await CelanworksmithAPI.getFunctions();
    await CelanworksmithAPI.getActions();

    expect(Api.get).toHaveBeenNthCalledWith(
      1,
      "v1/celanworksmith/ontology/object-types",
    );
    expect(Api.get).toHaveBeenNthCalledWith(
      2,
      "v1/celanworksmith/ontology/link-types",
      undefined,
    );
    expect(Api.get).toHaveBeenNthCalledWith(
      3,
      "v1/celanworksmith/ontology/functions",
    );
    expect(Api.get).toHaveBeenNthCalledWith(
      4,
      "v1/celanworksmith/ontology/actions",
      undefined,
    );
  });

  it("serializes runtime filters and executes actions", async () => {
    (Api.get as jest.Mock).mockResolvedValue({});
    (Api.post as jest.Mock).mockResolvedValue({});

    await CelanworksmithAPI.queryObjects("Supplier", {
      filter: { riskLevel: "HIGH" },
      sortBy: "id",
      sortDirection: "desc",
      offset: 10,
      limit: 5,
    });
    await CelanworksmithAPI.executeAction("UpdateDeliveryDate", {
      objectTypeId: "PurchaseOrder",
      objectId: "PO001",
      parameters: { newDeliveryDate: "2026-03-01" },
    });

    expect(Api.get).toHaveBeenCalledWith(
      "v1/celanworksmith/runtime/objects/Supplier",
      {
        filter: JSON.stringify({ riskLevel: "HIGH" }),
        sortBy: "id",
        sortDirection: "desc",
        offset: 10,
        limit: 5,
      },
    );
    expect(Api.post).toHaveBeenCalledWith(
      "v1/celanworksmith/runtime/actions/UpdateDeliveryDate/execute",
      {
        objectTypeId: "PurchaseOrder",
        objectId: "PO001",
        parameters: { newDeliveryDate: "2026-03-01" },
      },
    );
  });

  it("passes application context to Link metadata and linked-object requests", async () => {
    (Api.get as jest.Mock).mockResolvedValue({});

    await CelanworksmithAPI.getLinkTypes("PurchaseOrder", "app-1");
    await CelanworksmithAPI.getLinkedObjects(
      "PurchaseOrder",
      "PO001",
      "po_production",
      { offset: 0, limit: 100 },
      "app-1",
    );

    expect(Api.get).toHaveBeenNthCalledWith(
      1,
      "v1/celanworksmith/ontology/link-types",
      { sourceTypeId: "PurchaseOrder", applicationId: "app-1" },
    );
    expect(Api.get).toHaveBeenNthCalledWith(
      2,
      "v1/celanworksmith/runtime/objects/PurchaseOrder/PO001/links",
      {
        linkTypeId: "po_production",
        offset: 0,
        limit: 100,
        applicationId: "app-1",
      },
    );
  });

  it("serializes function and action execution requests with an abort signal", async () => {
    (Api.post as jest.Mock).mockResolvedValue({});
    const signal = new AbortController().signal;

    await CelanworksmithAPI.callFunction(
      "CalculateDelayDays",
      { poId: "PO005" },
      signal,
    );
    await CelanworksmithAPI.executeAction(
      "UpdateDeliveryDate",
      {
        objectTypeId: "PurchaseOrder",
        objectId: "PO005",
        parameters: { newDeliveryDate: "2026-03-01" },
      },
      signal,
    );

    expect(Api.post).toHaveBeenNthCalledWith(
      1,
      "v1/celanworksmith/runtime/functions/CalculateDelayDays/execute",
      { parameters: { poId: "PO005" } },
      undefined,
      { signal },
    );
    expect(Api.post).toHaveBeenNthCalledWith(
      2,
      "v1/celanworksmith/runtime/actions/UpdateDeliveryDate/execute",
      {
        objectTypeId: "PurchaseOrder",
        objectId: "PO005",
        parameters: { newDeliveryDate: "2026-03-01" },
      },
      undefined,
      { signal },
    );
  });

  it("normalizes structured runtime errors without exposing stack traces", () => {
    const error = normalizeCelanworksmithError({
      response: {
        data: {
          code: "FUNCTION_NOT_FOUND",
          message:
            "Unknown function\n    at MockRuntimeProvider.executeFunction(MockRuntimeProvider.java:42)",
        },
      },
    });

    expect(error).toEqual({
      code: "UNKNOWN_FUNCTION",
      message: "The requested function is not available.",
    });
    expect(error.message).not.toContain("MockRuntimeProvider");
  });

  it("normalizes direct ApiResponse errors", () => {
    expect(
      normalizeCelanworksmithError({
        responseMeta: {
          error: {
            code: "FUNCTION_NOT_FOUND",
            message: "Unknown function",
          },
        },
      }),
    ).toEqual({
      code: "UNKNOWN_FUNCTION",
      message: "Unknown function",
    });
  });

  it.each([
    ["INVALID_ARGUMENT", "INVALID_ARGUMENT"],
    ["ACTION_NOT_FOUND", "UNKNOWN_ACTION"],
    ["OBJECT_NOT_FOUND", "UNKNOWN_OBJECT"],
    ["PROVIDER_NOT_CONFIGURED", "PROVIDER_UNAVAILABLE"],
  ] as const)("maps %s to %s", (serverCode, frontendCode) => {
    expect(
      normalizeCelanworksmithError({
        response: { data: { code: serverCode, message: "runtime error" } },
      }),
    ).toEqual({ code: frontendCode, message: "runtime error" });
  });

  it("maps timeout and network failures to stable frontend codes", () => {
    expect(
      normalizeCelanworksmithError({
        code: "ECONNABORTED",
        message: "timeout",
      }),
    ).toEqual({ code: "TIMEOUT", message: "The runtime request timed out." });
    expect(
      normalizeCelanworksmithError({
        code: "ERR_NETWORK",
        message: "Network Error",
      }),
    ).toEqual({
      code: "NETWORK_ERROR",
      message: "The runtime service could not be reached.",
    });
  });

  it("classifies forbidden runtime responses as permission errors", () => {
    expect(
      normalizeCelanworksmithError({
        response: {
          status: 403,
          data: { code: "FORBIDDEN", message: "Internal access details" },
        },
      }),
    ).toEqual({
      code: "PERMISSION_DENIED",
      message: "You do not have permission to execute this Action.",
    });
  });

  it("omits an empty runtime filter", async () => {
    (Api.get as jest.Mock).mockResolvedValue({});

    await CelanworksmithAPI.queryObjects("PurchaseOrder", {
      offset: 0,
      limit: 100,
    });

    expect(Api.get).toHaveBeenCalledWith(
      "v1/celanworksmith/runtime/objects/PurchaseOrder",
      { offset: 0, limit: 100 },
    );
  });

  it("loads ontology projects and normalizes an unbound application", async () => {
    (Api.get as jest.Mock)
      .mockResolvedValueOnce({ responseMeta: { success: true }, data: [] })
      .mockResolvedValueOnce({ responseMeta: { success: true }, data: null });

    await expect(
      CelanworksmithAPI.listOntologyProjects(),
    ).resolves.toMatchObject({
      data: [],
    });
    await expect(
      CelanworksmithAPI.getApplicationOntologyBinding("app-1"),
    ).resolves.toMatchObject({ data: null });

    expect(Api.get).toHaveBeenNthCalledWith(
      1,
      "v1/celanworksmith/ontology/projects",
    );
    expect(Api.get).toHaveBeenNthCalledWith(
      2,
      "v1/celanworksmith/applications/app-1/ontology-binding",
    );
  });

  it("passes application context to ontology and runtime requests", async () => {
    (Api.get as jest.Mock).mockResolvedValue({});

    await CelanworksmithAPI.getFunctions("app-1");
    await CelanworksmithAPI.queryObjects("PurchaseOrder", undefined, "app-1");

    expect(Api.get).toHaveBeenNthCalledWith(
      1,
      "v1/celanworksmith/ontology/functions",
      { applicationId: "app-1" },
    );
    expect(Api.get).toHaveBeenNthCalledWith(
      2,
      "v1/celanworksmith/runtime/objects/PurchaseOrder",
      { applicationId: "app-1" },
    );
  });

  it("passes application context to function execution", async () => {
    (Api.post as jest.Mock).mockResolvedValue({});

    await CelanworksmithAPI.callFunction(
      "CalculateDelayDays",
      { poId: "PO001" },
      undefined,
      "app-1",
    );

    expect(Api.post).toHaveBeenCalledWith(
      "v1/celanworksmith/runtime/functions/CalculateDelayDays/execute?applicationId=app-1",
      { parameters: { poId: "PO001" } },
    );
  });

  it("passes application context to Action execution", async () => {
    (Api.post as jest.Mock).mockResolvedValue({});

    await CelanworksmithAPI.executeAction(
      "UpdateDeliveryDate",
      {
        objectTypeId: "PurchaseOrder",
        objectId: "PO001",
        parameters: { newDeliveryDate: "2026-03-01" },
      },
      undefined,
      "app-1",
    );

    expect(Api.post).toHaveBeenCalledWith(
      "v1/celanworksmith/runtime/actions/UpdateDeliveryDate/execute?applicationId=app-1",
      {
        objectTypeId: "PurchaseOrder",
        objectId: "PO001",
        parameters: { newDeliveryDate: "2026-03-01" },
      },
    );
  });
});
