import { hasPageNameSlugConflict } from "./PageSettings";
import { getUsedActionNames } from "selectors/actionSelectors";
import { isNameValid } from "utils/helpers";

describe("existing page name validation", () => {
  it("distinguishes different Chinese names from a real duplicate", () => {
    const usedNames = getUsedActionNames.resultFunc(
      ["订单管理"],
      {},
      undefined,
      [],
    );

    expect(isNameValid("合同管理", usedNames)).toBe(true);
    expect(isNameValid("订单管理", usedNames)).toBe(false);
  });
});

describe("hasPageNameSlugConflict", () => {
  const pages = [
    { pageId: "current", slug: "home", uniqueSlug: "" },
    { pageId: "other", slug: "orders", uniqueSlug: "" },
    { pageId: "chinese", slug: "", uniqueSlug: "" },
  ];

  it("does not treat a name with no URL-safe characters as a slug conflict", () => {
    expect(hasPageNameSlugConflict("合同管理", pages, "current")).toBe(false);
  });

  it("ignores the current page's slug", () => {
    expect(hasPageNameSlugConflict("home", pages, "current")).toBe(false);
  });

  it("prefers a non-empty uniqueSlug and falls back for blank uniqueSlug", () => {
    const staticPages = [
      { pageId: "other", slug: "orders", uniqueSlug: "order-list" },
    ];

    expect(hasPageNameSlugConflict("order list", staticPages, "current")).toBe(
      true,
    );
    expect(hasPageNameSlugConflict("orders", staticPages, "current")).toBe(
      false,
    );
    expect(
      hasPageNameSlugConflict(
        "orders",
        [{ ...staticPages[0], uniqueSlug: " " }],
        "current",
      ),
    ).toBe(true);
  });

  it("detects a matching URL-safe slug on another page", () => {
    expect(hasPageNameSlugConflict("订单", pages, "current")).toBe(false);
    expect(hasPageNameSlugConflict("orders", pages, "current")).toBe(true);
  });
});
