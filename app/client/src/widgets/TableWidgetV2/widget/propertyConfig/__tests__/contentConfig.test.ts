import i18n from "i18n";
import { getTableV2ContentConfig } from "../contentConfig";
import { getTableV2StyleConfig } from "../styleConfig";
import type { TableWidgetProps } from "../../../constants";
import { ColumnTypes } from "../../../constants";
import type { PropertyPaneSectionConfig } from "constants/PropertyControlConstants";

const getContentConfig = () => getTableV2ContentConfig();

interface TestConfig {
  sectionName?: string;
  propertyName?: string;
  label?: string;
  helpText?: string;
  children?: TestConfig[];
  panelConfig?: { contentChildren?: TestConfig[] };
  options?: Array<{ label?: string; value?: unknown }>;
}

beforeEach(async () => {
  await i18n.changeLanguage("en-US");
});

afterEach(async () => {
  await i18n.changeLanguage("en-US");
});

describe("TableWidgetV2 contentConfig tests", () => {
  it("exposes the native table data and column controls", () => {
    const contentConfig = getContentConfig();
    const dataSection = contentConfig.find(
      (section) =>
        (section as PropertyPaneSectionConfig).sectionName === "Data",
    ) as PropertyPaneSectionConfig;

    expect(dataSection).toBeDefined();
    expect(dataSection.children?.map((child) => child.propertyName)).toEqual(
      expect.arrayContaining(["tableData", "primaryColumns"]),
    );
    expect(
      contentConfig.some(
        (section) =>
          (section as PropertyPaneSectionConfig).sectionName ===
          "CelanWorksmith Object data",
      ),
    ).toBe(false);
  });

  it("keeps the native Data section expanded by default", () => {
    const contentConfig = getContentConfig();
    const dataSection = contentConfig.find(
      (section) =>
        (section as PropertyPaneSectionConfig).sectionName === "Data",
    ) as PropertyPaneSectionConfig;

    expect(dataSection.expandedByDefault).toBe(true);
  });

  it("should disable relevant sections when infinite scroll is enabled", () => {
    const contentConfig = getContentConfig();
    const sectionsToCheck = ["Search & filters", "Sorting", "Adding a row"];

    const disabledHelpText =
      "This feature is disabled because infinite scroll is enabled";

    sectionsToCheck.forEach((sectionName) => {
      const section = contentConfig.find(
        (section) =>
          (section as PropertyPaneSectionConfig).sectionName === sectionName,
      ) as PropertyPaneSectionConfig & { dependencies: string[] };

      expect(section).toBeDefined();

      if (section) {
        expect(typeof section.shouldDisableSection).toBe("function");
        expect(section.disabledHelpText).toBe(disabledHelpText);
        expect(section.dependencies).toContain("infiniteScrollEnabled");

        const enabledProps = {
          infiniteScrollEnabled: true,
        } as TableWidgetProps;
        const disabledProps = {
          infiniteScrollEnabled: false,
        } as TableWidgetProps;

        expect(section.shouldDisableSection!(enabledProps, "")).toBe(true);
        expect(section.shouldDisableSection!(disabledProps, "")).toBe(false);
      }
    });

    const paginationSection = contentConfig.find(
      (section) =>
        (section as PropertyPaneSectionConfig).sectionName === "Pagination",
    ) as PropertyPaneSectionConfig;

    expect(paginationSection).toBeDefined();

    if (paginationSection && paginationSection.children) {
      const serverSidePagination = paginationSection.children.find(
        (child) =>
          (child as PropertyPaneSectionConfig & { propertyName: string })
            .propertyName === "serverSidePaginationEnabled",
      ) as PropertyPaneSectionConfig & {
        propertyName: string;
        shouldDisableSection: (
          props: TableWidgetProps,
          propertyPath: string,
        ) => boolean;
        disabledHelpText: string;
        dependencies: string[];
      };

      expect(serverSidePagination).toBeDefined();

      if (serverSidePagination) {
        expect(typeof serverSidePagination.shouldDisableSection).toBe(
          "function",
        );
        expect(serverSidePagination.disabledHelpText).toBe(disabledHelpText);
        expect(serverSidePagination.dependencies).toContain(
          "infiniteScrollEnabled",
        );

        const enabledProps = {
          infiniteScrollEnabled: true,
        } as TableWidgetProps;
        const disabledProps = {
          infiniteScrollEnabled: false,
        } as TableWidgetProps;

        expect(
          serverSidePagination.shouldDisableSection(enabledProps, ""),
        ).toBe(true);
        expect(
          serverSidePagination.shouldDisableSection(disabledProps, ""),
        ).toBe(false);
      }
    }
  });

  it("should have proper update hooks for infiniteScrollEnabled property", () => {
    const contentConfig = getContentConfig();
    const paginationSection = contentConfig.find(
      (section) =>
        (section as PropertyPaneSectionConfig).sectionName === "Pagination",
    ) as PropertyPaneSectionConfig;

    expect(paginationSection).toBeDefined();

    if (paginationSection && paginationSection.children) {
      const infiniteScrollProperty = paginationSection.children.find(
        (child) =>
          (child as PropertyPaneSectionConfig & { propertyName: string })
            .propertyName === "infiniteScrollEnabled",
      ) as PropertyPaneSectionConfig & {
        propertyName: string;
        updateHook: unknown;
        dependencies: string[];
      };

      expect(infiniteScrollProperty).toBeDefined();

      if (infiniteScrollProperty) {
        expect(infiniteScrollProperty.updateHook).toBeDefined();
        expect(infiniteScrollProperty.dependencies).toContain("primaryColumns");
      }
    }
  });

  it("resolves top-level display fields from the current locale", async () => {
    await i18n.changeLanguage("zh-CN");
    const content = getContentConfig();
    const data = content.find((section) => section.sectionName === "数据");

    expect(
      data?.children?.find((child) => child.propertyName === "tableData")
        ?.label,
    ).toBe("表格数据");
    expect(
      content
        .flatMap((section) => section.children ?? [])
        .find((child) => child.propertyName === "onPageChange")?.label,
    ).toBe("onPageChange");

    const primaryColumn = data?.children?.find(
      (child) => child.propertyName === "primaryColumnId",
    );

    expect(primaryColumn?.label).toBe("主键列");
    expect(primaryColumn?.helpText).toBe(
      "分配唯一列，以根据值维护 selectedRows 和 triggeredRows",
    );
  });

  it("resolves column content and event copy from the current locale", async () => {
    await i18n.changeLanguage("zh-CN");
    const content = getContentConfig();
    const data = content.find((section) => section.sectionName === "数据");
    const primaryColumns = data?.children?.find(
      (child) => child.propertyName === "primaryColumns",
    ) as TestConfig;
    const panelConfig = primaryColumns?.panelConfig;
    const columnData = panelConfig?.contentChildren?.find(
      (section) => section.sectionName === "数据",
    );
    const columnType = columnData?.children?.find(
      (child) => child.propertyName === "columnType",
    );
    const plainText = columnType?.options?.find(
      (option) => option.value === ColumnTypes.TEXT,
    );
    const events = panelConfig?.contentChildren?.find(
      (section) => section.sectionName === "事件",
    );
    const onClick = events?.children?.find(
      (child) => child.propertyName === "onClick",
    );

    expect(columnData?.sectionName).toBe("数据");
    expect(columnType?.label).toBe("列类型");
    expect(plainText?.label).toBe("纯文本");
    expect(plainText?.value).toBe(ColumnTypes.TEXT);
    expect(onClick?.label).toBe("onClick");
    expect(onClick?.helpText).toBe("用户点击图片时");
  });

  it("resolves style section names from the current locale", async () => {
    await i18n.changeLanguage("zh-CN");

    expect(
      getTableV2StyleConfig().some(
        (section) => section.sectionName === "文本格式",
      ),
    ).toBe(true);
  });
});
