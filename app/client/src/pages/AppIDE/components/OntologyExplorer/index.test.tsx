import React from "react";
import { act, fireEvent, render } from "test/testUtils";
import OntologyExplorer from "./index";
import CelanworksmithAPI from "api/CelanworksmithAPI";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";
import { getCelanworksmithOntologyState } from "selectors/celanworksmithSelectors";

const dispatch = jest.fn();

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock("selectors/celanworksmithSelectors", () => ({
  getCelanworksmithOntologyState: jest.fn(),
}));

jest.mock("api/CelanworksmithAPI", () => ({
  __esModule: true,
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
    jest.mocked(getCelanworksmithOntologyState).mockReturnValue({
      status: "ready",
      functions: [
        {
          id: "CalculateDelayDays",
          displayName: "Calculate Delay Days",
          returnType: "INTEGER",
          parameters: [],
          sideEffectFree: true,
        },
      ],
      actions: [
        {
          id: "UpdateDeliveryDate",
          displayName: "Update Delivery Date",
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
          properties: [
            {
              id: "name",
              displayName: "Name",
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
          sourceTypeId: "Supplier",
          targetTypeId: "PurchaseOrder",
          cardinality: "ONE_TO_MANY",
        },
      ]),
    );
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

    act(() => {
      fireEvent.click(view.getByTestId("t--ontology-expand-Supplier"));
    });
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
  });
});
