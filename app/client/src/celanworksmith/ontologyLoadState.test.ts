import {
  createOntologyLoadState,
  getOntologyLoadErrorMessage,
  normalizeOntologyLoadError,
  transitionOntologyLoadState,
  type OntologyLoadState,
} from "./ontologyLoadState";

type Result = { id: string };

const previousSuccess: OntologyLoadState<Result> = {
  requestKey: "objects/Supplier",
  status: "ready",
  data: { id: "supplier-1" },
  updatedAt: 100,
  canRetry: false,
};

describe("OntologyLoadState", () => {
  it.each([
    [
      "idle",
      createOntologyLoadState<Result>("objects/Supplier"),
      {
        requestKey: "objects/Supplier",
        status: "idle",
        canRetry: false,
      },
    ],
    [
      "loading",
      transitionOntologyLoadState(previousSuccess, { type: "loading" }),
      {
        requestKey: "objects/Supplier",
        status: "loading",
        data: { id: "supplier-1" },
        updatedAt: 100,
        canRetry: false,
      },
    ],
    [
      "ready",
      transitionOntologyLoadState(previousSuccess, {
        type: "ready",
        data: { id: "supplier-2" },
        updatedAt: 200,
      }),
      {
        requestKey: "objects/Supplier",
        status: "ready",
        data: { id: "supplier-2" },
        updatedAt: 200,
        canRetry: false,
      },
    ],
    [
      "empty",
      transitionOntologyLoadState(previousSuccess, {
        type: "empty",
        data: { id: "empty" },
        updatedAt: 200,
      }),
      {
        requestKey: "objects/Supplier",
        status: "empty",
        data: { id: "empty" },
        updatedAt: 200,
        canRetry: false,
      },
    ],
    [
      "error",
      transitionOntologyLoadState(previousSuccess, {
        type: "error",
        error: { code: "NETWORK_ERROR" },
      }),
      {
        requestKey: "objects/Supplier",
        status: "error",
        data: { id: "supplier-1" },
        updatedAt: 100,
        error: {
          code: "NETWORK_ERROR",
          message: "The runtime service could not be reached.",
        },
        canRetry: true,
      },
    ],
    [
      "permissionDenied",
      transitionOntologyLoadState(previousSuccess, {
        type: "permissionDenied",
        error: { code: "FORBIDDEN", message: "Not allowed" },
      }),
      {
        requestKey: "objects/Supplier",
        status: "permissionDenied",
        data: { id: "supplier-1" },
        updatedAt: 100,
        error: {
          code: "PERMISSION_DENIED",
          message: "You do not have permission to access this ontology data.",
        },
        canRetry: false,
      },
    ],
    [
      "typeMismatch",
      transitionOntologyLoadState(previousSuccess, {
        type: "typeMismatch",
        error: { code: "TYPE_MISMATCH", message: "Expected Supplier" },
      }),
      {
        requestKey: "objects/Supplier",
        status: "typeMismatch",
        data: { id: "supplier-1" },
        updatedAt: 100,
        error: {
          code: "TYPE_MISMATCH",
          message: "The ontology data does not match the expected type.",
        },
        canRetry: false,
      },
    ],
  ] as const)("builds the %s state node", (_status, state, expected) => {
    expect(state).toEqual(expected);
  });

  it("clears data only when the request key changes", () => {
    expect(
      transitionOntologyLoadState(previousSuccess, {
        type: "loading",
        requestKey: "objects/PurchaseOrder",
      }),
    ).toEqual({
      requestKey: "objects/PurchaseOrder",
      status: "loading",
      canRetry: false,
    });
  });

  it.each([
    [
      "permissionDenied",
      { response: { status: 403, data: { message: "internal details" } } },
      "PERMISSION_DENIED",
      "You do not have permission to access this ontology data.",
    ],
    [
      "typeMismatch",
      { code: "PROPERTY_TYPE_MISMATCH", message: "internal details" },
      "TYPE_MISMATCH",
      "The ontology data does not match the expected type.",
    ],
  ] as const)(
    "derives %s from a generic error transition",
    (status, error, code, message) => {
      expect(
        transitionOntologyLoadState(previousSuccess, {
          type: "error",
          error,
        }),
      ).toEqual({
        requestKey: "objects/Supplier",
        status,
        data: { id: "supplier-1" },
        updatedAt: 100,
        error: { code, message },
        canRetry: false,
      });
    },
  );
});

describe("ontology load errors", () => {
  it.each([
    ["FORBIDDEN", "PERMISSION_DENIED"],
    ["UNAUTHORIZED", "PERMISSION_DENIED"],
    ["TYPE_MISMATCH", "TYPE_MISMATCH"],
    ["FUNCTION_NOT_FOUND", "UNKNOWN_FUNCTION"],
    ["unexpected", "BACKEND_ERROR"],
  ] as const)("normalizes %s as %s", (code, expectedCode) => {
    expect(normalizeOntologyLoadError({ code })).toMatchObject({
      code: expectedCode,
    });
  });

  it.each([
    [
      "an HTTP 403 response",
      { response: { status: 403, data: { message: "sensitive detail" } } },
    ],
    [
      "an Appsmith authorization envelope",
      {
        response: {
          data: {
            responseMeta: {
              error: { code: "AE-ACL-4003", message: "sensitive detail" },
            },
          },
        },
      },
    ],
  ] as const)(
    "normalizes %s without exposing its message",
    (_description, error) => {
      expect(normalizeOntologyLoadError(error)).toEqual({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to access this ontology data.",
      });
    },
  );

  it("uses safe user messages for permission and type errors", () => {
    expect(getOntologyLoadErrorMessage("PERMISSION_DENIED")).toBe(
      "You do not have permission to access this ontology data.",
    );
    expect(getOntologyLoadErrorMessage("TYPE_MISMATCH")).toBe(
      "The ontology data does not match the expected type.",
    );
  });
});
