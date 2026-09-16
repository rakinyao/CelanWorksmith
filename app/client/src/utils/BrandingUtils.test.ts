import {
  CELANWORKSHOP_BRAND_FAVICON_URL,
  CELANWORKSHOP_BRAND_LOGO_URL,
  CELANWORKSHOP_BRAND_PRIMARY_COLOR,
} from "utils/BrandingUtils";

describe("CelanWorkshop default branding", () => {
  it("uses the local CelanWorkshop brand defaults", () => {
    expect(CELANWORKSHOP_BRAND_PRIMARY_COLOR).toBe("#0E7490");
    expect(CELANWORKSHOP_BRAND_FAVICON_URL).toBe(
      "/static/img/celanworkshop-favicon.ico",
    );
    expect(CELANWORKSHOP_BRAND_LOGO_URL).toBe(
      "/static/img/celanworkshop-logo.png",
    );
  });
});
