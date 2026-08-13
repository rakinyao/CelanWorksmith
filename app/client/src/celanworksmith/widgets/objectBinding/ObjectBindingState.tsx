import React from "react";
import type { ObjectSetWidgetState } from "./objectSetUtils";

type ObjectBindingStateStatus = ObjectSetWidgetState | "typeMismatch";

interface ObjectBindingStateProps {
  diagnostic?: string;
  errorMessage?: string;
  status: ObjectBindingStateStatus;
}

const getMessage = ({
  diagnostic,
  errorMessage,
  status,
}: ObjectBindingStateProps) => {
  switch (status) {
    case "loading":
      return "Loading object data / 正在加载本体数据";
    case "empty":
      return "No objects found / 未找到本体对象";
    case "permissionDenied":
      return "Access to object data is denied / 无权访问本体数据";
    case "error":
      return errorMessage || "Unable to load objects / 无法加载本体对象";
    case "typeMismatch":
      return (
        diagnostic || "The Object binding is incompatible / 本体绑定不兼容"
      );
    default:
      return undefined;
  }
};

export default function ObjectBindingState(props: ObjectBindingStateProps) {
  const message = getMessage(props);

  if (!message) return null;

  return props.status === "loading" ? (
    <div aria-live="polite">{message}</div>
  ) : (
    <div role="alert">{message}</div>
  );
}
