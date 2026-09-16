import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { useSelector } from "react-redux";
import { getOrganizationConfig } from "ee/selectors/organizationSelectors";
import { AppsmithLink } from "./AppsmithLink";

jest.mock("react-redux", () => ({
  useSelector: jest.fn(),
}));

const mockedUseSelector = useSelector as jest.Mock;

const renderLink = () =>
  render(
    <BrowserRouter>
      <AppsmithLink />
    </BrowserRouter>,
  );

describe("AppsmithLink", () => {
  beforeEach(() => {
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === getOrganizationConfig) {
        return { brandFaviconUrl: undefined, brandLogoUrl: undefined };
      }

      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the CelanWorkshop mark by default", () => {
    renderLink();

    expect(
      screen.getByRole("img", { name: "CelanWorkshop logo" }),
    ).toBeVisible();
  });

  it("keeps a custom organization favicon URL", () => {
    const customFaviconUrl = "https://example.com/custom-favicon.png";

    mockedUseSelector.mockImplementation((selector) => {
      if (selector === getOrganizationConfig) {
        return { brandFaviconUrl: customFaviconUrl, brandLogoUrl: undefined };
      }

      return undefined;
    });

    renderLink();

    expect(screen.getByRole("img")).toHaveAttribute("src", customFaviconUrl);
  });

  it("falls back to the CelanWorkshop mark for the legacy default favicon", () => {
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === getOrganizationConfig) {
        return {
          brandFaviconUrl:
            "https://assets.appsmith.com/" +
            ["appsmith", "favicon", "orange"].join("-") +
            ".ico",
          brandLogoUrl: undefined,
        };
      }

      return undefined;
    });

    renderLink();

    expect(screen.getByRole("img")).not.toHaveAttribute(
      "src",
      expect.stringContaining("assets.appsmith.com"),
    );
  });
});
