import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { screen } from "@testing-library/react";
import { render } from "test/testUtils";
import { changeLocale } from "i18n";
import { BlankState } from "./BlankState";

jest.mock("selectors/editorSelectors", () => ({
  ...jest.requireActual("selectors/editorSelectors"),
  getPagePermissions: () => [],
}));

jest.mock("utils/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => false,
}));

jest.mock("ee/utils/BusinessFeatures/permissionPageHelpers", () => ({
  ...jest.requireActual("ee/utils/BusinessFeatures/permissionPageHelpers"),
  getHasCreateActionPermission: () => true,
}));

jest.mock("../JSAdd", () => ({
  useJSAdd: () => ({ openAddJS: jest.fn() }),
}));

describe("JS blank state translations", () => {
  afterEach(async () => {
    await changeLocale("zh-CN");
  });

  it("updates button and description after a locale change", async () => {
    await changeLocale("zh-CN");
    render(<BlankState />);

    expect(
      screen.getByText("使用 JS 转换数据或编写业务逻辑"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "新建 JS 对象" }),
    ).toBeInTheDocument();

    await changeLocale("en-US");

    expect(
      screen.getByText("Use JS to transform your data or write business logic"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New JS object" }),
    ).toBeInTheDocument();
  });
});
