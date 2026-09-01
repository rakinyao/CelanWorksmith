import "@testing-library/jest-dom";
import React from "react";
import { act, render, screen } from "test/testUtils";
import { i18n } from "i18n";
import ProfileDropdown from "./ProfileDropdown";

jest.mock("@appsmith/ads", () => {
  const actual = jest.requireActual("@appsmith/ads");

  return {
    ...actual,
    Menu: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    MenuTrigger: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    MenuContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    MenuItem: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { startIcon?: string }) => (
      <div {...props}>{children}</div>
    ),
    MenuSeparator: () => <hr />,
  };
});

jest.mock("i18n/LanguageSwitcher", () => () => (
  <select aria-label="Language" />
));

describe("ProfileDropdown localization", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en-US");
  });

  it("renders account actions in the active locale", async () => {
    await i18n.changeLanguage("zh-CN");
    render(
      <ProfileDropdown
        name="Gavin"
        navColorStyle="light"
        primaryColor="#000"
        userName="gavin@example.com"
      />,
    );

    expect(screen.getByLabelText("账户")).toBeInTheDocument();
    expect(screen.getByText("编辑资料")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();

    await act(async () => {
      await i18n.changeLanguage("en-US");
    });

    expect(screen.getByLabelText("Account")).toBeInTheDocument();
    expect(screen.getByText("Edit profile")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });
});
