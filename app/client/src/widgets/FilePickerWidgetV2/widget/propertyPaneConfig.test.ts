// eslint-disable-next-line
// @ts-nocheck
import i18n from "i18n";
import FilePickerWidget from "./";

const findProperty = (sections, propertyName) =>
  sections
    .flatMap((section) => section.children ?? [])
    .find((property) => property.propertyName === propertyName);

test("localizes FilePicker property copy without changing event identifiers", async () => {
  const previousLanguage = i18n.language;

  try {
    await i18n.changeLanguage("zh-CN");
    const content = FilePickerWidget.getPropertyPaneContentConfig();

    expect(content[0].sectionName).toBe("基础");
    expect(findProperty(content, "allowedFileTypes")?.label).toBe(
      "允许的文件类型",
    );
    expect(findProperty(content, "onFilesSelected")?.label).toBe(
      "onFilesSelected",
    );
  } finally {
    await i18n.changeLanguage(previousLanguage);
  }
});
