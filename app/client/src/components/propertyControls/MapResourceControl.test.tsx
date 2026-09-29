import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ApplicationMapsApi from "api/ApplicationMapsApi";
import MapResourceControl from "./MapResourceControl";
import i18n from "i18n";

jest.mock("api/ApplicationMapsApi");
jest.mock("store", () => ({ getState: () => ({}) }));
jest.mock("selectors/editorSelectors", () => ({
  getCurrentApplicationId: () => "app-1",
}));

const api = ApplicationMapsApi as jest.Mocked<typeof ApplicationMapsApi>;

function renderControl(widgetProperties: Record<string, string>) {
  const onBatchUpdateProperties = jest.fn();

  render(
    <MapResourceControl
      {...({
        propertyName: "mapSource",
        propertyValue: widgetProperties.mapSource,
        widgetProperties,
        onBatchUpdateProperties,
      } as unknown as React.ComponentProps<typeof MapResourceControl>)}
    />,
  );

  return onBatchUpdateProperties;
}

beforeEach(() => jest.clearAllMocks());

beforeAll(async () => {
  await i18n.changeLanguage("en-US");
});

it("retains a custom resource ID while the catalog is loading", () => {
  api.list.mockImplementation(async () => new Promise(() => undefined));
  renderControl({
    mapSource: "custom",
    customMapResourceId: "saved-1",
    mapType: "CHINA_PROVINCES",
  });
  expect(screen.getByRole("combobox")).toHaveValue("application:saved-1");
});

it("selects an uploaded resource by immutable ID", async () => {
  api.list.mockResolvedValue([
    { id: "resource-1", name: "Campus", regionCount: 2 },
  ]);
  const onChange = renderControl({
    mapSource: "builtin",
    customMapResourceId: "",
    mapType: "CHINA_PROVINCES",
  });

  await screen.findByRole("option", { name: "Campus" });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "application:resource-1" },
  });
  expect(onChange).toHaveBeenCalledWith({
    mapSource: "custom",
    customMapResourceId: "resource-1",
  });
});

it("keeps the built-in map selection when the catalog loads", async () => {
  api.list.mockResolvedValue([]);
  renderControl({
    mapSource: "builtin",
    customMapResourceId: "",
    mapType: "CHINA_330000",
  });
  await waitFor(() => expect(api.list).toHaveBeenCalled());
  expect(screen.getByRole("combobox")).toHaveValue("builtin:CHINA_330000");
});

it("restores the nationwide sample data when selecting that built-in map", async () => {
  api.list.mockResolvedValue([]);
  const onChange = renderControl({
    mapSource: "custom",
    customMapResourceId: "resource-1",
    mapType: "CHINA_330000",
  });

  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "builtin:CHINA_PROVINCES" },
  });
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      mapSource: "builtin",
      mapType: "CHINA_PROVINCES",
      data: expect.any(Array),
    }),
  );
});

it("shows a recoverable error when a saved custom resource is missing", async () => {
  api.list.mockResolvedValue([]);
  renderControl({
    mapSource: "custom",
    customMapResourceId: "missing-1",
    mapType: "CHINA_PROVINCES",
  });
  await screen.findByRole("alert");
  expect(screen.getByRole("combobox")).toHaveValue("application:missing-1");
});
