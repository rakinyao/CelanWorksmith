import * as echarts from "echarts";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import EchartComponent, { type MapChartComponentProps } from ".";

const mapStore = new Map<string, unknown>();
const chart = {
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

    await waitFor(() => expect(chart.on).toHaveBeenCalled());
    const clickHandler = chart.on.mock.calls[0][2] as (event: unknown) => void;

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

    await waitFor(() => expect(chart.on).toHaveBeenCalled());
    const clickHandler = chart.on.mock.calls[0][2] as (event: unknown) => void;

    clickHandler({ data: { name: "100000_JD", value: 1 } });

    expect(onDataPointClick).not.toHaveBeenCalled();
  });
});
