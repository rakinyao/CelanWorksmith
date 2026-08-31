import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "test/testUtils";
import { i18n } from "i18n";
import SearchBox from "./SearchBox";
import ResultsNotFound from "./ResultsNotFound";
import { SEARCH_CATEGORY_ID } from "./utils";

jest.mock("@appsmith/ads", () => {
  const actual = jest.requireActual("@appsmith/ads");

  return {
    ...actual,
    Icon: () => <span />,
    Button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  };
});

jest.mock("ee/utils/airgapHelpers", () => ({
  ...jest.requireActual("ee/utils/airgapHelpers"),
  isAirgapped: () => true,
}));

describe("Global search localization", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en-US");
  });

  const category = { id: SEARCH_CATEGORY_ID.NAVIGATION, title: "Navigate" };

  it.each([
    ["en-US", "Search widgets and queries", "No results found"],
    ["zh-CN", "搜索组件和查询", "未找到结果"],
  ])("renders search chrome in %s", async (locale, placeholder, noResults) => {
    await i18n.changeLanguage(locale);
    render(
      <>
        <SearchBox
          category={category}
          query=""
          setCategory={jest.fn()}
          setQuery={jest.fn()}
        />
        <ResultsNotFound />
      </>,
    );

    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
    expect(screen.getByText(noResults)).toBeInTheDocument();
  });
});
