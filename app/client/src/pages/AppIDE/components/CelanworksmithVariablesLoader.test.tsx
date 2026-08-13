import React from "react";
import { render } from "test/testUtils";
import { celanworksmithFunctionRun } from "actions/celanworksmithExecutionActions";
import { celanworksmithObjectQueryRequested } from "actions/celanworksmithObjectQueryActions";
import CelanworksmithVariablesLoader from "./CelanworksmithVariablesLoader";

const dispatch = jest.fn();
const useSelector = jest.fn();

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) => useSelector(selector),
}));

const state = {
  entities: {
    canvasWidgets: {
      canvas: {
        widgetId: "canvas",
        type: "CANVAS_WIDGET",
        celanworksmithVariables: [
          {
            id: "orders",
            name: "orders",
            kind: "OBJECT_SET",
            version: 1,
            updatedAt: 1,
            dependencies: [],
            config: { typeId: "PurchaseOrder", limit: 10 },
          },
          {
            id: "delay",
            name: "delay",
            kind: "FUNCTION",
            version: 1,
            updatedAt: 1,
            dependencies: [],
            config: {
              functionId: "CalculateDelayDays",
              parameters: { poId: "PO001" },
            },
          },
        ],
      },
    },
    pageList: { applicationId: "app-1" },
  },
  celanworksmithApplicationBinding: {
    status: "ready",
    applicationId: "app-1",
    binding: null,
    projects: [],
    versions: [],
  },
  celanworksmithObjects: {
    status: "ready",
    types: {
      PurchaseOrder: {
        metadata: {
          id: "PurchaseOrder",
          displayName: "Purchase Order",
          properties: [],
        },
        items: [],
        total: 0,
        offset: 0,
        limit: 100,
        status: "ready",
      },
    },
  },
  celanworksmithOntology: {
    status: "ready",
    functions: [
      {
        id: "CalculateDelayDays",
        displayName: "Calculate delay days",
        returnType: "INTEGER",
        parameters: [],
        sideEffectFree: true,
      },
    ],
    actions: [],
  },
  celanworksmithExecution: {
    functions: {},
    actions: {},
    requests: {},
    functionCache: {},
    inputs: {},
  },
  celanworksmithObjectQueries: { entries: {} },
};

describe("CelanworksmithVariablesLoader", () => {
  beforeEach(() => {
    dispatch.mockClear();
    useSelector.mockImplementation((selector: (value: unknown) => unknown) =>
      selector(state),
    );
  });

  it("loads referenced ObjectSet and Function variables", () => {
    render(<CelanworksmithVariablesLoader />);

    expect(dispatch).toHaveBeenCalledWith(
      celanworksmithObjectQueryRequested({
        widgetId: "$variable/orders",
        typeId: "PurchaseOrder",
        query: { offset: 0, limit: 10 },
        applicationId: "app-1",
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: celanworksmithFunctionRun("CalculateDelayDays", {
          poId: "PO001",
        }).type,
        payload: expect.objectContaining({
          functionId: "CalculateDelayDays",
          parameters: { poId: "PO001" },
        }),
      }),
    );
  });
});
