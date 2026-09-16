import TableWidget from "./index";
import i18n from "i18n";

beforeEach(async () => {
  await i18n.changeLanguage("en-US");
});

afterEach(async () => {
  await i18n.changeLanguage("en-US");
});

describe("unit test case for property config pane", () => {
  it("case: check tooltip text for total record count property exists", () => {
    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generalSection: any = TableWidget.getPropertyPaneConfig().filter(
      // TODO: Fix this the next time the file is edited
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (section: any) => section.sectionName === "General",
    );

    const totalRecordsCount = generalSection[0].children.filter(
      // TODO: Fix this the next time the file is edited
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (child: any) => child.propertyName === "totalRecordsCount",
    )[0];

    expect(totalRecordsCount.helpText).toEqual(
      "It stores the total no. of rows in the table. Helps in calculating the no. of pages that further allows to enable or disable the next/previous control in pagination.",
    );
  });

  it("localizes table display fields but preserves technical event labels", async () => {
    await i18n.changeLanguage("zh-CN");
    const config = TableWidget.getPropertyPaneConfig();
    const general = config.find((section) => section.sectionName === "常规");
    const events = config.find((section) => section.sectionName === "事件");

    expect(
      general?.children.find((child) => child.propertyName === "tableData")
        ?.label,
    ).toBe("表格数据");
    expect(
      events?.children.find((child) => child.propertyName === "onSort")?.label,
    ).toBe("onSort");
  });
});
