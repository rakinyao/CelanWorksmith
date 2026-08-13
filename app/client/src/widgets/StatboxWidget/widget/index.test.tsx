import {
  getStatboxObjectStateMessage,
  resolveStatboxObjectValue,
  StatboxObjectMode,
} from ".";
import StatboxWidget from ".";
import type { StatboxWidgetProps } from ".";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { getObjectQueryKey } from "reducers/celanworksmithObjectQueryReducer";

const objectSet = {
  typeId: "PurchaseOrder",
  items: [
    {
      id: "PO001",
      typeId: "PurchaseOrder",
      properties: { delayDays: 4 },
    },
  ],
  limit: 100,
  offset: 0,
  total: 1,
};

const objectMetadata = {
  id: "PurchaseOrder",
  displayName: "Purchase order",
  properties: [
    {
      id: "delayDays",
      displayName: "Delay days",
      dataType: "INTEGER",
      required: false,
      readOnly: false,
      derived: false,
    },
  ],
};

describe("Statbox Object mode", () => {
  test("defaults new widgets to Object mode while a legacy DSL keeps its native Container view", () => {
    const legacyProps = {
      children: [],
      widgetId: "Statbox1",
      widgetName: "Statbox1",
    } as unknown as StatboxWidgetProps;

    expect(StatboxWidget.getDefaults().dataMode).toBe("OBJECT");
    expect(new StatboxWidget(legacyProps).getWidgetView().type).not.toBe(
      StatboxObjectMode,
    );
  });

  test("uses the Object view only for an explicit Object DSL", () => {
    const objectProps = {
      children: [],
      dataMode: "OBJECT",
      objectTypeId: "PurchaseOrder",
      valuePropertyId: "delayDays",
      widgetId: "Statbox1",
      widgetName: "Statbox1",
    } as unknown as StatboxWidgetProps;

    expect(new StatboxWidget(objectProps).getWidgetView().type).toBe(
      StatboxObjectMode,
    );
  });

  test("renders a ready aggregation-only variable without an Object Type", () => {
    const request = {
      query: { limit: 100, offset: 0 },
      typeId: "PurchaseOrder",
      widgetId: "$variable/orders",
    };
    const store = configureStore()({
      celanworksmithExecution: {
        actions: {},
        functionCache: {},
        functions: {},
        inputs: {},
        requests: {},
      },
      celanworksmithObjectQueries: {
        entries: {
          [getObjectQueryKey(request)]: {
            request,
            result: {
              items: [
                {
                  id: "PO001",
                  properties: { delayDays: 4 },
                  typeId: "PurchaseOrder",
                },
              ],
              limit: 100,
              offset: 0,
              total: 1,
              typeId: "PurchaseOrder",
            },
            status: "ready",
          },
        },
      },
      celanworksmithObjects: { status: "ready", types: {} },
      entities: {
        canvasWidgets: {
          Canvas1: {
            celanworksmithVariables: [
              {
                config: { limit: 100, typeId: "PurchaseOrder" },
                dependencies: [],
                id: "orders",
                kind: "OBJECT_SET",
                name: "orders",
                updatedAt: 1,
                version: 1,
              },
              {
                config: {
                  operation: "sum",
                  propertyId: "delayDays",
                  sourceVariableId: "orders",
                },
                dependencies: ["orders"],
                id: "totalDelay",
                kind: "AGGREGATION",
                name: "totalDelay",
                updatedAt: 1,
                version: 1,
              },
            ],
            type: "CANVAS_WIDGET",
            widgetId: "Canvas1",
          },
        },
      },
    });

    render(
      <Provider store={store}>
        <StatboxObjectMode
          aggregationVariableName="$variables.totalDelay"
          binding={{}}
          title="Total delay"
          widgetId="Statbox1"
        />
      </Provider>,
    );

    expect(screen.getByTestId("statbox-object-value")).toHaveTextContent("4");
  });

  test("exposes stable Object configuration controls", () => {
    const controls = StatboxWidget.getPropertyPaneContentConfig().flatMap(
      (section) => section.children || [],
    );

    expect(
      controls.filter((control) =>
        [
          "dataMode",
          "objectTypeId",
          "valuePropertyId",
          "aggregationVariableName",
          "title",
        ].includes(control.propertyName),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          propertyName: "objectTypeId",
          controlType: "CELANWORKSMITH_OBJECT_TYPE",
        }),
        expect.objectContaining({
          propertyName: "valuePropertyId",
          controlType: "CELANWORKSMITH_OBJECT_PROPERTY",
        }),
        expect.objectContaining({
          propertyName: "aggregationVariableName",
          controlType: "INPUT_TEXT",
        }),
      ]),
    );
  });

  test("resolves a numeric property from exactly one ObjectSet row", () => {
    expect(
      resolveStatboxObjectValue({
        binding: { valuePropertyId: "delayDays" },
        metadata: objectMetadata,
        result: objectSet,
      }),
    ).toEqual({ state: "ready", value: 4 });
  });

  test("rejects a numeric runtime value when metadata marks the property non-numeric", () => {
    expect(
      resolveStatboxObjectValue({
        binding: { valuePropertyId: "delayDays" },
        metadata: {
          ...objectMetadata,
          properties: [{ ...objectMetadata.properties[0], dataType: "STRING" }],
        },
        result: objectSet,
      }),
    ).toEqual({ state: "typeMismatch" });
  });

  test("requires an aggregation variable when the ObjectSet has multiple rows", () => {
    expect(
      resolveStatboxObjectValue({
        binding: { valuePropertyId: "delayDays" },
        metadata: objectMetadata,
        result: {
          ...objectSet,
          items: [...objectSet.items, { ...objectSet.items[0], id: "PO002" }],
          total: 2,
        },
      }),
    ).toEqual({ state: "typeMismatch" });
  });

  test("uses a numeric aggregation variable and rejects missing or non-numeric values", () => {
    expect(
      resolveStatboxObjectValue({
        aggregationVariableName: "averageDelay",
        variables: { averageDelay: 6.5 },
      }),
    ).toEqual({ state: "ready", value: 6.5 });
    expect(
      resolveStatboxObjectValue({
        aggregationVariableName: "averageDelay",
        variables: {},
      }),
    ).toEqual({ state: "empty" });
    expect(
      resolveStatboxObjectValue({
        aggregationVariableName: "averageDelay",
        variables: { averageDelay: "six" },
      }),
    ).toEqual({ state: "typeMismatch" });
  });

  test("provides visible messages for every Object state", () => {
    expect(getStatboxObjectStateMessage("missingBinding")).toBe(
      "Select an Object Type and a numeric value source.",
    );
    expect(getStatboxObjectStateMessage("loading")).toBe(
      "Loading object data...",
    );
    expect(getStatboxObjectStateMessage("empty")).toBe("No objects found.");
    expect(getStatboxObjectStateMessage("error", "Runtime unavailable")).toBe(
      "Runtime unavailable",
    );
    expect(getStatboxObjectStateMessage("permissionDenied")).toBe(
      "Access to object data is denied.",
    );
    expect(getStatboxObjectStateMessage("typeMismatch")).toBe(
      "The Object value must be a finite number.",
    );
  });

  test("renders a missing binding before the shared ObjectSet type mismatch", () => {
    const store = configureStore()({
      celanworksmithObjects: { status: "ready", types: {} },
      celanworksmithObjectQueries: { entries: {} },
      entities: { canvasWidgets: {} },
    });

    render(
      <Provider store={store}>
        <StatboxObjectMode
          binding={{}}
          nativeView={<div />}
          widgetId="Statbox1"
        />
      </Provider>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Select an Object Type and a numeric value source.",
    );
  });

  test("does not render native blueprint content in Object mode", () => {
    const store = configureStore()({
      celanworksmithObjects: { status: "ready", types: {} },
      celanworksmithObjectQueries: { entries: {} },
      entities: { canvasWidgets: {} },
    });
    const props = {
      binding: { valuePropertyId: "delayDays" },
      nativeView: <span>Legacy static blueprint</span>,
      objectTypeId: "PurchaseOrder",
      widgetId: "Statbox1",
    } as unknown as React.ComponentProps<typeof StatboxObjectMode>;

    render(
      <Provider store={store}>
        <StatboxObjectMode {...props} />
      </Provider>,
    );

    expect(
      screen.queryByText("Legacy static blueprint"),
    ).not.toBeInTheDocument();
  });
});
