// eslint-disable-next-line
// @ts-nocheck
import i18n from "i18n";
import { CheckboxGroupAlignmentTypes } from "components/constants";
import { defaultSelectedValuesValidation } from "./";
import CheckboxGroupWidget from "./";

describe("<CheckboxGroup />", () => {
  test("should return empty parsed array on null options", async () => {
    const result = defaultSelectedValuesValidation("", {
      options: null,
    });

    expect(result).toStrictEqual({ isValid: true, parsed: [] });
  });

  test("should return parsed array on valid single default option as string", async () => {
    const result = defaultSelectedValuesValidation("blue", {
      options: [
        {
          label: "blue",
          value: "blue",
        },
        {
          label: "green",
          value: "green",
        },
      ],
    });

    expect(result).toStrictEqual({ isValid: true, parsed: ["blue"] });
  });

  test("should return parsed array on multiple default options as string ", async () => {
    const result = defaultSelectedValuesValidation("blue,green", {
      options: [
        {
          label: "blue",
          value: "blue",
        },
        {
          label: "green",
          value: "green",
        },
      ],
    });

    expect(result).toStrictEqual({ isValid: true, parsed: ["blue", "green"] });
  });

  test("should return parsed array on multiple default options as array ", async () => {
    const result = defaultSelectedValuesValidation(`["blue"]`, {
      options: [
        {
          label: "blue",
          value: "blue",
        },
        {
          label: "green",
          value: "green",
        },
      ],
    });

    expect(result).toStrictEqual({ isValid: true, parsed: ["blue"] });
  });

  test("should return empty array when default value is not in options", async () => {
    const result = defaultSelectedValuesValidation(`["blue"]`, {
      options: [
        {
          label: "Apple",
          value: "1",
        },
        {
          label: "Orange",
          value: "2",
        },
      ],
    });

    expect(result).toStrictEqual({ isValid: true, parsed: [] });
  });

  test("localizes display fields while preserving technical values and events", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const content = CheckboxGroupWidget.getPropertyPaneContentConfig();
      const style = CheckboxGroupWidget.getPropertyPaneStyleConfig();
      const options = content[0].children.find(
        (property) => property.propertyName === "options",
      );
      const defaultSelectedValues = content[0].children.find(
        (property) => property.propertyName === "defaultSelectedValues",
      );
      const event = content
        .flatMap((section) => section.children)
        .find((property) => property.propertyName === "onSelectionChange");
      const alignment = style
        .flatMap((section) => section.children)
        .find((property) => property.propertyName === "optionAlignment");

      expect(content[0].sectionName).toBe("数据");
      expect(options?.label).toBe("选项");
      expect(defaultSelectedValues?.label).toBe("默认选中值");
      expect(
        alignment?.options?.find(
          (option) => option.value === CheckboxGroupAlignmentTypes.NONE,
        )?.label,
      ).toBe("无");
      expect(style[0].sectionName).toBe("标签样式");
      expect(options?.propertyName).toBe("options");
      expect(defaultSelectedValues?.validation.params.fn).toBe(
        defaultSelectedValuesValidation,
      );
      expect(event?.propertyName).toBe("onSelectionChange");
      expect(event?.label).toBe("onSelectionChange");
      expect(
        alignment?.options?.find(
          (option) => option.value === CheckboxGroupAlignmentTypes.NONE,
        )?.value,
      ).toBe(CheckboxGroupAlignmentTypes.NONE);
      expect(CheckboxGroupWidget.getDefaults().options).toEqual([
        { label: "Blue", value: "BLUE" },
        { label: "Green", value: "GREEN" },
        { label: "Red", value: "RED" },
      ]);

      await i18n.changeLanguage("en-US");
      expect(
        CheckboxGroupWidget.getPropertyPaneContentConfig()[0].sectionName,
      ).toBe("Data");
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
