import React from "react";
import { fireEvent, render } from "test/testUtils";
import { batchUpdateWidgetProperty } from "actions/controlActions";
import VariablesSection from "./VariablesSection";

const dispatch = jest.fn();
const useSelector = jest.fn();

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) => useSelector(selector),
}));

jest.mock("selectors/celanworksmithVariableSelectors", () => ({
  ...jest.requireActual("selectors/celanworksmithVariableSelectors"),
  getCelanworksmithVariableDefinitions: jest.fn(() => []),
  getCelanworksmithVariableRootWidgetIdFromState: jest.fn(() => "canvas"),
}));

jest.mock("selectors/dataTreeSelectors", () => ({
  ...jest.requireActual("selectors/dataTreeSelectors"),
  getCelanworksmithVariablesDataTree: jest.fn(() => ({
    ENTITY_TYPE: "CELANWORKSMITH_VARIABLES",
    _meta: {},
  })),
}));

describe("VariablesSection", () => {
  beforeEach(() => {
    dispatch.mockClear();
    useSelector.mockImplementation((selector: (value: unknown) => unknown) =>
      selector({}),
    );
  });

  it("creates an ObjectSet definition on the root widget", () => {
    const view = render(
      <VariablesSection
        functions={[]}
        objectInstances={{}}
        objectTypes={[
          {
            id: "PurchaseOrder",
            displayName: "Purchase Order",
            properties: [],
          },
        ]}
      />,
    );

    fireEvent.click(view.getByTestId("t--variables-add"));

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: batchUpdateWidgetProperty("canvas", { modify: {} }).type,
        payload: expect.objectContaining({
          widgetId: "canvas",
          updates: expect.objectContaining({
            modify: expect.objectContaining({
              celanworksmithVariables: [
                expect.objectContaining({
                  kind: "OBJECT_SET",
                  config: { typeId: "PurchaseOrder", limit: 100 },
                }),
              ],
            }),
          }),
        }),
      }),
    );
  });
});
