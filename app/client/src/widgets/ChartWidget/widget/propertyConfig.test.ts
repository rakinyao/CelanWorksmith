/* eslint-disable @typescript-eslint/no-namespace */
import { isString } from "lodash";

import { styleConfig, contentConfig } from "./propertyConfig";
import type { PropertyPaneControlConfig } from "constants/PropertyControlConstants";
import i18n from "i18n";

const config = [...contentConfig(), ...styleConfig];

declare global {
  namespace jest {
    interface Matchers<R> {
      toBePropertyPaneConfig(): R;
    }
  }
}
const validateControl = (control: Record<string, unknown>) => {
  if (typeof control !== "object") return false;

  const properties = [
    "propertyName",
    "controlType",
    "isBindProperty",
    "isTriggerProperty",
  ];

  properties.forEach((prop: string) => {
    if (!control.hasOwnProperty(prop)) {
      return false;
    }

    const value = control[prop];

    if (isString(value) && value.length === 0) return false;
  });

  return true;
};

const validateSection = (section: Record<string, unknown>) => {
  if (typeof section !== "object") return false;

  if (!section.hasOwnProperty("sectionName")) return false;

  const name = section.sectionName;

  if ((name as string).length === 0) return false;

  if (section.children) {
    return (section.children as Array<Record<string, unknown>>).forEach(
      (child) => {
        if (!validateControl(child)) return false;
      },
    );
  }

  return true;
};

expect.extend({
  toBePropertyPaneConfig(received) {
    if (Array.isArray(received)) {
      let pass = true;

      received.forEach((section) => {
        if (!validateSection(section) && !validateControl(section))
          pass = false;
      });

      return {
        pass,
        message: () => "Expected value to be a property pane config internal",
      };
    }

    return {
      pass: false,
      message: () => "Expected value to be a property pane config external",
    };
  },
});

it("Validates Chart Widget's property config", () => {
  expect(config).toBePropertyPaneConfig();
});

describe("Validate Chart Widget's data property config", () => {
  const propertyConfigs: PropertyPaneControlConfig[] = config
    .map((sectionConfig) => sectionConfig.children)
    .flat();

  it("offers the stacked chart types in the selector and allowed values", () => {
    const chartType = propertyConfigs.find(
      (propertyConfig) => propertyConfig.propertyName === "chartType",
    );
    const stackedTypes = [
      "STACKED_COLUMN_CHART",
      "STACKED_BAR_CHART",
      "STACKED_AREA_CHART",
    ];

    stackedTypes.forEach((type) => {
      expect(
        chartType?.options?.map((option: { value: string }) => option.value),
      ).toContain(type);
      expect(chartType?.validation?.params?.allowedValues).toContain(type);
    });
  });

  it("offers scatter in the selector and allowed values", () => {
    const chartType = propertyConfigs.find(
      (propertyConfig) => propertyConfig.propertyName === "chartType",
    );

    expect(
      chartType?.options?.map((option: { value: string }) => option.value),
    ).toContain("SCATTER_CHART");
    expect(chartType?.validation?.params?.allowedValues).toContain(
      "SCATTER_CHART",
    );
  });

  it("uses Chinese labels for the existing chart types", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const chartType = (
        contentConfig()[0].children as PropertyPaneControlConfig[]
      ).find((propertyConfig) => propertyConfig.propertyName === "chartType");
      const labels = Object.fromEntries(
        (chartType?.options ?? []).map(
          (option: { label: string; value: string }) => [
            option.value,
            option.label,
          ],
        ),
      );

      expect(labels).toMatchObject({
        LINE_CHART: "折线图",
        BAR_CHART: "条形图",
        PIE_CHART: "饼图",
        COLUMN_CHART: "柱状图",
        AREA_CHART: "面积图",
        CUSTOM_ECHART: "自定义 ECharts",
      });
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });

  it("hides deprecated Fusion from new choices but accepts saved charts", () => {
    const chartType = (
      contentConfig()[0].children as PropertyPaneControlConfig[]
    ).find((propertyConfig) => propertyConfig.propertyName === "chartType");

    expect(
      chartType?.options?.map((option: { value: string }) => option.value),
    ).not.toContain("CUSTOM_FUSION_CHART");
    expect(chartType?.validation?.params?.allowedValues).toContain(
      "CUSTOM_FUSION_CHART",
    );
  });

  it("offers a localized combo chart while retaining saved chart compatibility", async () => {
    const previousLanguage = i18n.language;

    try {
      await i18n.changeLanguage("zh-CN");
      const chartType = (
        contentConfig()[0].children as PropertyPaneControlConfig[]
      ).find((propertyConfig) => propertyConfig.propertyName === "chartType");

      expect(chartType?.options).toContainEqual({
        value: "COMBO_CHART",
        label: "组合图",
      });
      expect(chartType?.validation?.params?.allowedValues).toContain(
        "COMBO_CHART",
      );
      expect(chartType?.validation?.params?.allowedValues).toContain(
        "CUSTOM_FUSION_CHART",
      );
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });

  it("Validates visibility of property fields customFusionChartConfig property is visible when chartType is CUSTOM_FUSION_CHART", () => {
    const visibleFields = propertyConfigs.filter((propertyConfig) => {
      return propertyConfig.propertyName == "customFusionChartConfig";
    });

    let hiddenFns = visibleFields.map(
      (config) => config.hidden,
      // TODO: Fix this the next time the file is edited
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as unknown as ((props: any) => boolean)[];

    expect(hiddenFns.length).toEqual(1);

    hiddenFns.forEach((fn) => {
      let result = true;

      result = fn({ chartType: "CUSTOM_FUSION_CHART" });
      expect(result).toBeFalsy();
    });

    const hiddenFields = propertyConfigs.filter((propertyConfig) => {
      return [
        "chartData",
        "allowScroll",
        "showDataPointLabel",
        "xAxisName",
        "yAxisName",
        "customEChartConfig",
        "labelOrientation",
      ].includes(propertyConfig.propertyName);
    });

    hiddenFns = hiddenFields.map((config) => config.hidden) as unknown as ((
      // TODO: Fix this the next time the file is edited
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props: any,
    ) => boolean)[];

    expect(hiddenFns.length).toEqual(7);

    hiddenFns.forEach((fn) => {
      let result = true;

      result = fn({ chartType: "CUSTOM_FUSION_CHART" });
      expect(result).toBeTruthy();
    });
  });

  it("Validates visibility of property fields when chartType is CUSTOM_ECHART", () => {
    const visibleFields = propertyConfigs.filter((propertyConfig) => {
      return propertyConfig.propertyName == "customEChartConfig";
    });

    let hiddenFns = visibleFields.map(
      (config) => config.hidden,
      // TODO: Fix this the next time the file is edited
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as unknown as ((props: any) => boolean)[];

    expect(hiddenFns.length).toEqual(1);

    hiddenFns.forEach((fn) => {
      let result = true;

      result = fn({ chartType: "CUSTOM_ECHART" });
      expect(result).toBeFalsy();
    });

    const hiddenFields = propertyConfigs.filter((propertyConfig) => {
      return [
        "chartData",
        "allowScroll",
        "showDataPointLabel",
        "labelOrientation",
        "setAdaptiveYMin",
        "xAxisName",
        "yAxisName",
        "customFusionChartConfig",
        "title",
      ].includes(propertyConfig.propertyName);
    });

    hiddenFns = hiddenFields.map((config) => config.hidden) as unknown as ((
      // TODO: Fix this the next time the file is edited
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props: any,
    ) => boolean)[];
    expect(hiddenFns.length).toEqual(8);

    hiddenFns.forEach((fn) => {
      let result = true;

      result = fn({ chartType: "CUSTOM_ECHART" });
      expect(result).toBeTruthy();
    });
  });

  it("Validates that axis labelOrientation is visible when chartType are LINE_CHART AREA_CHART COLUMN_CHART", () => {
    const allowedChartsTypes = ["LINE_CHART", "AREA_CHART", "COLUMN_CHART"];

    const axisSection = config.find((c) => c.sectionName === "Axis");
    const labelOrientationProperty = (
      axisSection?.children as unknown as PropertyPaneControlConfig[]
    ).find((p) => p.propertyName === "labelOrientation");

    allowedChartsTypes.forEach((chartType) => {
      const result = labelOrientationProperty?.hidden?.({ chartType }, "");

      expect(result).toBeFalsy();
    });
  });

  it("validates the datasource field is required in customFusionChartConfig", () => {
    const customFusionChartConfig = propertyConfigs.find((propertyConfig) => {
      return propertyConfig.propertyName == "customFusionChartConfig";
    });

    expect(customFusionChartConfig).not.toBeNull();
    const dataSourceValidations =
      customFusionChartConfig?.validation?.params?.allowedKeys?.[1];

    expect(dataSourceValidations?.params?.required).toEqual(true);
    expect(dataSourceValidations?.params?.ignoreCase).not.toBeNull();
    expect(dataSourceValidations?.params?.ignoreCase).toEqual(false);
  });

  it("validates that default value is present for chartData.data property", () => {
    const chartDataConfig = propertyConfigs.filter((propertyConfig) => {
      return propertyConfig.propertyName == "chartData";
    })[0];

    const chartDataConfigChildren: PropertyPaneControlConfig[] =
      (chartDataConfig.children ?? []) as PropertyPaneControlConfig[];
    const chartDataDataConfig = chartDataConfigChildren.filter((config) => {
      return config.propertyName == "data";
    })[0];

    expect(chartDataDataConfig.validation?.params?.default).toEqual([]);
  });

  it("validates that default value is present for customEChartConfig property", () => {
    const customEChartConfig = propertyConfigs.filter((propertyConfig) => {
      return propertyConfig.propertyName == "customEChartConfig";
    })[0];

    expect(customEChartConfig.validation?.params?.default).toEqual({});
  });

  it("validates that default value is present for custom charts property", () => {
    const customFusionChartConfig = propertyConfigs.filter((propertyConfig) => {
      return propertyConfig.propertyName == "customFusionChartConfig";
    })[0];

    expect(customFusionChartConfig.validation?.params?.default).toEqual({});
  });
});
