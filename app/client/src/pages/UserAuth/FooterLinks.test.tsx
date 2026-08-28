import "@testing-library/jest-dom";
import { act, screen } from "@testing-library/react";
import React from "react";
import { render } from "test/testUtils";
import i18n from "i18n";
import FooterLinks from "./FooterLinks";

describe("FooterLinks", () => {
  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("zh-CN");
    });
  });

  it.each([
    ["en-US", "CelanWorkshop"],
    ["zh-CN", "沧澜工坊"],
  ])("renders the %s brand and policy links", async (locale, brand) => {
    await act(async () => {
      await i18n.changeLanguage(locale);
    });
    render(<FooterLinks />);

    expect(screen.getByText(new RegExp(brand))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy policy|隐私政策/ })).toHaveAttribute(
      "href",
      "/privacy-policy.html",
    );
    expect(screen.getByRole("link", { name: /terms of service|服务条款/ })).toHaveAttribute(
      "href",
      "/terms-and-conditions.html",
    );
  });
});
