import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { changeLocale } from "i18n";
import DeployButton from "./DeployButton";

jest.mock("selectors/editorSelectors", () => ({
  getCurrentApplicationId: () => "application-id",
  getIsPublishingApplication: () => false,
}));

jest.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
  useDispatch: () => jest.fn(),
}));

jest.mock("ee/selectors/packageSelectors", () => ({
  getIsPackageUpgrading: () => false,
}));

jest.mock("ee/selectors/applicationSelectors", () => ({
  getRedeployApplicationTrigger: () => false,
}));

jest.mock("layoutSystems/anvil/integrations/selectors", () => ({
  getIsAnvilEnabledInCurrentApplication: () => false,
}));

jest.mock("pages/Editor/gitSync/hooks/modHooks", () => ({
  useGitProtectedMode: () => false,
  useGitConnected: () => false,
  useGitModEnabled: () => false,
}));

jest.mock("git/hooks/useArtifactSelector", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("git/hooks", () => ({
  useGitOps: () => ({ toggleOpsModal: jest.fn() }),
}));

jest.mock("pages/AppIDE/components/ApplicationReleasePanel", () => ({
  __esModule: true,
  default: () => null,
}));

describe("Deploy button translations", () => {
  afterEach(async () => {
    await changeLocale("zh-CN");
  });

  it("updates the deploy command after a locale change", async () => {
    await changeLocale("zh-CN");
    const { rerender } = render(<DeployButton />);

    expect(screen.getByRole("button", { name: "发布" })).toBeInTheDocument();

    await changeLocale("en-US");
    rerender(<DeployButton />);

    expect(screen.getByRole("button", { name: "Deploy" })).toBeInTheDocument();
  });
});
