import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { screen } from "@testing-library/react";
import { render } from "test/testUtils";
import { changeLocale } from "i18n";
import { TEMP_DATASOURCE_ID } from "constants/Datasource";
import SaveOrDiscardDatasourceModal from "./SaveOrDiscardDatasourceModal";

describe("SaveOrDiscardDatasourceModal translations", () => {
  afterEach(async () => {
    await changeLocale("zh-CN");
  });

  it("keeps a caller supplied SaaS save label while translating modal chrome", async () => {
    await changeLocale("zh-CN");
    const props = {
      datasourceId: TEMP_DATASOURCE_ID,
      datasourcePermissions: [],
      isOpen: true,
      onClose: jest.fn(),
      onDiscard: jest.fn(),
      onSave: jest.fn(),
      saveButtonText: "Save & Authorize",
    };

    render(<SaveOrDiscardDatasourceModal {...props} />);

    expect(
      screen.getByText(
        "如果退出此页面，未保存的更改将丢失。请在退出前保存更改。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "不保存" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save & Authorize" }),
    ).toBeInTheDocument();

    await changeLocale("en-US");

    expect(
      screen.getByText(
        "Unsaved changes will be lost if you exit this page. Save the changes before exiting.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Don't save" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save & Authorize" }),
    ).toBeInTheDocument();
  });
});
