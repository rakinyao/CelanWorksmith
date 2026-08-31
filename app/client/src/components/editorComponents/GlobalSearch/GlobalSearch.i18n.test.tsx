import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "test/testUtils";
import { i18n } from "i18n";
import SearchBox from "./SearchBox";
import ResultsNotFound from "./ResultsNotFound";
import GlobalSearchHotKeys from "./GlobalSearchHotKeys";
import { SEARCH_CATEGORY_ID } from "./utils";

const mockUseHotkeys = jest.fn(() => ({
  handleKeyDown: jest.fn(),
  handleKeyUp: jest.fn(),
}));

jest.mock("@blueprintjs/core", () => ({
  ...jest.requireActual("@blueprintjs/core"),
  useHotkeys: (...args: unknown[]) => mockUseHotkeys(...args),
}));

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

  it("updates hotkey labels after switching locale", async () => {
    await i18n.changeLanguage("en-US");
    const { rerender } = render(
      <GlobalSearchHotKeys
        handleDownKey={jest.fn()}
        handleItemLinkClick={jest.fn()}
        handleUpKey={jest.fn()}
        modalOpen
        toggleShow={jest.fn()}
      >
        <span>search</span>
      </GlobalSearchHotKeys>,
    );

    const englishLabels = mockUseHotkeys.mock.calls[
      mockUseHotkeys.mock.calls.length - 1
    ]?.[0] as Array<{
      label: string;
    }>;
    expect(englishLabels.map(({ label }) => label)).toEqual([
      "Move up the list",
      "Move down the list",
      "Navigate",
    ]);

    await i18n.changeLanguage("zh-CN");
    rerender(
      <GlobalSearchHotKeys
        handleDownKey={jest.fn()}
        handleItemLinkClick={jest.fn()}
        handleUpKey={jest.fn()}
        modalOpen
        toggleShow={jest.fn()}
      >
        <span>search</span>
      </GlobalSearchHotKeys>,
    );

    const chineseLabels = mockUseHotkeys.mock.calls[
      mockUseHotkeys.mock.calls.length - 1
    ]?.[0] as Array<{
      label: string;
    }>;
    expect(chineseLabels.map(({ label }) => label)).toEqual([
      "向上移动",
      "向下移动",
      "导航",
    ]);
  });
});
