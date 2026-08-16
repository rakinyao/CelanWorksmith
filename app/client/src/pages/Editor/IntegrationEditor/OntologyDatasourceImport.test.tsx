import React from "react";
import { fireEvent, render, screen, waitFor } from "test/testUtils";
import OntologyDatasourceApi from "api/OntologyDatasourceApi";
import OntologyDatasourceImport from "./OntologyDatasourceImport";

jest.mock("api/OntologyDatasourceApi", () => ({
  __esModule: true,
  default: {
    importDatasource: jest.fn(),
  },
}));

describe("OntologyDatasourceImport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("imports the demo project and refreshes the native datasource list", async () => {
    (OntologyDatasourceApi.importDatasource as jest.Mock).mockResolvedValue({
      data: {
        datasourceId: "ontology-datasource-1",
        datasourceName: "Supply Chain Ontology",
        projectVersion: "1.0.0",
      },
    });
    const onImported = jest.fn();

    render(
      <OntologyDatasourceImport
        onImported={onImported}
        workspaceId="workspace-1"
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /Datasource name/ }), {
      target: { value: "Supply Chain Ontology" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import ontology" }));

    await waitFor(() => {
      expect(OntologyDatasourceApi.importDatasource).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        datasourceName: "Supply Chain Ontology",
        projectImportRequest: {
          sourceKind: "DEMO",
          metadata: undefined,
          sourceReleaseId: undefined,
          runtimeProviderId: undefined,
        },
        changeNote: undefined,
      });
    });
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId("t--ontology-datasource-import-success").textContent,
    ).toBe("Imported Supply Chain Ontology version 1.0.0.");
  });

  it("imports a pinned platform release through the native datasource API", async () => {
    (OntologyDatasourceApi.importDatasource as jest.Mock).mockResolvedValue({
      data: {
        datasourceId: "ontology-datasource-2",
        datasourceName: "Released Ontology",
        projectVersion: "2.1.0",
      },
    });

    render(
      <OntologyDatasourceImport
        onImported={jest.fn()}
        workspaceId="workspace-1"
      />,
    );

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Source" }));
    fireEvent.click(screen.getByText("Platform release"));
    fireEvent.change(screen.getByRole("textbox", { name: /Datasource name/ }), {
      target: { value: "Released Ontology" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /Release ID/ }), {
      target: { value: "release-2.1.0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import ontology" }));

    await waitFor(() => {
      expect(OntologyDatasourceApi.importDatasource).toHaveBeenCalledWith({
        workspaceId: "workspace-1",
        datasourceName: "Released Ontology",
        projectImportRequest: {
          sourceKind: "PLATFORM_RELEASE",
          metadata: undefined,
          sourceReleaseId: "release-2.1.0",
          runtimeProviderId: undefined,
        },
        changeNote: undefined,
      });
    });
  });

  it("keeps the datasource list unchanged when import fails", async () => {
    (OntologyDatasourceApi.importDatasource as jest.Mock).mockRejectedValue(
      new Error("Import rejected"),
    );
    const onImported = jest.fn();

    render(
      <OntologyDatasourceImport
        onImported={onImported}
        workspaceId="workspace-1"
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /Datasource name/ }), {
      target: { value: "Rejected Ontology" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import ontology" }));

    await waitFor(() => {
      expect(OntologyDatasourceApi.importDatasource).toHaveBeenCalledTimes(1);
    });

    expect(onImported).not.toHaveBeenCalled();
    expect(screen.queryByTestId("t--ontology-datasource-import-success")).toBe(
      null,
    );
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Import rejected",
    );
  });

  it("renders a structured API error message without object coercion", async () => {
    (OntologyDatasourceApi.importDatasource as jest.Mock).mockRejectedValue({
      message: { message: "Demo import is unavailable" },
    });

    render(
      <OntologyDatasourceImport
        onImported={jest.fn()}
        workspaceId="workspace-1"
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /Datasource name/ }), {
      target: { value: "Demo Ontology" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import ontology" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Demo import is unavailable",
    );
    expect(screen.queryByText("[object Object]")).toBeNull();
  });

  it("redacts sensitive diagnostic key/value pairs while preserving provider errors", async () => {
    (OntologyDatasourceApi.importDatasource as jest.Mock).mockRejectedValue({
      message:
        "Permission denied by Action Server: token=secret-token-123 authorization=Bearer another secret",
    });

    render(
      <OntologyDatasourceImport
        onImported={jest.fn()}
        workspaceId="workspace-1"
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /Datasource name/ }), {
      target: { value: "Demo Ontology" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import ontology" }));

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("Permission denied by Action Server");
    expect(alert.textContent).not.toContain("secret-token-123");
    expect(alert.textContent).not.toContain("another");
    expect(alert.textContent).not.toContain(" secret");
    expect(alert.textContent).not.toContain("[object Object]");
  });

  it("announces the empty and loading import states", async () => {
    let resolveImport: (() => void) | undefined;

    (OntologyDatasourceApi.importDatasource as jest.Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveImport = resolve;
      }),
    );

    render(
      <OntologyDatasourceImport
        onImported={jest.fn()}
        workspaceId="workspace-1"
      />,
    );

    expect(
      screen.getByTestId("t--ontology-datasource-import-empty").textContent,
    ).toContain("No ontology datasource imported yet.");
    fireEvent.change(screen.getByRole("textbox", { name: /Datasource name/ }), {
      target: { value: "Demo Ontology" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import ontology" }));

    expect(screen.getByRole("status").textContent).toContain(
      "Importing ontology datasource...",
    );
    expect(
      screen
        .getByTestId("t--ontology-datasource-import")
        .getAttribute("aria-busy"),
    ).toBe("true");
    resolveImport?.();
  });

  it("requires YAML metadata and a runtime provider for local YAML imports", async () => {
    render(
      <OntologyDatasourceImport
        onImported={jest.fn()}
        workspaceId="workspace-1"
      />,
    );

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Source" }));
    fireEvent.click(screen.getByText("Local YAML"));
    fireEvent.change(screen.getByRole("textbox", { name: /Datasource name/ }), {
      target: { value: "Local Ontology" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import ontology" }));

    expect(screen.getByText("Select a YAML file.")).not.toBeNull();
    expect(screen.getByText("Enter a runtime provider ID.")).not.toBeNull();
  });
});
