import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import ProgressWidget, { ProgressObjectMode } from ".";
import { ProgressType, ProgressVariant } from "../constants";

const mockStore = configureStore([]);

const progressProps = {
  borderRadius: "4px",
  componentHeight: 40,
  componentWidth: 280,
  counterClockwise: false,
  fillColor: "#22c55e",
  isIndeterminate: false,
  progress: 25,
  progressType: ProgressType.LINEAR,
  showResult: true,
  steps: 1,
  type: "PROGRESS_WIDGET",
  widgetId: "Progress1",
  widgetName: "Progress1",
} as const;

const metadata = {
  id: "PurchaseOrder",
  displayName: "Purchase order",
  properties: [
    {
      id: "completion",
      displayName: "Completion",
      dataType: "DECIMAL",
      required: false,
      readOnly: false,
      derived: false,
    },
  ],
};

const renderObjectMode = (state: Record<string, unknown>) =>
  render(
    <Provider store={mockStore(state)}>
      <ProgressObjectMode
        aggregationVariableName={undefined}
        componentProps={{
          borderRadius: "4px",
          counterClockwise: false,
          fillColor: "#22c55e",
          isScaleY: false,
          showResult: true,
          steps: 1,
          type: ProgressType.LINEAR,
          variant: ProgressVariant.DETERMINATE,
        }}
        objectTypeId="PurchaseOrder"
        valuePropertyId="completion"
        widgetId="Progress1"
      />
    </Provider>,
  );

describe("ProgressWidget Object mode", () => {
  it("selects the local ObjectSet adapter while retaining Query and legacy views", () => {
    const objectView = new ProgressWidget({
      ...progressProps,
      dataMode: "OBJECT",
      objectTypeId: "PurchaseOrder",
      valuePropertyId: "completion",
    }).getWidgetView();
    const queryView = new ProgressWidget({
      ...progressProps,
      dataMode: "QUERY",
    }).getWidgetView();
    const legacyView = new ProgressWidget(progressProps).getWidgetView();

    expect(ProgressWidget.getDefaults().dataMode).toBe("OBJECT");
    expect(objectView.type).toBe(ProgressObjectMode);
    expect(queryView.type).not.toBe(ProgressObjectMode);
    expect(legacyView.type).not.toBe(ProgressObjectMode);
    expect(queryView.props.value).toBe(25);
    expect(legacyView.props.value).toBe(25);
  });

  it("renders the ObjectSet numeric value instead of the native Progress value", () => {
    const request = {
      widgetId: "Progress1",
      typeId: "PurchaseOrder",
      query: { limit: 100, offset: 0 },
    };
    const { getObjectQueryKey } = jest.requireActual(
      "reducers/celanworksmithObjectQueryReducer",
    );

    renderObjectMode({
      celanworksmithObjects: {
        status: "ready",
        types: { PurchaseOrder: { metadata, status: "ready" } },
      },
      celanworksmithObjectQueries: {
        entries: {
          [getObjectQueryKey(request)]: {
            request,
            status: "ready",
            result: {
              typeId: "PurchaseOrder",
              items: [
                {
                  id: "PO001",
                  typeId: "PurchaseOrder",
                  properties: { completion: 42 },
                },
              ],
              offset: 0,
              limit: 100,
              total: 1,
            },
          },
        },
      },
      canvasWidgets: {},
      celanworksmithExecution: {
        actions: {},
        functionCache: {},
        functions: {},
        inputs: {},
        requests: {},
      },
    });

    expect(screen.getByTestId("42")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("renders visible Object binding errors instead of a zero value", () => {
    renderObjectMode({
      celanworksmithObjects: { status: "ready", types: {} },
      celanworksmithObjectQueries: { entries: {} },
      canvasWidgets: {},
      celanworksmithExecution: {
        actions: {},
        functionCache: {},
        functions: {},
        inputs: {},
        requests: {},
      },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The Object binding is incompatible.",
    );
    expect(screen.queryByTestId("0")).not.toBeInTheDocument();
  });

  it("keeps native progress values while Object fields are configured but inactive", () => {
    const view = new ProgressWidget({
      ...progressProps,
      aggregationVariableName: "orderCompletion",
      dataMode: "QUERY",
      objectTypeId: "PurchaseOrder",
      valuePropertyId: "completion",
    }).getWidgetView();

    expect(view.type).not.toBe(ProgressObjectMode);
    expect(view.props.value).toBe(25);
  });
});
