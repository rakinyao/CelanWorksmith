import {
  CELANWORKSHOP_BRAND_FAVICON_URL,
  CELANWORKSHOP_BRAND_LOGO_URL,
  CELANWORKSHOP_BRAND_PRIMARY_COLOR,
  createBrandColorsFromPrimaryColor,
} from "utils/BrandingUtils";
import { darkenColor } from "widgets/WidgetUtils";
import { LightModeTheme } from "@appsmith/wds-theming";

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

  it("derives default hover and active colors from the teal seed", () => {
    document.documentElement.style.setProperty(
      "--ads-v2-color-bg-brand-emphasis",
      "#E15615",
    );
    document.documentElement.style.setProperty(
      "--ads-v2-color-bg-brand-emphasis-plus",
      "#C2410C",
    );

    const colors = createBrandColorsFromPrimaryColor(
      CELANWORKSHOP_BRAND_PRIMARY_COLOR,
    );
    const tealTheme = new LightModeTheme(CELANWORKSHOP_BRAND_PRIMARY_COLOR);

    expect(colors.hover).toBe(darkenColor(CELANWORKSHOP_BRAND_PRIMARY_COLOR));
    expect(colors.active).toBe(
      tealTheme.bgAccentActive.toString({ format: "hex" }),
    );
    expect(colors.hover).not.toBe("#E15615");
    expect(colors.active).not.toBe("#C2410C");
  });
});
