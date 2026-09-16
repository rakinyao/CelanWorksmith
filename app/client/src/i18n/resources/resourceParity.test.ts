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

  it("keeps widget property resources in parity and translates Chinese copy", () => {
    expect(flattenKeys(enUS.widgetProperty).sort()).toEqual(
      flattenKeys(zhCN.widgetProperty).sort(),
    );
    expect(i18n.t("widgetProperty.table.tableData", { lng: "zh-CN" })).toBe(
      "表格数据",
    );
    expect(i18n.t("widgetProperty.select.options", { lng: "zh-CN" })).toBe(
      "选项",
    );
    expect(i18n.t("widgetProperty.input.dataType", { lng: "zh-CN" })).toBe(
      "数据类型",
    );
    expect(i18n.t("widgetProperty.button.label", { lng: "zh-CN" })).toBe(
      "按钮文本",
    );
    expect(flattenKeys(enUS.widgetProperty.table.labels).length).toBe(47);
    expect(flattenKeys(enUS.widgetProperty.select.labels).length).toBe(17);
    expect(flattenKeys(enUS.widgetProperty.multiSelect.labels).length).toBe(21);
    expect(flattenKeys(enUS.widgetProperty.input.labels).length).toBe(37);
    expect(flattenKeys(enUS.widgetProperty.button.labels).length).toBe(27);
    const requiredTableLabels = [
      "columnControl",
      "columnType",
      "plainText",
      "url",
      "image",
      "video",
      "date",
      "button",
      "menuButton",
      "iconButton",
      "displayText",
      "computedValue",
      "compact",
      "originalDateFormat",
      "textAlign",
      "textSize",
      "fontStyle",
      "verticalAlignment",
      "cellBackground",
      "buttonProperties",
      "iconAlignment",
      "iconColor",
      "menuColor",
      "menuVariant",
      "primaryKeyColumn",
      "defaultSearchText",
      "defaultSelectedRow",
      "defaultRowHeight",
      "short",
      "tall",
      "serverSidePagination",
      "totalRecordCount",
      "sortable",
      "enableMultiRowSelection",
      "enableClientSideSearch",
      "headerOptions",
      "search",
      "filters",
      "download",
      "pagination",
      "csvSeparator",
      "visible",
      "disabled",
      "label",
      "displayDateFormat",
      "cellBackgroundColor",
      "headerRowColor",
    ];
    const tableLabels = flattenKeys(enUS.widgetProperty.table.labels);

    for (const key of requiredTableLabels) expect(tableLabels).toContain(key);
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
