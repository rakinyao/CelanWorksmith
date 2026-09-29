import * as echarts from "echarts";
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import EchartComponent, { type MapChartComponentProps } from ".";
import ApplicationMapsApi from "api/ApplicationMapsApi";

const mapStore = new Map<string, unknown>();
const chart = {
  clear: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  resize: jest.fn(),
  setOption: jest.fn(),
};

const defaultProps: MapChartComponentProps = {
  caption: "中国",
  colorRange: [],
  data: [{ id: "110000", value: 0 }],
  height: 300,
  isVisible: true,
  onDataPointClick: jest.fn(),
  showLabels: true,
  type: "CHINA_PROVINCES",
  width: 400,
};

function renderMap(overrides: Partial<MapChartComponentProps> = {}) {
  return render(<EchartComponent {...defaultProps} {...overrides} />);
}

describe("Map Chart component", () => {
  beforeEach(() => {
    mapStore.clear();
    jest.clearAllMocks();
    jest.spyOn(echarts, "init").mockReturnValue(chart as never);
    jest
      .spyOn(echarts, "getMap")
      .mockImplementation((mapId) => mapStore.get(mapId) as never);
    jest.spyOn(echarts, "registerMap").mockImplementation((mapId, geoJson) => {
      mapStore.set(mapId, { geoJson });
    });
    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                adcode: "110000",
                name: "北京市",
                level: "province",
              },
            },
          ],
        }),
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads the nationwide map from the local static path and renders it", async () => {
    renderMap();

    await waitFor(() => expect(chart.setOption).toHaveBeenCalled());

    expect(global.fetch).toHaveBeenCalledWith(
      "/static/maps/CHINA_PROVINCES.json",
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(echarts.registerMap).toHaveBeenCalledWith(
      "CHINA_PROVINCES",
      expect.objectContaining({ type: "FeatureCollection" }),
      {},
    );
    expect(screen.getByTestId("t--map-chart-container")).toBeTruthy();
  });

  it("sends the existing selectedDataPoint contract for a known click", async () => {
    const onDataPointClick = jest.fn();

    renderMap({ onDataPointClick });

    await waitFor(() => expect(chart.setOption).toHaveBeenCalled());
    const clickHandler = chart.on.mock.calls[
      chart.on.mock.calls.length - 1
    ][2] as (event: unknown) => void;

    clickHandler({ data: { name: "110000", value: 7 } });

    expect(onDataPointClick).toHaveBeenCalledWith({
      value: 7,
      label: "北京市",
      shortLabel: "北京市",
      originalId: "110000",
      id: "110000",
    });
  });

  it("shows a recoverable error and does not fetch for an unavailable province", async () => {
    renderMap({ type: "CHINA_710000" });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Map resource CHINA_710000 is unavailable",
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(chart.setOption).not.toHaveBeenCalled();
  });

  it("ignores an unknown region click without invoking the callback", async () => {
    const onDataPointClick = jest.fn();

    renderMap({ onDataPointClick });

    await waitFor(() => expect(chart.setOption).toHaveBeenCalled());
    const clickHandler = chart.on.mock.calls[
      chart.on.mock.calls.length - 1
    ][2] as (event: unknown) => void;

    clickHandler({ data: { name: "100000_JD", value: 1 } });

    expect(onDataPointClick).not.toHaveBeenCalled();
  });

  it("clears region options on switch and ignores a late prior map response", async () => {
    let finishFirst!: (value: unknown) => void;
    const first = new Promise((resolve) => {
      finishFirst = resolve;
    });

    (global.fetch as jest.Mock).mockImplementationOnce(async () => first);
    const onRegionOptionsChange = jest.fn();
    const view = renderMap({ onRegionOptionsChange });

    view.rerender(
      <EchartComponent
        {...defaultProps}
        onRegionOptionsChange={onRegionOptionsChange}
        type="CHINA_110000"
      />,
    );
    expect(chart.clear).toHaveBeenCalled();
    await waitFor(() =>
      expect(onRegionOptionsChange).toHaveBeenCalledWith(expect.any(Array)),
    );
    await act(async () => {
      finishFirst({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [{ properties: { adcode: "stale", name: "Stale" } }],
        }),
      });
    });
    await waitFor(() => expect(chart.setOption).toHaveBeenCalled());
    expect(onRegionOptionsChange).not.toHaveBeenCalledWith([
      { label: "Stale", value: "stale" },
    ]);
  });

  it("uses exact custom IDs for map data and click metadata", async () => {
    jest.spyOn(ApplicationMapsApi, "get").mockResolvedValue({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "Building-A", name: "North Hall" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        },
      ],
    } as never);
    const onDataPointClick = jest.fn();
    const onRegionOptionsChange = jest.fn();

    renderMap({
      mapSource: "custom",
      customMapResourceId: "resource-1",
      applicationId: "app-1",
      data: [{ id: "Building-A", value: 7 }],
      onDataPointClick,
      onRegionOptionsChange,
    });

    await waitFor(() => expect(chart.setOption).toHaveBeenCalled());
    expect(onRegionOptionsChange).toHaveBeenLastCalledWith([
      { label: "North Hall", value: "Building-A" },
    ]);
    const option = chart.setOption.mock.calls[0][0];

    expect(option.series[0]).toMatchObject({
      map: "application:app-1:resource-1",
      nameProperty: "id",
      data: [{ name: "Building-A", value: 7 }],
    });
    const clickHandler = chart.on.mock.calls[
      chart.on.mock.calls.length - 1
    ][2] as (event: unknown) => void;

    clickHandler({ data: { name: "Building-A", value: 7 } });
    clickHandler({ data: { name: "building-a", value: 3 } });
    expect(onDataPointClick).toHaveBeenCalledTimes(1);
    expect(onDataPointClick).toHaveBeenCalledWith({
      value: 7,
      label: "North Hall",
      shortLabel: "North Hall",
      originalId: "Building-A",
      id: "building-a",
    });
  });
});
