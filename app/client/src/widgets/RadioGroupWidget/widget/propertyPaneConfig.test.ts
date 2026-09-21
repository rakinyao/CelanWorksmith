import _ from "lodash";
import i18n from "i18n";
import { LabelPosition } from "components/constants";
import RadioGroupWidget from "./index";

function findProperty(
  config: ReturnType<typeof RadioGroupWidget.getPropertyPaneContentConfig>,
  propertyName: string,
) {
  return config
    .flatMap((section) => section.children)
    .find((property) => property.propertyName === propertyName);
}

describe("unit test case for property config pane", () => {
  it("case: check the value returned by defaultOptionValue", () => {
    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dsv = findProperty(
      RadioGroupWidget.getPropertyPaneContentConfig(),
      "defaultOptionValue",
    );

    const dsvValidationFunc = dsv.validation.params.fn;

    expect(dsvValidationFunc(1, {}, _)).toEqual({ isValid: true, parsed: 1 });
    expect(dsvValidationFunc("1", {}, _)).toEqual({
      isValid: true,
      parsed: "1",
    });
  });

  it("localizes display fields while preserving technical values and events", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const content = RadioGroupWidget.getPropertyPaneContentConfig();
      const style = RadioGroupWidget.getPropertyPaneStyleConfig();
      const options = findProperty(content, "options");
      const defaultOptionValue = findProperty(content, "defaultOptionValue");
      const labelPosition = findProperty(content, "labelPosition");
      const event = findProperty(content, "onSelectionChange");
      const accentColor = style
        .flatMap((section) => section.children)
        .find((property) => property.propertyName === "accentColor");

      expect(content[0].sectionName).toBe("数据");
      expect(options?.label).toBe("选项");
      expect(defaultOptionValue?.label).toBe("默认选中值");
      expect(labelPosition?.label).toBe("位置");
      expect(
        labelPosition?.options?.find(
          (option) => option.value === LabelPosition.Auto,
        )?.label,
      ).toBe("自动");
      expect(options?.propertyName).toBe("options");
      expect(RadioGroupWidget.getDefaults().defaultOptionValue).toBe("Y");
      expect(event?.label).toBe("onSelectionChange");
      expect(style[0].sectionName).toBe("标签样式");
      expect(accentColor?.label).toBe("强调色");

      await i18n.changeLanguage("en-US");
      expect(
        RadioGroupWidget.getPropertyPaneContentConfig()[0].sectionName,
      ).toBe("Data");
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });
});
