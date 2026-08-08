import type { CelanworksmithObjectInstance } from "api/CelanworksmithAPI";
import React from "react";
import ObjectSetBinding from "./ObjectSetBinding";
import { getObjectSetRows } from "./objectSetUtils";

interface ObjectCollectionModeProps {
  objectTypeId?: string;
  onSelect?: (object: CelanworksmithObjectInstance) => void;
  widgetId: string;
  widgetType: string;
}

export default function ObjectCollectionMode({
  objectTypeId,
  onSelect,
  widgetId,
  widgetType,
}: ObjectCollectionModeProps) {
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

        return (
          <div className="t--object-list-mode">
            {getObjectSetRows(binding.result).map((object) => (
              <button
                key={object.id}
                onClick={() => onSelect?.(object)}
                type="button"
              >
                {Object.entries(object.properties).map(
                  ([propertyId, value]) => (
                    <span
                      key={propertyId}
                    >{`${propertyId}: ${String(value)}`}</span>
                  ),
                )}
              </button>
            ))}
          </div>
        );
      }}
    </ObjectSetBinding>
  );
}
