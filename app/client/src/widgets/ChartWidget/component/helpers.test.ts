import type { ChartType } from "../constants";
import {
  getObjectChartStateMessage,
  parseOnDataPointClickParams,
  parseOnDataPointClickForCustomEChart,
  parseOnDataPointClickForCustomFusionChart,
  isBasicEChart,
  getBasicEChartOptions,
} from "./helpers";
import type { ChartComponentProps } from ".";

describe("isBasicEChart", () => {
  it("recognizes stacked Builder charts but not Custom ECharts", () => {
    expect(isBasicEChart("STACKED_COLUMN_CHART" as ChartType)).toBe(true);
    expect(isBasicEChart("STACKED_BAR_CHART" as ChartType)).toBe(true);
    expect(isBasicEChart("STACKED_AREA_CHART" as ChartType)).toBe(true);
    expect(isBasicEChart("SCATTER_CHART")).toBe(true);
    expect(isBasicEChart("CUSTOM_ECHART")).toBe(false);
  });
});

describe("getBasicEChartOptions", () => {
  const makeProps = (chartType: ChartType) =>
    ({
      chartType,
      chartData: {
        alpha: { seriesName: "Alpha", data: [{ x: 1, y: 2 }] },
        beta: { seriesName: "Beta", data: [{ x: 3, y: 4 }] },
      },
      allowScroll: false,
      showDataPointLabel: true,
      chartName: "Chart",
      customEChartConfig: {},
      customFusionChartConfig: { type: "", dataSource: undefined },
      hasOnDataPointClick: false,
      isVisible: true,
      isLoading: false,
      setAdaptiveYMin: false,
      labelOrientation: "AUTO",
      onDataPointClick: jest.fn(),
      widgetId: "widget",
      xAxisName: "X",
      yAxisName: "Y",
      borderRadius: "1",
      boxShadow: "1",
      primaryColor: "#000",
      fontFamily: "Arial",
      dimensions: { componentWidth: 400, componentHeight: 300 },
      parentColumnSpace: 1,
      parentRowSpace: 1,
      topRow: 0,
      bottomRow: 0,
      leftColumn: 0,
      rightColumn: 0,
    }) as unknown as ChartComponentProps;

  it("uses one coordinate dataset per scatter series", () => {
    expect(getBasicEChartOptions(makeProps("SCATTER_CHART")).dataset).toEqual([
      { source: [[1, 2]] },
      { source: [[3, 4]] },
    ]);
  });

  it("keeps the category-aligned dataset shape for columns", () => {
    expect(getBasicEChartOptions(makeProps("COLUMN_CHART")).dataset).toEqual({
      source: [
        ["Category", "alpha", "beta"],
        ["1", 2, ""],
        ["3", "", 4],
      ],
    });
  });
});

describe("getObjectChartStateMessage", () => {
  it("defines visible states for Object-backed Charts", () => {
    expect(getObjectChartStateMessage("loading")).toBe(
      "Loading object data...",
    );
    expect(getObjectChartStateMessage("empty")).toBe("No objects found.");
    expect(getObjectChartStateMessage("typeMismatch")).toBe(
      "The Object binding is incompatible.",
    );
    expect(getObjectChartStateMessage("error", "Runtime unavailable")).toBe(
      "Runtime unavailable",
    );
  });
});

describe("parseOnDataPointClickParams", () => {
  it("returns appropriate chart selected point from user click data", () => {
    const chartType: ChartType = "CUSTOM_ECHART";
    const event = {
      data: {
        dataKey: "dataValue",
      },
    };
    const parsedEvent = parseOnDataPointClickParams(event, chartType);

    expect(parsedEvent.rawEventData).toEqual(event);
  });
});

describe("parseOnDataPointClickForCustomEChart", () => {
  it("return correct rawEventData", () => {
    const event = {
      data: {
        dataKey: "dataValue",
      },
      seriesName: "seriesName",
    };
    const parsedEvent = parseOnDataPointClickForCustomEChart(event);

    expect(parsedEvent.rawEventData).toEqual(event);
  });

  it("omits mouse event data", () => {
    const event = {
      data: {
        dataKey: "dataValue",
      },
      seriesName: "seriesName",
      event: {
        mouseEventClickX: 1,
        mouseEventClickY: 1,
      },
    };
    const parsedEvent = parseOnDataPointClickForCustomEChart(event);

    expect(Object.keys(parsedEvent.rawEventData ?? [])).toEqual([
      "data",
      "seriesName",
    ]);
  });

  it("returns other properties of selected point as undefined", () => {
    const event = {
      data: {
        dataKey: "dataValue",
      },
      seriesName: "seriesName",
      event: {
        mouseEventClickX: 1,
        mouseEventClickY: 1,
      },
    };
    const parsedEvent = parseOnDataPointClickForCustomEChart(event);

    expect(parsedEvent.x).toBeUndefined();
    expect(parsedEvent.y).toBeUndefined();
    expect(parsedEvent.seriesTitle).toBeUndefined();
    expect(parsedEvent.rawEventData).not.toBeUndefined();
  });
});

describe("parseOnDataPointClickForCustomFusionChart", () => {
  it("includes raw event data", () => {
    const eventData = {
      dataKey: "dataValue",
    };
    const event = {
      data: eventData,
      otherKey: "otherValue",
    };
    const parsedEvent = parseOnDataPointClickForCustomFusionChart(event);

    expect(parsedEvent.rawEventData).toEqual(eventData);
  });

  it("returns x and y with values from appropriate fields", () => {
    const eventData = {
      dataKey: "dataValue",
      categoryLabel: "x value",
      dataValue: "y value",
      datasetName: "series name",
    };
    const event = {
      data: eventData,
      otherKey: "otherValue",
    };
    const parsedEvent = parseOnDataPointClickForCustomFusionChart(event);

    expect(parsedEvent.rawEventData).toEqual(eventData);
    expect(parsedEvent.x).toEqual("x value");
    expect(parsedEvent.y).toEqual("y value");
    expect(parsedEvent.seriesTitle).toEqual("series name");
  });

  it("returns x, y and seriesTitle as undefined if appropriate fields are not present", () => {
    const eventData = {
      dataKey: "dataValue",
    };
    const event = {
      data: eventData,
      otherKey: "otherValue",
    };
    const parsedEvent = parseOnDataPointClickForCustomFusionChart(event);

    expect(parsedEvent.rawEventData).toEqual(eventData);
    expect(parsedEvent.x).toBeUndefined();
    expect(parsedEvent.y).toBeUndefined();
    expect(parsedEvent.seriesTitle).toBeUndefined();
  });
});
