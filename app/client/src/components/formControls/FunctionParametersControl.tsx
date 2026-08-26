import React from "react";
import { Input } from "@appsmith/ads";
import { connect } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { change, formValueSelector } from "redux-form";
import type { ControlProps } from "./BaseControl";
import { getDynamicFetchedValues } from "selectors/formSelectors";

export interface FunctionParameterMetadata {
  value: string;
  label: string;
  dataType?: string;
  required?: boolean;
  readOnly?: boolean;
  derived?: boolean;
}

export interface FunctionParametersControlProps extends ControlProps {
  metadata?: FunctionParameterMetadata[];
  parameterValues?: Record<string, unknown>;
  onParametersChange: (parameters: Record<string, unknown>) => void;
}

function getMetadata(data: unknown): FunctionParameterMetadata[] {
  if (Array.isArray(data)) {
    return data as FunctionParameterMetadata[];
  }

  if (
    data !== null &&
    typeof data === "object" &&
    Array.isArray((data as { content?: unknown }).content)
  ) {
    return (data as { content: FunctionParameterMetadata[] }).content;
  }

  return [];
}

function getParameterValues(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function FunctionParametersControl({
  configProperty,
  metadata = [],
  onParametersChange,
  parameterValues = {},
}: FunctionParametersControlProps) {
  return (
    <div className={`t--${configProperty} uqi-function-parameters`}>
      {metadata
        .filter(
          (parameter) =>
            parameter.value && !parameter.readOnly && !parameter.derived,
        )
        .map((parameter) => {
          const label = parameter.dataType
            ? `${parameter.label} (${parameter.dataType})`
            : parameter.label;
          const value = parameterValues[parameter.value];

          return (
            <Input
              isRequired={parameter.required}
              key={parameter.value}
              label={label}
              name={`${configProperty}.${parameter.value}`}
              onChange={(nextValue) => {
                const nextParameters = {
                  ...parameterValues,
                  [parameter.value]: nextValue,
                };

                onParametersChange(nextParameters);
              }}
              size="md"
              value={typeof value === "string" ? value : ""}
            />
          );
        })}
    </div>
  );
}

const mapStateToProps = (
  state: DefaultRootState,
  props: FunctionParametersControlProps,
) => {
  const valueSelector = formValueSelector(props.formName);
  const dynamicValues = getDynamicFetchedValues(state, props);

  return {
    metadata: getMetadata(dynamicValues.data),
    parameterValues: getParameterValues(
      valueSelector(state, props.configProperty),
    ),
  };
};

const mapDispatchToProps = (
  dispatch: (action: unknown) => void,
  props: FunctionParametersControlProps,
) => ({
  onParametersChange: (parameters: Record<string, unknown>) =>
    dispatch(change(props.formName, props.configProperty, parameters)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(FunctionParametersControl);
