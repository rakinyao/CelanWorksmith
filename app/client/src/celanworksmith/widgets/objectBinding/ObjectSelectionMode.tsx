import React from "react";
import ObjectSetBinding from "./ObjectSetBinding";
import { getObjectSetOptions, type ObjectSetOption } from "./objectSetUtils";

interface ObjectSelectionModeProps {
  children: (
    options: ObjectSetOption[],
    isLoading: boolean,
  ) => React.ReactElement;
  displayPropertyId?: string;
  objectTypeId?: string;
  valuePropertyId?: string;
  widgetId: string;
  widgetType: string;
}

export default function ObjectSelectionMode({
  children,
  displayPropertyId,
  objectTypeId,
  valuePropertyId,
  widgetId,
  widgetType,
}: ObjectSelectionModeProps) {
  return (
    <ObjectSetBinding
      objectTypeId={objectTypeId}
      widgetId={widgetId}
      widgetType={widgetType}
    >
      {(binding) => {
        if (binding.status === "typeMismatch") {
          return <div role="alert">The Object binding is incompatible.</div>;
        }

        if (binding.status === "permissionDenied") {
          return <div role="alert">Access to object data is denied.</div>;
        }

        if (binding.status === "error") {
          return (
            <div role="alert">
              {binding.error?.message || "Unable to load objects."}
            </div>
          );
        }

        if (binding.status === "empty") return <div>No objects found.</div>;

        if (!binding.result) return <div>Loading objects...</div>;

        const optionResult = getObjectSetOptions(
          binding.result,
          displayPropertyId,
          valuePropertyId,
        );

        if (optionResult.state === "typeMismatch") {
          return <div role="alert">The Object binding is incompatible.</div>;
        }

        return children(optionResult.options, binding.status === "loading");
      }}
    </ObjectSetBinding>
  );
}
