import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { screen } from "@testing-library/react";
import { render } from "test/testUtils";
import { changeLocale } from "i18n";
import ListWidgets from "./UIList";

jest.mock("ee/selectors/entitiesSelector", () => ({
  ...jest.requireActual("ee/selectors/entitiesSelector"),
  selectWidgetsForCurrentPage: () => undefined,
}));

jest.mock("selectors/editorSelectors", () => ({
  ...jest.requireActual("selectors/editorSelectors"),
  getPagePermissions: () => [],
}));

jest.mock("utils/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => false,
}));

jest.mock("ee/utils/BusinessFeatures/permissionPageHelpers", () => ({
  ...jest.requireActual("ee/utils/BusinessFeatures/permissionPageHelpers"),
  getHasManagePagePermission: () => true,
}));

jest.mock("../UIEntityListTree", () => ({
  UIEntityListTree: () => null,
}));

describe("UI list blank state translations", () => {
  afterEach(async () => {
    await changeLocale("zh-CN");
  });

  it("updates the blank state after a locale change", async () => {
    await changeLocale("zh-CN");
    const setFocusSearchInput = jest.fn();

    render(<ListWidgets setFocusSearchInput={setFocusSearchInput} />);

    expect(screen.getByText("拖放组件以创建你的应用")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "添加组件" }),
    ).toBeInTheDocument();

    await changeLocale("en-US");

    expect(
      screen.getByText("Drag & drop UI elements to create your app"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add widget" }),
    ).toBeInTheDocument();
  });
});
