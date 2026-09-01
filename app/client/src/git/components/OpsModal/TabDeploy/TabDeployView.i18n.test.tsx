import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen } from "test/testUtils";
import { changeLocale } from "i18n";
import TabDeployView from "./TabDeployView";

jest.mock("./DeployPreview", () => () => null);
jest.mock("git/components/StatusChanges", () => () => null);

describe("TabDeployView translations", () => {
  afterEach(async () => {
    await changeLocale("en-US");
  });

  it("updates the open discard confirmation after a locale switch", async () => {
    await changeLocale("en-US");

    render(<TabDeployView statusIsClean={false} />);

    fireEvent.click(screen.getByTestId("t--git-ops-discard-btn"));
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();

    await changeLocale("zh-CN");

    expect(screen.getByText("确定吗？")).toBeInTheDocument();
  });
});
