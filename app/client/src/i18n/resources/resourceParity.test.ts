import i18n from "i18n";
import { APPSMITH_DISPLAY_VERSION } from "ee/constants/messages";
import enUS from "./en-US";
import zhCN from "./zh-CN";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale resources", () => {
  it("expose parity for the core platform resource groups", () => {
    const groups = [
      "workspace",
      "application",
      "editor",
      "dialog",
      "toast",
      "search",
      "profile",
    ] as const;

    for (const group of groups) {
      expect(enUS[group]).toBeDefined();
      expect(zhCN[group]).toBeDefined();
      expect(flattenKeys(enUS[group]).sort()).toEqual(
        flattenKeys(zhCN[group]).sort(),
      );
    }
  });

  it("keep the same leaf keys in every locale", () => {
    expect(flattenKeys(enUS).sort()).toEqual(flattenKeys(zhCN).sort());
  });

  it("provide localized brand and ontology entry points", () => {
    expect(i18n.t("brand.name", { lng: "en-US" })).toBe("CelanWorkshop");
    expect(i18n.t("brand.name", { lng: "zh-CN" })).toBe("沧澜工坊");
    expect(i18n.t("ontologyDatasource.heading", { lng: "zh-CN" })).not.toBe(
      "Ontology datasource",
    );
    expect(i18n.t("release.heading", { lng: "zh-CN" })).not.toBe(
      "Application release",
    );
    expect(
      i18n.t("footer.usingProductAgreement", {
        lng: "zh-CN",
        brand: i18n.t("brand.name", { lng: "zh-CN" }),
      }),
    ).toContain("沧澜工坊");
  });

  it("translates every ontology and release leaf in Chinese", () => {
    for (const namespace of ["ontologyDatasource", "release"] as const) {
      const english = flattenKeys(enUS[namespace]);

      for (const key of english) {
        const path = `${namespace}.${key}`;
        const englishValue = i18n.t(path, { lng: "en-US" });
        const chineseValue = i18n.t(path, { lng: "zh-CN" });

        if (
          typeof englishValue === "string" &&
          typeof chineseValue === "string"
        ) {
          expect(chineseValue).not.toBe(englishValue);
        }
      }
    }
  });

  it("localizes the compatibility version formatter", async () => {
    await i18n.changeLanguage("en-US");
    expect(APPSMITH_DISPLAY_VERSION("Community", "v1.0.0")).toBe(
      "CelanWorkshop Community v1.0.0",
    );
    await i18n.changeLanguage("zh-CN");
    expect(APPSMITH_DISPLAY_VERSION("Community", "v1.0.0")).toBe(
      "沧澜工坊 Community v1.0.0",
    );
  });
});
