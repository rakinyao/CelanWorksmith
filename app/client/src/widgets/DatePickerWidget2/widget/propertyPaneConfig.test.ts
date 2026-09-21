// eslint-disable-next-line
// @ts-nocheck
import i18n from "i18n";
import DatePickerWidget from "./";

const findProperty = (sections, propertyName) =>
  sections
    .flatMap((section) => section.children ?? [])
    .find((property) => property.propertyName === propertyName);

test("localizes DatePicker property copy without changing event identifiers", async () => {
  const previousLanguage = i18n.language;

  try {
    await i18n.changeLanguage("zh-CN");
    const content = DatePickerWidget.getPropertyPaneContentConfig();

    expect(content[0].sectionName).toBe("数据");
    expect(findProperty(content, "dateFormat")?.label).toBe("日期格式");
    expect(findProperty(content, "onDateSelected")?.label).toBe(
      "onDateSelected",
    );
  } finally {
    await i18n.changeLanguage(previousLanguage);
  }
});
