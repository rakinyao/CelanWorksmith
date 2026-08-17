import React, { Component, useCallback } from "react";
import FormControl from "pages/Editor/FormControl";
import styled from "styled-components";
import { change, FieldArray, getFormValues } from "redux-form";
import { connect } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { get } from "lodash";
import type { ControlProps } from "./BaseControl";
import { Button } from "@appsmith/ads";
import {
  MATCH_ACTION_CONFIG_PROPERTY,
  matchExact,
} from "workers/Evaluation/formEval";

const CenteredIconButton = styled(Button)<{
  alignSelf?: string;
  top?: string;
}>`
  position: relative;
  align-self: ${(props) => (props.alignSelf ? props.alignSelf : "center")};
  top: ${(props) => (props.top ? props.top : "0px")};
`;

const PrimaryBox = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 10px 0px 0px 0px;

  > div:not(:first-child) .form-config-top {
    display: none;
  }
`;

const SecondaryBox = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: space-between;

  & > div {
    flex: 1;
    margin-right: 8px;
    margin-bottom: 8px;
  }
`;

const AddMoreAction = styled.div`
  cursor: pointer;
  width: max-content;
`;

// TODO: Fix this the next time the file is edited
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NestedComponents(props: any) {
  const addMore = useCallback(() => {
    const { schema = {} } = props;
    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newObject: any = {};

    // TODO: Fix this the next time the file is edited
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema.forEach((s: any) => {
      newObject[s.key] = s.initialValue || "";
    });

    props.fields.push(newObject);
  }, [props.fields]);

  return (
    <PrimaryBox>
      {props.fields &&
        props.fields.length > 0 &&
        props.fields.map((field: string, index: number) => {
          return (
            <SecondaryBox className="array-control-secondary-box" key={index}>
              {/* TODO: Fix this the next time the file is edited */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {props.schema.map((sch: any, idx: number) => {
                sch = {
                  ...sch,
                  configProperty: `${field}.${sch.key}`,
                  customStyles: props.customStyles,
                };

                return (
                  <FormControl
                    config={sch}
                    formName={props.formName}
                    key={idx}
                  />
                );
              })}
              <CenteredIconButton
                alignSelf={"start"}
                data-testid={`t--where-clause-delete-[${index}]`}
                isIconButton
                kind="tertiary"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  props.fields.remove(index);
                }}
                size="md"
                startIcon="close"
                top={index === 0 ? "20px" : ""}
              />
            </SecondaryBox>
          );
        })}
      <AddMoreAction>
        <Button
          className={`t--where-add-condition[${props?.currentNestingLevel}]`}
          kind="tertiary"
          onClick={addMore}
          size="md"
          startIcon="add-more"
        >
          {props.addMoreButtonLabel}
        </Button>
      </AddMoreAction>
    </PrimaryBox>
  );
}

export function shouldResetFieldArray({
  dependencyCondition,
  formValues,
  prevFormValues,
  resetOnDependencyChange,
}: DependencyResetArgs): boolean {
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

interface DependencyResetArgs {
  dependencyCondition?: string;
  formValues: object | undefined;
  prevFormValues: object | undefined;
  resetOnDependencyChange?: boolean;
}

interface ReduxDispatchProps {
  updateConfigPropertyValue: (
    formName: string,
    field: string,
    value: unknown,
  ) => void;
}

type FieldArrayControlComponentProps = FieldArrayControlProps &
  ReduxDispatchProps & {
    formValues: object | undefined;
  };

class FieldArrayControl extends Component<FieldArrayControlComponentProps> {
  componentDidUpdate(prevProps: FieldArrayControlComponentProps) {
    if (
      shouldResetFieldArray({
        dependencyCondition: this.props.conditionals?.enable,
        formValues: this.props.formValues,
        prevFormValues: prevProps.formValues,
        resetOnDependencyChange: this.props.resetOnDependencyChange,
      })
    ) {
      this.props.updateConfigPropertyValue(
        this.props.formName,
        this.props.configProperty,
        [],
      );
    }
  }

  render() {
    const {
      addMoreButtonLabel = "+ Add Condition (And)",
      configProperty,
      customStyles = {},
      formName,
      schema,
    } = this.props;

    return (
      <FieldArray
        component={NestedComponents}
        name={configProperty}
        props={{
          formName,
          schema,
          addMoreButtonLabel,
          configProperty,
          customStyles,
        }}
        rerenderOnEveryChange={false}
      />
    );
  }
}

const mapStateToProps = (
  state: DefaultRootState,
  ownProps: FieldArrayControlProps,
) => ({
  formValues: getFormValues(ownProps.formName)(state),
});

const mapDispatchToProps = (dispatch: (action: unknown) => void) => ({
  updateConfigPropertyValue: (formName: string, field: string, value: unknown) =>
    dispatch(change(formName, field, value)),
});

export default connect(mapStateToProps, mapDispatchToProps)(FieldArrayControl);

export type FieldArrayControlProps = ControlProps;
