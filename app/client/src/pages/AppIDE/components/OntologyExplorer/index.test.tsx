import React from "react";
import { fireEvent, render, waitFor } from "test/testUtils";
import OntologyExplorer from "./index";
import CelanworksmithAPI from "api/CelanworksmithAPI";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";
import { getCelanworksmithOntologyState } from "selectors/celanworksmithSelectors";

const dispatch = jest.fn();
const selectorState = {
  entities: { pageList: {} as { applicationId?: string } },
};

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) =>
    selector(selectorState),
}));

jest.mock("selectors/celanworksmithSelectors", () => ({
  getCelanworksmithOntologyState: jest.fn(),
}));

jest.mock("api/CelanworksmithAPI", () => ({
  __esModule: true,
  normalizeCelanworksmithError: jest.requireActual("api/CelanworksmithAPI")
    .normalizeCelanworksmithError,
  default: {
    getObjectTypes: jest.fn(),
    getLinkTypes: jest.fn(),
  },
}));

const apiResponse = <T,>(data: T) => ({
  responseMeta: { status: 200, success: true },
  data,
});

describe("OntologyExplorer", () => {
  beforeEach(() => {
    dispatch.mockClear();
    delete selectorState.entities.pageList.applicationId;
    delete (selectorState as Record<string, unknown>)
      .celanworksmithApplicationBinding;
    jest.mocked(CelanworksmithAPI.getObjectTypes).mockClear();
    jest.mocked(CelanworksmithAPI.getLinkTypes).mockClear();
    jest.mocked(getCelanworksmithOntologyState).mockReturnValue({
      status: "ready",
      functions: [
        {
          id: "CalculateDelayDays",
          displayName: "Calculate Delay Days",
          description: "Calculates delay days",
          semanticType: "business.function",
          examples: ["CalculateDelayDays"],
          returnType: "INTEGER",
          parameters: [],
          sideEffectFree: true,
        },
      ],
      actions: [
        {
          id: "UpdateDeliveryDate",
          displayName: "Update Delivery Date",
          description: "Updates a delivery date",
          semanticType: "business.action",
          examples: ["UpdateDeliveryDate"],
          objectTypeId: "PurchaseOrder",
          parameters: [],
          requiresConfirmation: true,
        },
      ],
    });
    jest.mocked(CelanworksmithAPI.getObjectTypes).mockResolvedValue(
      apiResponse([
        {
          id: "Supplier",
          displayName: "Supplier",
          description: "A supplier organization",
          semanticType: "business.party",
          examples: ["Supplier 1"],
          properties: [
            {
              id: "name",
              displayName: "Name",
              description: "Supplier name",
              semanticType: "business.name",
              examples: ["Acme"],
              dataType: "STRING",
              required: true,
              readOnly: false,
              derived: false,
            },
          ],
        },
      ]),
    );
    jest.mocked(CelanworksmithAPI.getLinkTypes).mockResolvedValue(
      apiResponse([
        {
          id: "supplier_orders",
          displayName: "Supplier Orders",
          description: "Orders placed with a supplier",
          semanticType: "business.relationship",
          examples: ["supplier_orders"],
          sourceTypeId: "Supplier",
          targetTypeId: "PurchaseOrder",
          cardinality: "ONE_TO_MANY",
        },
      ]),
    );
  });

  it("does not query ontology metadata before an application binding is ready", async () => {
    selectorState.entities.pageList.applicationId = "app-1";
    (
      selectorState as Record<string, unknown>
    ).celanworksmithApplicationBinding = {
      status: "loading",
      applicationId: "app-1",
      binding: null,
      projects: [],
      versions: [],
    };
    const view = render(<OntologyExplorer />);

    await waitFor(() => expect(view.container).toBeTruthy());

    expect(CelanworksmithAPI.getObjectTypes).not.toHaveBeenCalled();
    expect(CelanworksmithAPI.getLinkTypes).not.toHaveBeenCalled();
  });

  it("renders metadata and shows selected item details", async () => {
    const view = render(<OntologyExplorer />);

    expect(
      await view.findByTestId("t--ontology-object-type-Supplier"),
    ).toBeTruthy();
    expect(
      view.getByTestId("t--ontology-link-type-supplier_orders"),
    ).toBeTruthy();
    expect(
      view.getByTestId("t--ontology-function-CalculateDelayDays"),
    ).toBeTruthy();
    expect(
      view.getByTestId("t--ontology-action-UpdateDeliveryDate"),
    ).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalledWith(
      celanworksmithOntologyLoadRequest(),
    );

    fireEvent.click(view.getByTestId("t--ontology-expand-Supplier"));
    fireEvent.click(view.getByTestId("t--ontology-property-Supplier-name"));

    expect(view.getByText("Property / 属性")).toBeTruthy();
    expect(view.getAllByText("STRING")).toHaveLength(2);
  });

  it("requests ontology metadata when retrying after a failed load", async () => {
    jest.mocked(getCelanworksmithOntologyState).mockReturnValue({
      status: "error",
      functions: [],
      actions: [],
      error: { code: "ONTOLOGY_ERROR", message: "Unable to load ontology" },
    });

    const view = render(<OntologyExplorer />);
    const retry = await view.findByTestId("t--ontology-retry");

    expect(dispatch).not.toHaveBeenCalledWith(
      celanworksmithOntologyLoadRequest(),
    );

    fireEvent.click(retry);

    expect(dispatch).toHaveBeenCalledWith(celanworksmithOntologyLoadRequest());
    expect(
      dispatch.mock.calls.filter(
        ([action]) => action.type === celanworksmithOntologyLoadRequest().type,
      ),
    ).toHaveLength(1);
    await waitFor(() =>
      expect(CelanworksmithAPI.getObjectTypes).toHaveBeenCalledTimes(2),
    );
  });

  it("shows semantic metadata for selected ontology nodes", async () => {
    const view = render(<OntologyExplorer />);

    expect(
      await view.findByTestId("t--ontology-object-type-Supplier"),
    ).toBeTruthy();
    fireEvent.click(view.getByTestId("t--ontology-object-type-Supplier"));
    expect(view.getByText("A supplier organization")).toBeTruthy();
    expect(view.getByText("business.party")).toBeTruthy();
    expect(view.getByText("Supplier 1")).toBeTruthy();

    fireEvent.click(view.getByTestId("t--ontology-expand-Supplier"));
    fireEvent.click(view.getByTestId("t--ontology-property-Supplier-name"));
    expect(view.getByText("Supplier name")).toBeTruthy();
    expect(view.getByText("business.name")).toBeTruthy();
  });

  it("renders a retry state for an ontology metadata error envelope", async () => {
    jest.mocked(CelanworksmithAPI.getObjectTypes).mockResolvedValue({
      responseMeta: {
        status: 503,
        success: false,
        error: {
          code: "PROVIDER_NOT_CONFIGURED",
          message: "Production ontology provider is not configured",
        },
      },
      data: null,
    } as never);
    jest.mocked(CelanworksmithAPI.getLinkTypes).mockResolvedValue({
      responseMeta: {
        status: 503,
        success: false,
        error: {
          code: "PROVIDER_NOT_CONFIGURED",
          message: "Production ontology provider is not configured",
        },
      },
      data: null,
    } as never);

    const view = render(<OntologyExplorer />);

    expect(await view.findByTestId("t--ontology-retry")).toBeTruthy();
  });

  it("preserves metadata permission errors and retries the metadata node", async () => {
    selectorState.entities.pageList.applicationId = "app-1";
    (
      selectorState as Record<string, unknown>
    ).celanworksmithApplicationBinding = {
      status: "ready",
      applicationId: "app-1",
      binding: {
        applicationId: "app-1",
        projectId: "celanworksmith-demo",
        projectVersion: "1.0.0",
        providerId: "mongodb-readonly",
      },
      projects: [],
      versions: [],
    };
    jest.mocked(CelanworksmithAPI.getObjectTypes).mockRejectedValue({
      response: {
        status: 403,
        data: {
          responseMeta: {
            status: 403,
            success: false,
            error: { code: "FORBIDDEN", message: "token=server-secret" },
          },
        },
      },
    });

    const view = render(<OntologyExplorer />);

    expect(view.queryByText("token=server-secret")).toBeNull();
    fireEvent.click(await view.findByText("Developer tools / 开发工具"));
    expect(view.getByText("Error / PERMISSION_DENIED")).toBeTruthy();

    fireEvent.click(view.getByTestId("t--celanworksmith-debug-retry"));

    expect(dispatch).toHaveBeenCalledWith(
      celanworksmithOntologyLoadRequest("app-1"),
    );
    await waitFor(() =>
      expect(CelanworksmithAPI.getObjectTypes).toHaveBeenCalledTimes(2),
    );
  });

  it("hides semantic details when ontology permission is denied", async () => {
    jest.mocked(getCelanworksmithOntologyState).mockReturnValue({
      status: "ready",
      functions: [],
      actions: [],
      error: {
        code: "PERMISSION_DENIED",
        message: "Ontology access denied",
      },
    });

    const view = render(<OntologyExplorer />);

    expect(
      await view.findByTestId("t--ontology-object-type-Supplier"),
    ).toBeTruthy();
    fireEvent.click(view.getByTestId("t--ontology-object-type-Supplier"));

    expect(view.queryByText("A supplier organization")).toBeNull();
    expect(view.queryByText("business.party")).toBeNull();
    expect(view.queryByText("Supplier 1")).toBeNull();
  });

  it("shows the binding entry point without querying an unbound app", async () => {
    selectorState.entities.pageList.applicationId = "app-1";
    (
      selectorState as Record<string, unknown>
    ).celanworksmithApplicationBinding = {
      status: "unbound",
      applicationId: "app-1",
      binding: null,
      projects: [],
      versions: [],
    };

    const view = render(<OntologyExplorer />);

    expect(
      await view.findByTestId("t--celanworksmith-binding-panel"),
    ).toBeTruthy();
    expect(CelanworksmithAPI.getObjectTypes).not.toHaveBeenCalled();
    expect(CelanworksmithAPI.getLinkTypes).not.toHaveBeenCalled();
  });

  it("keeps hook order when an app becomes bound", async () => {
    selectorState.entities.pageList.applicationId = "app-1";
    (
      selectorState as Record<string, unknown>
    ).celanworksmithApplicationBinding = {
      status: "unbound",
      applicationId: "app-1",
      binding: null,
      projects: [],
      versions: [],
    };

    const view = render(<OntologyExplorer />);

    (
      selectorState as Record<string, unknown>
    ).celanworksmithApplicationBinding = {
      status: "ready",
      applicationId: "app-1",
      binding: {
        applicationId: "app-1",
        projectId: "celanworksmith-demo",
        projectVersion: "1.0.0",
        providerId: "mongodb-readonly",
      },
      projects: [],
      versions: [],
    };

    expect(() => view.rerender(<OntologyExplorer />)).not.toThrow();
    expect(
      await view.findByTestId("t--ontology-object-type-Supplier"),
    ).toBeTruthy();
  });
});
