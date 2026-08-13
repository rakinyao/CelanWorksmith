import type {
  CelanworksmithObjectSet,
  CelanworksmithObjectType,
} from "api/CelanworksmithAPI";
import type { AllChartData } from "widgets/ChartWidget/constants";
import { validateObjectBinding } from "./objectBindingValidation";
import type { ObjectSetWidgetState } from "./objectSetUtils";
import type { ObjectBinding } from "./types";

export type ObjectChartDataStatus = ObjectSetWidgetState;

export interface ObjectChartDataResult {
  chartData: AllChartData;
  errorMessage?: string;
  status: ObjectChartDataStatus;
}

interface ChartAggregationVariableMeta {
  error?: string;
  status?: ObjectSetWidgetState | "idle";
}

export interface ChartAggregationVariables {
  _meta?: Record<string, ChartAggregationVariableMeta>;
  [name: string]: unknown;
}

const emptyChartDataResult = (status: ObjectChartDataStatus) => ({
  chartData: {},
  status,
});

const CHART_LABEL_DATA_TYPES = ["STRING", "INTEGER", "DECIMAL"];
const CHART_VALUE_DATA_TYPES = ["INTEGER", "DECIMAL"];

const isChartLabel = (value: unknown): value is string | number =>
  typeof value === "string" ||
  (typeof value === "number" && Number.isFinite(value));

const isChartValue = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isChartGroup = (value: unknown): value is string | number =>
  typeof value === "string" ||
  (typeof value === "number" && Number.isFinite(value));

const getAggregationVariableName = (value: string) => {
  const trimmedValue = value.trim();
  const variablePath = trimmedValue.match(
    /^(?:\{\{\s*)?\$variables\.([^\s{}]+?)(?:\s*\}\})?$/,
  );

  return variablePath?.[1] || trimmedValue;
};

const isPermissionError = (error?: string) =>
  Boolean(error?.match(/permission denied|forbidden/i));

export const getAggregationVariableChartData = (
  aggregationVariableName: string,
  variables?: ChartAggregationVariables,
): ObjectChartDataResult => {
  const variableName = getAggregationVariableName(aggregationVariableName);
  const metadata = variables?._meta?.[variableName];

  switch (metadata?.status) {
    case "idle":
    case "loading":
      return emptyChartDataResult("loading");
    case "empty":
      return emptyChartDataResult("empty");
    case "permissionDenied":
      return emptyChartDataResult("permissionDenied");
    case "error":
      return {
        ...emptyChartDataResult(
          isPermissionError(metadata.error) ? "permissionDenied" : "error",
        ),
        errorMessage: metadata.error,
      };
  }

  const value = variables?.[variableName];

  if (!isChartValue(value)) return emptyChartDataResult("typeMismatch");

  return {
    chartData: {
      aggregationVariable: { data: [{ x: variableName, y: value }] },
    },
    status: "ready",
  };
};

export const getObjectSetChartData = (
  result: CelanworksmithObjectSet | undefined,
  binding: Pick<
    ObjectBinding,
    | "groupPropertyId"
    | "labelPropertyId"
    | "objectTypeId"
    | "propertyDataTypes"
    | "valuePropertyId"
  >,
  metadata?: CelanworksmithObjectType,
): ObjectChartDataResult => {
  const chartBinding: ObjectBinding = {
    ...binding,
    propertyDataTypes: {
      ...binding.propertyDataTypes,
      labelPropertyId: CHART_LABEL_DATA_TYPES,
      valuePropertyId: CHART_VALUE_DATA_TYPES,
    },
  };

  if (
    !chartBinding.labelPropertyId ||
    !chartBinding.valuePropertyId ||
    !metadata ||
    validateObjectBinding(chartBinding, { objectTypes: [metadata] }).length
  ) {
    return emptyChartDataResult("typeMismatch");
  }

  if (!result || result.typeId !== chartBinding.objectTypeId) {
    return emptyChartDataResult("typeMismatch");
  }

  if (!result.items.length) return emptyChartDataResult("empty");

  const data = result.items.map((object) => {
    const label = object.properties[chartBinding.labelPropertyId as string];
    const value = object.properties[chartBinding.valuePropertyId as string];
    const group = chartBinding.groupPropertyId
      ? object.properties[chartBinding.groupPropertyId]
      : undefined;

    if (
      !isChartLabel(label) ||
      !isChartValue(value) ||
      (chartBinding.groupPropertyId && !isChartGroup(group))
    ) {
      return undefined;
    }

    return { group, x: label, y: value };
  });

  if (data.some((point) => !point)) {
    return emptyChartDataResult("typeMismatch");
  }

  if (!chartBinding.groupPropertyId) {
    return {
      chartData: {
        objectSet: {
          data: data as Array<{ x: string | number; y: number }>,
        },
      },
      status: "ready",
    };
  }

  const groupedChartData = Object.create(null) as AllChartData;

  (
    data as Array<{
      group: string | number;
      x: string | number;
      y: number;
    }>
  ).forEach(({ group, x, y }) => {
    const seriesName = String(group);
    const series = groupedChartData[seriesName] || {
      data: [],
      seriesName,
    };

    series.data.push({ x, y });
    groupedChartData[seriesName] = series;
  });

  return { chartData: groupedChartData, status: "ready" };
};
