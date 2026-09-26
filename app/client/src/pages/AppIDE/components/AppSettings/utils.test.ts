import { getUrlPreview } from "./utils";
import urlBuilder from "ee/entities/URLRedirect/URLAssembly";
import { ApplicationVersion } from "ee/actions/applicationActions";

describe("getUrlPreview", () => {
  const pageId = "0123456789abcdef01234567";

  beforeEach(() => {
    urlBuilder.resetURLParams();
    urlBuilder.updateURLParams(
      {
        applicationSlug: "ontdemo1-2-0",
        applicationVersion: ApplicationVersion.SLUG_URL,
      },
      [{ basePageId: pageId, pageSlug: "" }],
    );
  });

  afterEach(() => urlBuilder.resetURLParams());

  it.each(["合同管理", "订单管理"])(
    "previews a Chinese name %s with a page fallback",
    (name) => {
      const preview = getUrlPreview(pageId, name, "Home", "ontdemo1-2-0");

      expect(preview.relativePath).toBe(`/app/ontdemo1-2-0/page-${pageId}`);
      expect(preview.splitRelativePath[1]).toBe("page");
      expect(
        Array.isArray(preview.splitRelativePath) &&
          preview.splitRelativePath.join(""),
      ).toBe(preview.relativePath);
    },
  );

  it("preserves an existing custom slug when the Chinese name changes", () => {
    urlBuilder.updateURLParams(null, [
      { basePageId: pageId, pageSlug: "", customSlug: "orders" },
    ]);
    expect(
      getUrlPreview(
        pageId,
        "合同管理",
        "订单管理",
        "ontdemo1-2-0",
        "orders",
        "orders",
      ).relativePath,
    ).toBe(`/app/orders-${pageId}`);
  });
});
