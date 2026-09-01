import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { screen } from "@testing-library/react";
import { render } from "test/testUtils";
import { changeLocale } from "i18n";
import { EditorEntityTab } from "IDE/Interfaces/EditorTypes";
import SegmentSwitcher from "./SegmentSwitcher";

jest.mock("../../../hooks/useCurrentEditorState", () => ({
  useCurrentEditorState: () => ({ segment: EditorEntityTab.UI }),
}));

jest.mock("./useSegmentNavigation", () => ({
  useSegmentNavigation: () => ({ onSegmentChange: jest.fn() }),
}));

describe("SegmentSwitcher translations", () => {
  afterEach(async () => {
    await changeLocale("zh-CN");
  });

  it("updates visible segment labels when the locale changes", async () => {
    await changeLocale("zh-CN");
    render(<SegmentSwitcher />);

    expect(screen.getByText("查询")).toBeInTheDocument();
    expect(screen.getByText("JS")).toBeInTheDocument();
    expect(screen.getByText("UI")).toBeInTheDocument();

    await changeLocale("en-US");

    expect(screen.getByText("Queries")).toBeInTheDocument();
    expect(screen.getByText("JS")).toBeInTheDocument();
    expect(screen.getByText("UI")).toBeInTheDocument();
  });
});
