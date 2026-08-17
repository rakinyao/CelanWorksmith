import React from "react";
import type { ControlProps } from "./BaseControl";
import BaseControl from "./BaseControl";
import type { ControlType } from "constants/PropertyControlConstants";
import FormControl from "pages/Editor/FormControl";
import FormLabel from "components/editorComponents/FormLabel";
import styled from "styled-components";
import { connect } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { change, getFormValues } from "redux-form";
import { get } from "lodash";
import { getBindingOrConfigPathsForPaginationControl } from "entities/Action/actionProperties";
import { PaginationSubComponent } from "components/formControls/utils";
import {
  MATCH_ACTION_CONFIG_PROPERTY,
  matchExact,
} from "workers/Evaluation/formEval";

export const StyledFormLabel = styled(FormLabel)`
  margin-top: 5px;
  font-size: 12px;
  color: var(--ads-v2-color-fg-muted);
  line-height: 12px;
`;

export const FormControlContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const PaginationContainer = styled.div`
  display: grid;
  column-gap: var(--ads-v2-spaces-4);
  row-gap: var(--ads-v2-spaces-2);
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
`;

// using query dynamic input text for both so user can dynamically change these values.
// TODO: Fix this the next time the file is edited
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const valueFieldConfig: any = {
  key: "value",
  controlType: "QUERY_DYNAMIC_INPUT_TEXT",
  placeholderText: "value",
};

// TODO: Fix this the next time the file is edited
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const limitFieldConfig: any = {
  ...valueFieldConfig,
  placeholderText: "20",
};

// TODO: Fix this the next time the file is edited
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const offsetFieldConfig: any = {
  ...valueFieldConfig,
  placeholderText: "0",
};

export function Pagination(props: {
  label: string;
  isValid: boolean;
  validationMessage?: string;
  placeholder?: Record<string, string>;
  tooltip?: Record<string, string>;
  isRequired?: boolean;
  name: string;
  disabled?: boolean;
  // TODO: Fix this the next time the file is edited
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customStyles?: any;
  configProperty: string;
  formName: string;
  initialValue?: PaginationInitialValue;
}) {
  const {
    configProperty,
    customStyles,
    formName,
    initialValue,
    name,
    placeholder,
    tooltip,
  } = props;

  const offsetPath = getBindingOrConfigPathsForPaginationControl(
    PaginationSubComponent.Offset,
    configProperty,
  );
  const limitPath = getBindingOrConfigPathsForPaginationControl(
    PaginationSubComponent.Limit,
    configProperty,
  );

  const defaultStyles = {
    ...customStyles,
  };

  return (
    <PaginationContainer data-testid={name}>
      {/*  form control for Limit field */}
      <FormControlContainer>
        <FormControl
          config={{
            ...limitFieldConfig,
            label: "Pagination Limit",
            defaultStyles,
            configProperty: limitPath,
            placeholderText:
              typeof placeholder === "object" ? placeholder.limit : "",
            tooltipText: typeof tooltip === "object" ? tooltip.limit : "",
            initialValue:
              typeof initialValue === "object" ? initialValue.limit : null,
          }}
          formName={formName}
        />
        <StyledFormLabel>Limits the number of rows returned.</StyledFormLabel>
      </FormControlContainer>
      {/*  form control for Offset field */}
      <FormControlContainer>
        <FormControl
          config={{
            ...offsetFieldConfig,
            label: "Pagination Offset",
            defaultStyles,
            configProperty: offsetPath,
            placeholderText:
              typeof placeholder === "object" ? placeholder.offset : "",
            tooltipText: typeof tooltip === "object" ? tooltip.offset : "",
            initialValue:
              typeof initialValue === "object" ? initialValue.offset : null,
          }}
          formName={formName}
        />
        <StyledFormLabel>
          No. of rows to be skipped before querying
        </StyledFormLabel>
      </FormControlContainer>
    </PaginationContainer>
  );
}

export interface PaginationInitialValue {
  offset: number;
  limit: number;
}

interface PaginationDependencyResetArgs {
  dependencyCondition?: string;
  formValues: object | undefined;
  prevFormValues: object | undefined;
  resetOnDependencyChange?: boolean;
}

export function shouldResetPagination({
  dependencyCondition,
  formValues,
  prevFormValues,
  resetOnDependencyChange,
}: PaginationDependencyResetArgs): boolean {
  if (
    !resetOnDependencyChange ||
    typeof dependencyCondition !== "string"
  ) {
    return false;
  }

  return matchExact(MATCH_ACTION_CONFIG_PROPERTY, dependencyCondition).some(
    (dependencyPath) =>
      get(prevFormValues, dependencyPath) !== get(formValues, dependencyPath),
  );
}

export function getPaginationResetValue(
  initialValue?: PaginationInitialValue,
): PaginationInitialValue | undefined {
  if (
    !initialValue ||
    typeof initialValue.offset !== "number" ||
    typeof initialValue.limit !== "number"
  ) {
    return undefined;
  }

  return { offset: initialValue.offset, limit: initialValue.limit };
}

interface ReduxDispatchProps {
  updateConfigPropertyValue: (
    formName: string,
    field: string,
    value: unknown,
  ) => void;
}

type PaginationControlComponentProps = PaginationControlProps &
  ReduxDispatchProps & {
    formValues: object | undefined;
  };

class PaginationControl extends BaseControl<PaginationControlComponentProps> {
  componentDidUpdate(prevProps: PaginationControlComponentProps) {
    const resetValue = getPaginationResetValue(
      this.props.initialValue as PaginationInitialValue | undefined,
    );

    if (
      resetValue &&
      shouldResetPagination({
        dependencyCondition: this.props.conditionals?.enable,
        formValues: this.props.formValues,
        prevFormValues: prevProps.formValues,
        resetOnDependencyChange: this.props.resetOnDependencyChange,
      })
    ) {
      this.props.updateConfigPropertyValue(
        this.props.formName,
        this.props.configProperty,
        resetValue,
      );
    }
  }

  render() {
    const {
      configProperty, // JSON path for the pagination data
      disabled,
      formName, // Name of the form, used by redux-form lib to store the data in redux store
      isValid,
      label,
      initialValue,
      placeholderText,
      tooltipText,
      validationMessage,
    } = this.props;

    return (
      // pagination component
      <Pagination
        configProperty={configProperty}
        disabled={disabled}
        formName={formName}
        isValid={isValid}
        label={label}
        name={configProperty}
        initialValue={initialValue as PaginationInitialValue | undefined}
        placeholder={placeholderText}
        tooltip={tooltipText}
        validationMessage={validationMessage}
      />
    );
  }

  getControlType(): ControlType {
    return "PAGINATION";
  }
}

export interface PaginationControlProps extends ControlProps {
  placeholderText: Record<string, string>;
  tooltipText: Record<string, string>;
  disabled?: boolean;
}

const mapStateToProps = (
  state: DefaultRootState,
  ownProps: PaginationControlProps,
) => ({
  formValues: getFormValues(ownProps.formName)(state),
});

const mapDispatchToProps = (dispatch: (action: unknown) => void) => ({
  updateConfigPropertyValue: (formName: string, field: string, value: unknown) =>
    dispatch(change(formName, field, value)),
});

export default connect(mapStateToProps, mapDispatchToProps)(PaginationControl);
