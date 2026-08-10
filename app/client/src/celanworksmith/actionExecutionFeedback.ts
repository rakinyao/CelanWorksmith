import type { CelanworksmithExecutionError } from "api/CelanworksmithAPI";

export const getActionExecutionErrorLabel = (
  error?: CelanworksmithExecutionError,
) => {
  switch (error?.code) {
    case "INVALID_ARGUMENT":
      return "Parameter error";
    case "PERMISSION_DENIED":
      return "Permission denied";
    case "BUSINESS_REJECTED":
      return "Action rejected";
    case "DUPLICATE_REQUEST":
      return "Action already running";
    default:
      return "Service error";
  }
};
