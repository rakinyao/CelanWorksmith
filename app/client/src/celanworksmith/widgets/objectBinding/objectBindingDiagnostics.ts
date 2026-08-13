import type { ObjectBindingIssue } from "./types";

export interface ObjectBindingDiagnostic {
  code: ObjectBindingIssue["code"];
  message: string;
  propertyPath: string;
  stableId?: string;
}

const joinTypes = (dataTypes: string[]) =>
  dataTypes.length > 1
    ? `${dataTypes.slice(0, -1).join(", ")} or ${dataTypes.at(-1)}`
    : dataTypes[0] || "a compatible type";

const diagnoseIssue = (issue: ObjectBindingIssue): ObjectBindingDiagnostic => {
  switch (issue.code) {
    case "MISSING_OBJECT_TYPE":
      return {
        code: issue.code,
        message: "Select an ontology Object Type.",
        propertyPath: "objectTypeId",
      };
    case "DELETED_OBJECT_TYPE":
      return {
        code: issue.code,
        message: `Object Type "${issue.objectTypeId}" is missing or unavailable. Select another Object Type.`,
        propertyPath: "objectTypeId",
        stableId: issue.objectTypeId,
      };
    case "MISSING_PROPERTY":
      return {
        code: issue.code,
        message: "Select a Property for this binding.",
        propertyPath: "propertyId",
      };
    case "DELETED_PROPERTY":
      return {
        code: issue.code,
        message: `Property "${issue.objectTypeId}.${issue.propertyId}" is missing. Select another Property.`,
        propertyPath: "propertyId",
        stableId: issue.propertyId,
      };
    case "INVALID_SOURCE":
      return {
        code: issue.code,
        message: `Binding source "${issue.source}" is unsupported. Select a supported source.`,
        propertyPath: "source",
        stableId: issue.source,
      };
    case "INCOMPATIBLE_PROPERTY_TYPE":
      return {
        code: issue.code,
        message: `Property "${issue.objectTypeId}.${issue.propertyId}" has type ${issue.receivedDataType}; expected ${joinTypes(issue.expectedDataTypes || [])}.`,
        propertyPath: "propertyId",
        stableId: issue.propertyId,
      };
    case "DELETED_LINK":
      return {
        code: issue.code,
        message: `Link "${issue.linkTypeId}" is missing. Select another Link.`,
        propertyPath: "linkTypeId",
        stableId: issue.linkTypeId,
      };
    case "DELETED_ACTION":
      return {
        code: issue.code,
        message: `Action "${issue.actionId}" is missing. Select another Action.`,
        propertyPath: "actionId",
        stableId: issue.actionId,
      };
    case "DELETED_VARIABLE":
      return {
        code: issue.code,
        message: `Variable "${issue.variableName}" is missing. Select another Variable.`,
        propertyPath: "aggregationVariableName",
        stableId: issue.variableName,
      };
  }
};

export const getObjectBindingDiagnostic = (
  issueOrIssues: ObjectBindingIssue | ObjectBindingIssue[],
) => {
  const issue = Array.isArray(issueOrIssues) ? issueOrIssues[0] : issueOrIssues;

  return issue ? diagnoseIssue(issue) : undefined;
};
