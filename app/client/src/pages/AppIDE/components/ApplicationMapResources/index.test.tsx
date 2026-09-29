import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import ApplicationMapsApi from "api/ApplicationMapsApi";
import ApplicationMapResources from ".";
import i18n from "i18n";

jest.mock("api/ApplicationMapsApi");

const mapsApi = ApplicationMapsApi as jest.Mocked<typeof ApplicationMapsApi>;
const validFile = (name: string) =>
  new File(
    [
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { id: "building-a", name: "Building A" },
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
      }),
    ],
    name,
    { type: "application/geo+json" },
  );

beforeEach(() => {
  jest.clearAllMocks();
  mapsApi.list.mockResolvedValue([]);
});

beforeAll(async () => {
  await i18n.changeLanguage("en-US");
});

it("uploads a valid named GeoJSON and displays its region count", async () => {
  mapsApi.create.mockResolvedValue({
    id: "resource-1",
    name: "Campus",
    regionCount: 1,
  });
  render(<ApplicationMapResources applicationId="app-1" />);
  fireEvent.change(screen.getByLabelText("Map name"), {
    target: { value: "Campus" },
  });
  fireEvent.change(screen.getByLabelText("GeoJSON file"), {
    target: { files: [validFile("campus.geojson")] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload map" }));
  await screen.findByText("Campus");
  expect(screen.getByText("1 region")).toBeInTheDocument();
  expect(mapsApi.create).toHaveBeenCalledWith(
    "app-1",
    "Campus",
    expect.any(File),
  );
});

it("rejects invalid GeoJSON before upload", async () => {
  render(<ApplicationMapResources applicationId="app-1" />);
  fireEvent.change(screen.getByLabelText("Map name"), {
    target: { value: "Bad" },
  });
  fireEvent.change(screen.getByLabelText("GeoJSON file"), {
    target: { files: [new File(["not json"], "bad.geojson")] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upload map" }));
  await screen.findByRole("alert");
  expect(mapsApi.create).not.toHaveBeenCalled();
});

it("retains an uploaded resource when another upload is added", async () => {
  mapsApi.create
    .mockResolvedValueOnce({ id: "resource-1", name: "Campus", regionCount: 1 })
    .mockResolvedValueOnce({
      id: "resource-2",
      name: "New campus",
      regionCount: 1,
    });
  render(<ApplicationMapResources applicationId="app-1" />);
  const name = screen.getByLabelText("Map name");
  const file = screen.getByLabelText("GeoJSON file");

  fireEvent.change(name, { target: { value: "Campus" } });
  fireEvent.change(file, { target: { files: [validFile("first.geojson")] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload map" }));
  await screen.findByText("Campus");
  fireEvent.change(name, { target: { value: "New campus" } });
  fireEvent.change(file, { target: { files: [validFile("second.geojson")] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload map" }));
  await screen.findByText("New campus");
  expect(screen.getByText("Campus")).toBeInTheDocument();
});
