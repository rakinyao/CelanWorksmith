import React from "react";
import ObjectSetBinding from "./ObjectSetBinding";
import ObjectBindingState from "./ObjectBindingState";
import { getObjectSetOptions, type ObjectSetOption } from "./objectSetUtils";

interface ObjectSelectionModeProps {
  children: (
    options: ObjectSetOption[],
    isLoading: boolean,
  ) => React.ReactElement;
  displayPropertyId?: string;
  objectTypeId?: string;
  actionId?: string;
  aggregationVariableName?: string;
  linkTypeId?: string;
  valuePropertyId?: string;
  widgetId: string;
  widgetType: string;
}

export default function ObjectSelectionMode({
  actionId,
  aggregationVariableName,
  children,
  displayPropertyId,
  linkTypeId,
  objectTypeId,
  valuePropertyId,
  widgetId,
  widgetType,
}: ObjectSelectionModeProps) {
  return (
    <ObjectSetBinding
      actionId={actionId}
      aggregationVariableName={aggregationVariableName}
      linkTypeId={linkTypeId}
      objectTypeId={objectTypeId}
      widgetId={widgetId}
      widgetType={widgetType}
    >
      {(binding) => {
        if (binding.status === "typeMismatch") {
          return (
            <ObjectBindingState
              diagnostic={binding.diagnostic?.message}
              status="typeMismatch"
            />
          );
        }

        if (binding.status === "permissionDenied") {
          return <ObjectBindingState status="permissionDenied" />;
        }

        if (binding.status === "error") {
          return (
            <ObjectBindingState
              errorMessage={binding.error?.message}
              status="error"
            />
          );
        }

        if (binding.status === "empty") {
          return <ObjectBindingState status="empty" />;
        }

        if (!binding.result) return <ObjectBindingState status="loading" />;

        const optionResult = getObjectSetOptions(
          binding.result,
          displayPropertyId,
          valuePropertyId,
        );

        if (optionResult.state === "typeMismatch") {
          return <ObjectBindingState status="typeMismatch" />;
        }

        return children(optionResult.options, binding.status === "loading");
      }}
    </ObjectSetBinding>
  );
}
