import { emptyChartData } from ".";
import ChartWidget, { ChartObjectMode } from ".";
import { contentConfig } from "./propertyConfig";
import { LabelOrientation } from "../constants";
import type { ChartWidgetProps } from ".";
import type { ChartData } from "../constants";
import { RenderModes } from "constants/WidgetConstants";
import { getObjectQueryKey } from "reducers/celanworksmithObjectQueryReducer";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";

describe("emptyChartData", () => {
  const seriesData1: ChartData = {
    seriesName: "series1",
    data: [{ x: "x1", y: 1 }],
    color: "series1color",
  };
  const seriesData2: ChartData = {
    seriesName: "series2",
    data: [{ x: "x1", y: 2 }],
    color: "series2color",
  };
  const defaultProps: ChartWidgetProps = {
    allowScroll: true,
    showDataPointLabel: true,
    chartData: {
      seriesID1: seriesData1,
      seriesID2: seriesData2,
    },
    chartName: "chart name",
    type: "CHART_WIDGET",
    chartType: "AREA_CHART",
    customEChartConfig: {},
    customFusionChartConfig: { type: "type", dataSource: undefined },
    hasOnDataPointClick: true,
    isVisible: true,
    isLoading: false,
    setAdaptiveYMin: false,
    labelOrientation: LabelOrientation.AUTO,
    onDataPointClick: "",
    widgetId: "widgetID",
    xAxisName: "xaxisname",
    yAxisName: "yaxisname",
    borderRadius: "1",
    boxShadow: "1",
    primaryColor: "primarycolor",
    fontFamily: "fontfamily",
    dimensions: { componentWidth: 11, componentHeight: 11 },
    parentColumnSpace: 1,
    parentRowSpace: 1,
    topRow: 0,
    bottomRow: 0,
    leftColumn: 0,
    rightColumn: 0,
    widgetName: "widgetName",
    version: 1,
    renderMode: RenderModes.CANVAS,
  };

  describe("font family", () => {
    it("Does not use any font family as a fallback", () => {
      const widget = new ChartWidget(defaultProps);
      const view = widget.renderChartWithData();

      expect(view.props.children.props.fontFamily).toEqual("fontfamily");

      const propsWithoutFont: ChartWidgetProps = {
        ...defaultProps,
        fontFamily: undefined as unknown as string,
      };
      const viewWithoutFont = new ChartWidget(
        propsWithoutFont,
      ).renderChartWithData();

      expect(viewWithoutFont.props.children.props.fontFamily).toEqual(
        undefined,
      );
    });
  });

  describe("Object mode", () => {
    const objectBinding = {
      labelPropertyId: "supplierName",
      objectTypeId: "PurchaseOrder",
      propertyDataTypes: { valuePropertyId: ["INTEGER", "DECIMAL"] },
      valuePropertyId: "delayDays",
    };
    const objectMetadata = {
      id: "PurchaseOrder",
      displayName: "Purchase Order",
      properties: [
        {
          id: "supplierName",
          displayName: "Supplier",
          dataType: "STRING",
          required: false,
          readOnly: false,
          derived: false,
        },
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

    it("uses the shared ObjectSet binding bridge instead of Query chartData", () => {
      const widget = new ChartWidget({
        ...defaultProps,
        dataMode: "OBJECT",
        labelPropertyId: "supplierName",
        objectTypeId: "PurchaseOrder",
        valuePropertyId: "delayDays",
      });

      const view = widget.getWidgetView();

      expect(view.type).toBe(ChartObjectMode);
      expect(view.props.chartType).toBe(defaultProps.chartType);
      expect(view.props.objectTypeId).toBe("PurchaseOrder");
      expect(view.props.binding.labelPropertyId).toBe("supplierName");
      expect(view.props.binding.valuePropertyId).toBe("delayDays");
    });

    it("renders a ready aggregation variable without an ObjectSet mapping", () => {
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
                    properties: { delayDays: 6.5 },
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
                    operation: "avg",
                    propertyId: "delayDays",
                    sourceVariableId: "orders",
                  },
                  dependencies: ["orders"],
                  id: "averageDelay",
                  kind: "AGGREGATION",
                  name: "averageDelay",
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
        React.createElement(
          Provider,
          { store },
          React.createElement(ChartObjectMode, {
            binding: { aggregationVariableName: "$variables.averageDelay" },
            renderChart: (chartData) =>
              React.createElement(
                "div",
                { "data-testid": "aggregation-chart-data" },
                JSON.stringify(chartData),
              ),
            widgetId: "Chart1",
          }),
        ),
      );

      expect(screen.getByTestId("aggregation-chart-data")).toHaveTextContent(
        '"y":6.5',
      );
    });

    it("retains the native Chart rendering path for explicit Query mode and legacy DSL", () => {
      const view = new ChartWidget({
        ...defaultProps,
        dataMode: "QUERY",
      }).getWidgetView();
      const legacyDslView = new ChartWidget({
        ...defaultProps,
        dataMode: undefined,
      }).getWidgetView();

      expect(view.type).not.toBe(ChartObjectMode);
      expect(legacyDslView.type).not.toBe(ChartObjectMode);
    });

    it("maps ObjectSet values into the existing chart data shape", () => {
      const renderChart = jest.fn(() => undefined as never);
      const view = ChartObjectMode({
        binding: objectBinding,
        objectTypeId: "PurchaseOrder",
        renderChart,
        widgetId: "widgetID",
      });
      const renderObjectSet = view.props.children;

      renderObjectSet({
        metadata: objectMetadata,
        result: {
          items: [
            {
              id: "PO001",
              typeId: "PurchaseOrder",
              properties: { delayDays: 4, supplierName: 2025 },
            },
          ],
          limit: 100,
          offset: 0,
          total: 1,
          typeId: "PurchaseOrder",
        },
        status: "ready",
      });

      expect(renderChart).toHaveBeenCalledWith({
        objectSet: { data: [{ x: 2025, y: 4 }] },
      });
    });

    it.each(["CUSTOM_ECHART", "CUSTOM_FUSION_CHART"] as const)(
      "shows a type mismatch instead of using Query configuration for %s",
      (chartType) => {
        const renderChart = jest.fn(() => undefined as never);
        const view = ChartObjectMode({
          binding: objectBinding,
          chartType,
          objectTypeId: "PurchaseOrder",
          renderChart,
          widgetId: "widgetID",
        });

        expect(view.props.role).toBe("alert");
        expect(view.props.children).toBe("The Object binding is incompatible.");
        expect(renderChart).not.toHaveBeenCalled();
      },
    );

    it("shows an explicit missing binding state", () => {
      const view = ChartObjectMode({
        binding: {},
        renderChart: jest.fn(() => undefined as never),
        widgetId: "widgetID",
      });
      const message = view.props.children({ status: "typeMismatch" });

      expect(message.props.children).toBe(
        "Configure an Object Type, label property, and value property.",
      );
    });

    it.each([
      ["loading ObjectSets", { status: "loading" }, "Loading object data..."],
      ["empty ObjectSets", { status: "empty" }, "No objects found."],
      [
        "permission errors",
        { status: "permissionDenied" },
        "Access to object data is denied.",
      ],
      [
        "runtime errors",
        { error: { message: "Runtime unavailable" }, status: "error" },
        "Runtime unavailable",
      ],
      [
        "null numeric values",
        {
          metadata: objectMetadata,
          result: {
            items: [
              {
                id: "PO001",
                typeId: "PurchaseOrder",
                properties: { delayDays: null, supplierName: "Acme" },
              },
            ],
            limit: 100,
            offset: 0,
            total: 1,
            typeId: "PurchaseOrder",
          },
          status: "ready",
        },
        "The Object binding is incompatible.",
      ],
    ])("shows a visible state for %s", (_case, objectSet, expectedMessage) => {
      const view = ChartObjectMode({
        binding: objectBinding,
        renderChart: jest.fn(() => undefined as never),
        widgetId: "widgetID",
      });
      const message = view.props.children(objectSet);

      expect(message.props.children).toBe(expectedMessage);
    });
  });

  describe("Object property pane", () => {
    it("defaults new widgets to Object mode and exposes stable Object IDs", () => {
      const controls = contentConfig().flatMap((section) => section.children);

      expect(ChartWidget.getDefaults().dataMode).toBe("OBJECT");
      expect(controls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ propertyName: "dataMode" }),
          expect.objectContaining({
            controlType: "CELANWORKSMITH_OBJECT_TYPE",
            propertyName: "objectTypeId",
          }),
          expect.objectContaining({
            controlType: "CELANWORKSMITH_OBJECT_PROPERTY",
            propertyName: "labelPropertyId",
          }),
          expect.objectContaining({
            controlType: "CELANWORKSMITH_OBJECT_PROPERTY",
            propertyName: "valuePropertyId",
          }),
          expect.objectContaining({
            controlType: "CELANWORKSMITH_OBJECT_PROPERTY",
            propertyName: "groupPropertyId",
          }),
          expect.objectContaining({
            controlType: "INPUT_TEXT",
            propertyName: "aggregationVariableName",
          }),
        ]),
      );
    });
  });

  describe("when chart type is basic ECharts", () => {
    const basicEChartProps = JSON.parse(JSON.stringify(defaultProps));
    const basicEChartsType = "LINE_CHART";

    basicEChartProps.chartType = basicEChartsType;

    it("returns true if each series data is absent", () => {
      const props = JSON.parse(JSON.stringify(basicEChartProps));

      props.chartData.seriesID1 = { data: [] };
      props.chartData.seriesID2 = { data: [] };

      expect(emptyChartData(props)).toEqual(true);
    });

    it("returns true if each series is null or undefined", () => {
      const props = JSON.parse(JSON.stringify(basicEChartProps));

      props.chartData.seriesID1 = { data: undefined };
      props.chartData.seriesID2 = { data: null };

      expect(emptyChartData(props)).toEqual(true);
    });

    it("returns true if no series is present", () => {
      const props = JSON.parse(JSON.stringify(basicEChartProps));

      props.chartData = {};
      expect(emptyChartData(props)).toEqual(true);
    });

    it("returns false if all series data are present", () => {
      const props = JSON.parse(JSON.stringify(basicEChartProps));

      expect(emptyChartData(props)).toEqual(false);
    });

    it("returns false if any of the series data is present", () => {
      const props = JSON.parse(JSON.stringify(basicEChartProps));

      props.chartData.seriesID1 = { data: [] };
      expect(emptyChartData(props)).toEqual(false);
    });

    describe("when chart type is pie chart", () => {
      const pieChartProps = JSON.parse(JSON.stringify(defaultProps));

      pieChartProps.chartType = "PIE_CHART";

      it("returns true if first series data is empty", () => {
        const props = JSON.parse(JSON.stringify(pieChartProps));

        props.chartData = { seriesID1: { data: [] } };

        expect(emptyChartData(props)).toEqual(true);
      });

      it("returns true if first series data is empty but second series data is present", () => {
        const props = JSON.parse(JSON.stringify(pieChartProps));

        props.chartData.seriesID1 = { data: [] };
        props.chartData.seriesID2 = { data: { x: "x1", y: 2 } };

        expect(emptyChartData(props)).toEqual(true);
      });
    });
  });

  describe("when chart type is custom fusion charts", () => {
    const customFusionChartProps = JSON.parse(JSON.stringify(defaultProps));

    customFusionChartProps.chartType = "CUSTOM_FUSION_CHART";

    it("returns true if customFusionChartConfig property is empty", () => {
      const props = JSON.parse(JSON.stringify(customFusionChartProps));

      props.customFusionChartConfig = {};

      expect(emptyChartData(props)).toEqual(true);
    });

    it("returns false if customFusionChartConfig property is not empty", () => {
      const props = JSON.parse(JSON.stringify(customFusionChartProps));

      props.chartType = "CUSTOM_FUSION_CHART";
      props.customFusionChartConfig = { key: "value" };

      expect(emptyChartData(props)).toEqual(false);
    });
  });

  describe("when chart type is custom echarts", () => {
    const customEChartsProps = JSON.parse(JSON.stringify(defaultProps));

    customEChartsProps.chartType = "CUSTOM_ECHART";

    it("returns true if customEChartConfig property is empty", () => {
      const props = JSON.parse(JSON.stringify(customEChartsProps));

      props.customEChartConfig = {};

      expect(emptyChartData(props)).toEqual(true);
    });

    it("returns false if customEChartConfig property is not empty", () => {
      const props = JSON.parse(JSON.stringify(customEChartsProps));

      props.customEChartConfig = { key: "value" };

      expect(emptyChartData(props)).toEqual(false);
    });
  });

  describe("Widget Callouts", () => {
    it("returns custom fusion chart deprecation notice when chart type is custom fusion chart", () => {
      const props = JSON.parse(JSON.stringify(defaultProps));

      props.chartType = "CUSTOM_FUSION_CHART";

      const { getEditorCallouts } = ChartWidget.getMethods();

      const messages = getEditorCallouts(props);

      expect(messages.length).toEqual(1);

      const deprecationMessage = messages[0];

      expect(deprecationMessage.message).toEqual(
        "Custom Fusion Charts will stop being supported on March 1st 2024. Change the chart type to E-charts Custom to switch.",
      );
      expect(deprecationMessage.links).toEqual([
        {
          text: "Learn more",
          url: "https://www.appsmith.com/blog/deprecating-fusion-charts",
        },
      ]);
    });

    it("returns no callouts when chart type isn't custom fusion charts", () => {
      let props = JSON.parse(JSON.stringify(defaultProps));

      props.chartType = "LINE_CHART";

      const { getEditorCallouts } = ChartWidget.getMethods();

      let messages = getEditorCallouts(props);

      expect(messages.length).toEqual(0);

      props = JSON.parse(JSON.stringify(defaultProps));
      props.chartType = "CUSTOM_ECHART";

      messages = getEditorCallouts(props);
      expect(messages.length).toEqual(0);
    });
  });
});
