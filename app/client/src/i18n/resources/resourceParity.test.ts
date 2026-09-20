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
    expect(flattenKeys(enUS.widgetProperty.select.labels).length).toBe(24);
    expect(flattenKeys(enUS.widgetProperty.multiSelect.labels).length).toBe(34);
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

    const requiredTableV2Paths = Object.entries({
      content: [
        "data",
        "tableData",
        "columns",
        "updateMode",
        "pagination",
        "showPagination",
        "serverSidePagination",
        "infiniteScroll",
        "totalRecords",
        "searchAndFilters",
        "allowSearching",
        "clientSideSearch",
        "serverSideFiltering",
        "defaultSearchText",
        "allowFiltering",
        "rowSelection",
        "defaultSelectedRows",
        "defaultSelectedRow",
        "enableMultiRowSelection",
        "sorting",
        "columnSorting",
        "customSortFunctionData",
        "addingRow",
        "allowAddingRow",
        "defaultValues",
        "general",
        "visible",
        "animateLoading",
        "customLoadingState",
        "isLoadingValue",
        "allowDownload",
        "allowColumnFreeze",
        "csvSeparator",
        "sections",
        "dateSettings",
        "firstDayOfWeek",
        "showShortcuts",
        "validations",
        "selection",
      ],
      style: [
        "general",
        "defaultRowHeight",
        "textFormatting",
        "textSize",
        "emphasis",
        "textAlign",
        "verticalAlignment",
        "color",
        "cellBackgroundColor",
        "headerRowColor",
        "headerTextColor",
        "oddRowColor",
        "evenRowColor",
        "accentColor",
        "textColor",
        "borderAndShadow",
        "cellBorders",
        "borderRadius",
        "boxShadow",
        "borderColor",
        "borderWidth",
        "headerOptions",
        "borders",
      ],
      column: [
        "data",
        "style",
        "basic",
        "propertyName",
        "columnType",
        "displayText",
        "computedValue",
        "dateFormat",
        "displayFormat",
        "currency",
        "decimalsAllowed",
        "thousandSeparator",
        "notation",
        "general",
        "visible",
        "disabled",
        "compact",
        "cellWrapping",
        "editable",
        "columnFreeze",
        "alignment",
        "horizontalAlignment",
        "verticalAlignment",
        "textFormatting",
        "textSize",
        "emphasis",
        "textAlign",
        "button",
        "checkbox",
        "html",
        "iconButton",
        "image",
        "menuButton",
        "number",
        "plainText",
        "select",
        "switch",
        "url",
        "video",
        "date",
        "icon",
        "dateSettings",
        "firstDayOfWeek",
        "showShortcuts",
      ],
      validation: [
        "validation",
        "regex",
        "valid",
        "errorMessage",
        "required",
        "minDate",
        "maxDate",
        "min",
        "max",
        "date",
        "number",
      ],
      menu: [
        "basic",
        "general",
        "menuItems",
        "menuItemsSource",
        "sourceData",
        "configure",
        "configureMenuItems",
        "label",
        "text",
        "visible",
        "disabled",
        "icon",
        "position",
        "color",
        "iconColor",
        "backgroundColor",
        "textColor",
        "events",
        "buttonVariant",
        "buttonColor",
        "borderRadius",
        "boxShadow",
        "iconOptions",
        "dateSettings",
        "selectProperties",
        "validations",
      ],
      help: [
        "tableData",
        "columns",
        "updateMode",
        "primaryKeyColumn",
        "showPagination",
        "serverSidePagination",
        "infiniteScroll",
        "totalRecords",
        "onPageChange",
        "onPageSizeChange",
        "allowSearching",
        "clientSideSearch",
        "serverSideFiltering",
        "onTableFilterUpdate",
        "defaultSearchText",
        "onSearchTextChanged",
        "allowFiltering",
        "defaultSelectedRows",
        "defaultSelectedRow",
        "enableMultiRowSelection",
        "onRowSelected",
        "columnSorting",
        "onSort",
        "allowAddingRow",
        "onSave",
        "onDiscard",
        "visible",
        "animateLoading",
        "customLoadingState",
        "allowDownload",
        "allowColumnFreeze",
        "csvSeparator",
        "onClick",
        "onSubmit",
        "onOptionChange",
        "onChange",
        "onCheckChange",
        "onFilterUpdate",
        "onDateSelected",
        "regex",
        "valid",
        "errorMessage",
        "required",
        "minDate",
        "maxDate",
        "min",
        "max",
        "menuLabel",
        "menuVisible",
        "menuDisabled",
        "menuOnClick",
        "menuIcon",
        "menuIconAlignment",
        "menuIconColor",
        "menuBackgroundColor",
        "menuTextColor",
        "propertyName",
        "displayText",
        "computedValue",
        "dateFormat",
        "displayFormat",
        "currency",
        "decimalsAllowed",
        "thousandSeparator",
        "notation",
        "textSize",
        "emphasis",
        "textAlign",
        "verticalAlignment",
        "cellBackground",
        "headerRowColor",
        "headerTextColor",
        "oddRowColor",
        "evenRowColor",
        "buttonColor",
        "buttonVariant",
        "borderRadius",
        "boxShadow",
        "borderColor",
        "borderWidth",
        "menuItems",
        "menuItemsSource",
        "sourceData",
        "configureMenuItems",
        "menuConfigure",
        "menuText",
        "selectOptions",
        "selectSortBy",
        "selectTopRow",
        "selectNewRowOptions",
        "selectPlaceholder",
        "selectFilterable",
        "selectResetFilter",
        "selectServerFiltering",
        "dataSection",
        "paginationSection",
        "searchFiltersSection",
        "rowSelectionSection",
        "sortingSection",
        "addingRowSection",
        "alignmentSection",
        "basicSection",
        "colorSection",
        "dateSettingsSection",
        "discardButtonSection",
        "eventsSection",
        "iconSection",
        "labelSection",
        "saveButtonSection",
        "selectPropertiesSection",
        "validationSection",
        "textFormattingSection",
        "borderShadowSection",
        "primaryKeyColumnLabel",
        "buttonIconLabel",
        "buttonTextLabel",
        "menuItemsSourceLabel",
        "sourceDataLabel",
        "configureLabel",
        "configureMenuItemsLabel",
        "menuItemsLabel",
        "menuTextLabel",
        "menuVisibleLabel",
        "menuDisabledLabel",
        "menuIconLabel",
        "menuPositionLabel",
        "menuTextColorLabel",
        "menuBackgroundColorLabel",
        "menuIconColorLabel",
        "buttonColorLabel",
        "cellBackgroundLabel",
        "saveTextLabel",
        "saveVisibleLabel",
        "saveDisabledLabel",
        "saveButtonColorLabel",
        "saveButtonVariantLabel",
        "saveBorderRadiusLabel",
        "saveIconLabel",
        "savePositionLabel",
        "discardTextLabel",
        "discardVisibleLabel",
        "discardDisabledLabel",
        "discardButtonColorLabel",
        "discardButtonVariantLabel",
        "discardBorderRadiusLabel",
        "discardIconLabel",
        "discardPositionLabel",
        "firstDayOfWeekLabel",
        "showShortcutsLabel",
        "selectOptionsLabel",
        "selectSortByLabel",
        "selectUseTopRowLabel",
        "selectNewRowOptionsLabel",
        "selectPlaceholderLabel",
        "selectFilterableLabel",
        "selectResetFilterLabel",
        "selectServerFilteringLabel",
        "imageSizeLabel",
        "defaultOptionLabel",
        "mediumOptionLabel",
        "largeOptionLabel",
        "saveButtonText",
        "saveButtonClick",
        "saveButtonVisible",
        "saveButtonDisabled",
        "saveButtonColor",
        "saveButtonVariant",
        "saveButtonRadius",
        "saveActionIcon",
        "saveActionPosition",
        "discardButtonText",
        "discardButtonClick",
        "discardButtonVisible",
        "discardButtonDisabled",
        "discardButtonColor",
        "discardButtonVariant",
        "discardButtonRadius",
        "discardActionIcon",
        "discardActionPosition",
        "dateFirstDay",
        "dateShortcuts",
        "buttonIconHelp",
        "buttonTextHelp",
        "menuSourceHelp",
        "menuDataHelp",
        "menuConfigureHelp",
        "menuTextHelp",
        "menuVisibleHelp",
        "menuDisabledHelp",
        "menuIconHelp",
        "menuPositionHelp",
        "menuTextColorHelp",
        "menuBackgroundColorHelp",
        "menuIconColorHelp",
        "buttonColorHelp",
        "cellBackgroundHelp",
        "disabledButtonState",
        "cellWrapping",
        "editable",
        "columnFreeze",
        "menuButtonVariant",
        "imageSize",
        "menuColor",
        "textColor",
      ],
      placeholder: ["menuLabel", "totalRecords", "csvSeparator", "placeholder"],
      option: [
        "singleRow",
        "multiRow",
        "primary",
        "secondary",
        "tertiary",
        "static",
        "dynamic",
        "default",
        "short",
        "tall",
        "noBorders",
        "horizontalBordersOnly",
        "standard",
        "compact",
        "label",
        "value",
        "medium",
        "large",
        "checkbox",
        "currency",
        "html",
        "iconButton",
        "image",
        "menuButton",
        "number",
        "plainText",
        "select",
        "switch",
        "url",
        "video",
        "unixTimestampSeconds",
        "unixTimestampMilliseconds",
        "yyyyMmDd",
        "yyyyMmDdHm",
        "iso8601",
        "yyyyMmDdThhMmSs",
        "yyyyMmDdHhMmSs",
        "doMmmYyyy",
        "ddMmYyyy",
        "ddMmYyyyHm",
        "lll",
        "ll",
        "dMmmmYyyy",
        "hMmADdMmmmYyyy",
        "mmDdYyyy",
        "ddMmYyyyHyphen",
        "mmDdYyyySlash",
        "ddMmYy",
        "mmDdYy",
        "zero",
        "one",
        "two",
      ],
    }).flatMap(([group, keys]) => keys.map((key) => `${group}.${key}`));

    for (const path of requiredTableV2Paths) {
      const key = `widgetProperty.tableV2.${path}`;

      expect(i18n.t(key, { lng: "en-US" })).not.toBe(key);
      expect(i18n.t(key, { lng: "zh-CN" })).not.toBe(key);
    }
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
