import type { CelanworksmithObjectType } from "api/CelanworksmithAPI";

export type BindingMode = "OBJECT" | "QUERY";

export const OBJECT_BINDING_SOURCES = [
  "ALL",
  "FILTER",
  "INSTANCE",
  "LINKED",
  "PROPERTY",
] as const;

export type ObjectBindingSource = (typeof OBJECT_BINDING_SOURCES)[number];

export interface ObjectBinding {
  objectTypeId?: string;
  source?: ObjectBindingSource | string;
  objectPath?: string;
  objectIdPath?: string;
  filter?: unknown;
  selectedPropertyIds?: string[];
  labelPropertyId?: string;
  groupPropertyId?: string;
  displayPropertyId?: string;
  valuePropertyId?: string;
  aggregationVariableName?: string;
  linkTypeId?: string;
  actionId?: string;
  propertyDataTypes?: Partial<
    Record<ObjectBindingPropertyKey, string | string[]>
  >;
}

export type ObjectBindingPropertyKey =
  | "selectedPropertyIds"
  | "labelPropertyId"
  | "groupPropertyId"
  | "displayPropertyId"
  | "valuePropertyId";

export type ObjectBindingIssueCode =
  | "MISSING_OBJECT_TYPE"
  | "MISSING_PROPERTY"
  | "DELETED_OBJECT_TYPE"
  | "DELETED_PROPERTY"
  | "INVALID_SOURCE"
  | "INCOMPATIBLE_PROPERTY_TYPE"
  | "DELETED_LINK"
  | "DELETED_ACTION"
  | "DELETED_VARIABLE";

export interface ObjectBindingIssue {
  code: ObjectBindingIssueCode;
  objectTypeId?: string;
  propertyId?: string;
  expectedDataTypes?: string[];
  receivedDataType?: string;
  source?: string;
  linkTypeId?: string;
  actionId?: string;
  variableName?: string;
}

export interface ObjectBindingMetadata {
  objectTypes?:
    | readonly CelanworksmithObjectType[]
    | Readonly<Record<string, CelanworksmithObjectType | undefined>>;
  types?: Readonly<
    Record<string, { metadata?: CelanworksmithObjectType | undefined }>
  >;
  links?: readonly { id: string }[];
  actions?: readonly { id: string }[];
  variables?: readonly string[] | Readonly<Record<string, unknown>>;
  dataTree?: Record<string, unknown>;
}

export interface NormalizedObjectBinding {
  mode: BindingMode;
  binding: ObjectBinding;
  issues: ObjectBindingIssue[];
}

export const getObjectBindingModeProperty = (widgetType: string) => {
  switch (widgetType) {
    case "TABLE_WIDGET":
    case "TABLE_WIDGET_V2":
    case "FILTER_LIST_WIDGET":
    case "LIST_WIDGET":
    case "LIST_WIDGET_V2":
    case "SELECT_WIDGET":
    case "DROP_DOWN_WIDGET":
    case "MULTI_SELECT_WIDGET_V2":
    case "CHART_WIDGET":
    case "STATBOX_WIDGET":
    case "PROGRESS_WIDGET":
      return "dataMode";
    case "JSON_FORM_WIDGET":
    case "FORM_WIDGET":
      return "formMode";
    case "OBJECT_DETAIL_WIDGET":
      return "mode";
    default:
      return undefined;
  }
};
