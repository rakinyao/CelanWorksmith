import fs from "fs";
import path from "path";
import ts from "typescript";
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

interface ResourceLeaf {
  path: string;
  value: string;
}

function flattenResourceLeaves(value: unknown, prefix = ""): ResourceLeaf[] {
  if (typeof value === "string") return [{ path: prefix, value }];

  if (value === null || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, child]) =>
    flattenResourceLeaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

function getPropertyName(node: ts.ObjectLiteralElementLike) {
  if (!ts.isPropertyAssignment(node)) return;

  return ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
    ? node.name.text
    : undefined;
}

function getStringLiteral(node: ts.Expression) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined;
}

function getTableV2ConfigFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) return getTableV2ConfigFiles(entryPath);

    return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
  });
}

const presentationFields = new Set([
  "sectionName",
  "label",
  "helpText",
  "helperText",
  "placeholderText",
  "searchPlaceholderText",
]);

const allowedTableV2PresentationExclusions = new Map([
  ["onPageChange", "technical event identifier"],
  ["onPageSizeChange", "technical event identifier"],
  ["onTableFilterUpdate", "technical event identifier"],
  ["onSearchTextChanged", "technical event identifier"],
  ["onRowSelected", "technical event identifier"],
  ["onSort", "technical event identifier"],
  ["onSave", "technical event identifier"],
  ["onDiscard", "technical event identifier"],
  ["onClick", "technical event identifier"],
  ["onSubmit", "technical event identifier"],
  ["onOptionChange", "technical event identifier"],
  ["onChange", "technical event identifier"],
  ["onCheckChange", "technical event identifier"],
  ["onFilterUpdate", "technical event identifier"],
  ["onDateSelected", "technical event identifier"],
  ['[{ "name": "John" }]', "example data"],
  ["{{appsmith.user.name}}", "binding expression example"],
  ["[0]", "example persisted selection"],
  ["{{Query1.data}}", "binding expression example"],
  ["{{currentItem.name}}", "binding expression example"],
  [
    "{{(tableData, columnId, order) => { /* Return sorted table data */ }}}",
    "binding expression example",
  ],
  ["^\\w+@[a-zA-Z_]+?\\.[a-zA-Z]{2,3}$", "regular expression example"],
  ["1", "numeric default example"],
  ["100", "numeric default example"],
  ["#FFFFFF / Gray / rgb(255, 99, 71)", "color-format example"],
]);

function getTableV2PresentationLiterals() {
  const propertyConfigDirectory = path.resolve(
    __dirname,
    "../../widgets/TableWidgetV2/widget/propertyConfig",
  );
  const sourceFiles = [
    path.join(propertyConfigDirectory, "contentConfig.ts"),
    path.join(propertyConfigDirectory, "styleConfig.ts"),
    ...getTableV2ConfigFiles(path.join(propertyConfigDirectory, "PanelConfig")),
  ];
  const literals = new Set<string>();

  for (const sourceFile of sourceFiles) {
    const source = ts.createSourceFile(
      sourceFile,
      fs.readFileSync(sourceFile, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );

    const visit = (node: ts.Node) => {
      if (ts.isPropertyAssignment(node)) {
        const name = getPropertyName(node);
        const value = getStringLiteral(node.initializer);

        if (name && value && presentationFields.has(name)) literals.add(value);
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return [...literals].filter(
    (literal) => !allowedTableV2PresentationExclusions.has(literal),
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
      "标签",
    );
    expect(i18n.t("widgetProperty.button.help.label", { lng: "zh-CN" })).toBe(
      "设置按钮标签",
    );
    expect(
      i18n.t("widgetProperty.button.options.primary", { lng: "zh-CN" }),
    ).toBe("主要");
    expect(
      i18n.t("widgetProperty.button.placeholders.text", { lng: "zh-CN" }),
    ).toBe("提交");
    expect(flattenKeys(enUS.widgetProperty.table.labels).length).toBe(47);
    expect(flattenKeys(enUS.widgetProperty.select.labels).length).toBe(24);
    expect(flattenKeys(enUS.widgetProperty.multiSelect.labels).length).toBe(34);
    expect(flattenKeys(enUS.widgetProperty.input.labels).length).toBe(37);
    expect(flattenKeys(enUS.widgetProperty.button.labels).length).toBe(29);
    const buttonResources = flattenResourceLeaves(enUS.widgetProperty.button);
    const chineseButtonResources = new Map(
      flattenResourceLeaves(zhCN.widgetProperty.button).map((resource) => [
        resource.path,
        resource.value,
      ]),
    );

    for (const resource of buttonResources) {
      const path = `widgetProperty.button.${resource.path}`;

      expect(chineseButtonResources.get(resource.path)).toBeDefined();
      expect(i18n.t(path, { lng: "en-US" })).not.toBe(path);
      expect(i18n.t(path, { lng: "zh-CN" })).not.toBe(path);
    }

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

  it("keeps TableV2 resources in parity and localizes Chinese copy", () => {
    expect(flattenKeys(enUS.widgetProperty.tableV2).sort()).toEqual(
      flattenKeys(zhCN.widgetProperty.tableV2).sort(),
    );
    expect(
      i18n.t("widgetProperty.tableV2.content.data", { lng: "zh-CN" }),
    ).toBe("数据");
    expect(
      i18n.t("widgetProperty.tableV2.column.columnType", { lng: "zh-CN" }),
    ).toBe("列类型");
    expect(
      i18n.t("widgetProperty.tableV2.style.textFormatting", { lng: "zh-CN" }),
    ).toBe("文本格式");

    const englishResources = flattenResourceLeaves(enUS.widgetProperty.tableV2);
    const chineseResources = new Map(
      flattenResourceLeaves(zhCN.widgetProperty.tableV2).map((resource) => [
        resource.path,
        resource.value,
      ]),
    );
    const resourcePathsByEnglishValue = new Map<string, string[]>();

    for (const resource of englishResources) {
      resourcePathsByEnglishValue.set(resource.value, [
        ...(resourcePathsByEnglishValue.get(resource.value) ?? []),
        resource.path,
      ]);
    }

    const unmappedLiterals = getTableV2PresentationLiterals().filter(
      (literal) => !resourcePathsByEnglishValue.has(literal),
    );

    expect(unmappedLiterals).toEqual([]);

    for (const literal of getTableV2PresentationLiterals()) {
      for (const resourcePath of resourcePathsByEnglishValue.get(literal) ??
        []) {
        expect(chineseResources.get(resourcePath)).toBeDefined();
      }
    }

    expect(enUS.widgetProperty.tableV2.menu).not.toHaveProperty("onClick");
    expect(zhCN.widgetProperty.tableV2.menu).not.toHaveProperty("onClick");
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
