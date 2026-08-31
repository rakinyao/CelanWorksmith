import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { screen } from "@testing-library/react";
import { render } from "test/testUtils";
import { changeLocale } from "i18n";
import { TEMP_DATASOURCE_ID } from "constants/Datasource";
import {
  SAVE_AND_AUTHORIZE_BUTTON_TEXT,
  SAVE_BUTTON_TEXT,
} from "ee/constants/messages";
import SaveOrDiscardDatasourceModal from "./SaveOrDiscardDatasourceModal";

describe("SaveOrDiscardDatasourceModal translations", () => {
  afterEach(async () => {
    await changeLocale("zh-CN");
  });

  it("updates the standard Save action after the open modal locale changes", async () => {
    await changeLocale("zh-CN");
    const props = {
      datasourceId: TEMP_DATASOURCE_ID,
      datasourcePermissions: [],
      isOpen: true,
      onClose: jest.fn(),
      onDiscard: jest.fn(),
      onSave: jest.fn(),
      saveButtonText: SAVE_BUTTON_TEXT,
    };

    render(<SaveOrDiscardDatasourceModal {...props} />);

    expect(
      screen.getByText(
        "如果退出此页面，未保存的更改将丢失。请在退出前保存更改。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "不保存" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();

    await changeLocale("en-US");

    expect(
      screen.getByText(
        "Unsaved changes will be lost if you exit this page. Save the changes before exiting.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Don't save" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("updates the Save & Authorize action after the open modal locale changes", async () => {
    await changeLocale("zh-CN");
    const props = {
      datasourceId: TEMP_DATASOURCE_ID,
      datasourcePermissions: [],
      isOpen: true,
      onClose: jest.fn(),
      onDiscard: jest.fn(),
      onSave: jest.fn(),
      saveButtonText: SAVE_AND_AUTHORIZE_BUTTON_TEXT,
    };

    render(<SaveOrDiscardDatasourceModal {...props} />);

    expect(
      screen.getByRole("button", { name: "保存并授权" }),
    ).toBeInTheDocument();

    await changeLocale("en-US");

    expect(
      screen.getByRole("button", { name: "Save & Authorize" }),
    ).toBeInTheDocument();
  });
});
