import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BrandingBadge, { DesktopBrandingBadgeContainer } from "./BrandingBadge";
import BrandingBadgeMobile, {
  MobileBrandingBadgeContainer,
} from "./BrandingBadgeMobile";

describe("viewer branding badges", () => {
  it.each([
    ["desktop", BrandingBadge],
    ["mobile", BrandingBadgeMobile],
    ["desktop wrapper", DesktopBrandingBadgeContainer],
    ["mobile wrapper", MobileBrandingBadgeContainer],
  ])("renders the %s CelanWorkshop badge", (_label, Badge) => {
    render(<Badge />);

    expect(
      screen.getByRole("img", { name: "CelanWorkshop logo" }),
    ).toBeVisible();
    expect(screen.getByText("CelanWorkshop")).toBeVisible();
    expect(screen.queryByText("Built on")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      document.querySelector('a[href="https://appsmith.com"]'),
    ).not.toBeInTheDocument();
  });
});
