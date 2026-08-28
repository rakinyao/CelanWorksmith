import i18n from "i18n";
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
});
