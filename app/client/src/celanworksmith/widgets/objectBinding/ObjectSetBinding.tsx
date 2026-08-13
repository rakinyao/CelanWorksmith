import type { CelanworksmithObjectSet } from "api/CelanworksmithAPI";
import {
  celanworksmithObjectQueryRequested,
  type CelanworksmithObjectQueryRequest,
} from "actions/celanworksmithObjectQueryActions";
import { celanworksmithLinkMetadataLoadRequested } from "actions/celanworksmithLinkActions";
import { useEffect, useMemo, type ReactElement } from "react";
import type { DefaultRootState } from "react-redux";
import { useDispatch, useSelector } from "react-redux";
import { getCelanworksmithObjectQuery } from "selectors/celanworksmithObjectQuerySelectors";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import { getCelanworksmithVariableDefinitions } from "selectors/celanworksmithVariableSelectors";
import { getCelanworksmithCurrentApplicationId } from "selectors/celanworksmithApplicationBindingSelectors";
import {
  getCelanworksmithLinkMetadata,
  getCelanworksmithOntologyState,
} from "selectors/celanworksmithSelectors";
import { normalizeObjectBinding } from "./normalizeObjectBinding";
import {
  getObjectBindingDiagnostic,
  type ObjectBindingDiagnostic,
} from "./objectBindingDiagnostics";
import type { ObjectSetWidgetState } from "./objectSetUtils";

export interface ObjectSetBindingValue {
  metadata?: { id: string; properties: Array<{ id: string }> };
  result?: CelanworksmithObjectSet;
  status: ObjectSetWidgetState;
  error?: { message: string };
  diagnostic?: ObjectBindingDiagnostic;
}

interface ObjectSetBindingProps {
  children: (value: ObjectSetBindingValue) => ReactElement;
  filter?: unknown;
  actionId?: string;
  aggregationVariableName?: string;
  linkTypeId?: string;
  objectTypeId?: string;
  widgetId: string;
  widgetType: string;
}

const getErrorState = (error?: { code?: string; message: string }) =>
  error?.code === "PERMISSION_DENIED" || error?.code === "FORBIDDEN"
    ? "permissionDenied"
    : "error";

export default function ObjectSetBinding({
  actionId,
  aggregationVariableName,
  children,
  filter,
  linkTypeId,
  objectTypeId,
  widgetId,
  widgetType,
}: ObjectSetBindingProps) {
  const dispatch = useDispatch();
  const objectsState = useSelector((state: DefaultRootState) =>
    getCelanworksmithObjectsState(state),
  );
  const applicationId = useSelector(getCelanworksmithCurrentApplicationId);
  const ontologyState = useSelector(getCelanworksmithOntologyState);
  const variableDefinitions = useSelector(getCelanworksmithVariableDefinitions);
  const linkMetadata = useSelector((state: DefaultRootState) =>
    objectTypeId
      ? getCelanworksmithLinkMetadata(
          state,
          objectTypeId,
          applicationId || undefined,
        )
      : undefined,
  );
  const normalizedBinding = useMemo(
    () =>
      normalizeObjectBinding(
        widgetType,
        {
          actionId,
          aggregationVariableName,
          dataMode: "OBJECT",
          filter,
          linkTypeId,
          objectTypeId,
        },
        {
          actions:
            ontologyState.status === "ready"
              ? ontologyState.actions
              : undefined,
          links:
            linkMetadata?.status === "ready" ? linkMetadata.links : undefined,
          types: objectsState.types,
          variables: variableDefinitions.map((definition) => definition.name),
        },
      ),
    [
      actionId,
      aggregationVariableName,
      filter,
      linkTypeId,
      objectTypeId,
      objectsState.types,
      ontologyState,
      linkMetadata,
      variableDefinitions,
      widgetType,
    ],
  );
  const typeId = normalizedBinding.binding.objectTypeId;
  const metadata = typeId ? objectsState.types[typeId]?.metadata : undefined;
  const metadataStatus = typeId
    ? objectsState.types[typeId]?.status
    : undefined;
  const request = useMemo<CelanworksmithObjectQueryRequest | undefined>(
    () =>
      typeId && metadata && !normalizedBinding.issues.length
        ? {
            widgetId,
            typeId,
            query: {
              limit: 100,
              offset: 0,
              ...(normalizedBinding.binding.filter
                ? {
                    filter: normalizedBinding.binding.filter as Record<
                      string,
                      unknown
                    >,
                  }
                : {}),
            },
            applicationId: applicationId || undefined,
          }
        : undefined,
    [
      metadata,
      normalizedBinding.binding.filter,
      normalizedBinding.issues.length,
      applicationId,
      typeId,
      widgetId,
    ],
  );
  const queryState = useSelector((state: DefaultRootState) =>
    request ? getCelanworksmithObjectQuery(state, request) : undefined,
  );

  useEffect(
    function requestObjects() {
      if (request) dispatch(celanworksmithObjectQueryRequested(request));
    },
    [dispatch, request],
  );

  useEffect(
    function requestLinkMetadata() {
      if (!objectTypeId || !linkTypeId) return;

      if (!linkMetadata || linkMetadata.status === "idle") {
        dispatch(
          celanworksmithLinkMetadataLoadRequested(
            objectTypeId,
            false,
            applicationId || undefined,
          ),
        );
      }
    },
    [applicationId, dispatch, linkMetadata, linkTypeId, objectTypeId],
  );

  if (!typeId) {
    return children({
      diagnostic: getObjectBindingDiagnostic(normalizedBinding.issues),
      status: "typeMismatch",
    });
  }

  if (!metadata) {
    if (objectsState.status === "error" || metadataStatus === "error") {
      const error =
        objectsState.error ||
        (typeId ? objectsState.types[typeId]?.error : undefined);

      return children({
        error,
        status: getErrorState(error),
      });
    }

    if (objectsState.status === "loading" || metadataStatus === "loading") {
      return children({ status: "loading" });
    }

    return children({
      diagnostic: getObjectBindingDiagnostic(normalizedBinding.issues),
      status: "typeMismatch",
    });
  }

  if (normalizedBinding.issues.length) {
    return children({
      diagnostic: getObjectBindingDiagnostic(normalizedBinding.issues),
      status: "typeMismatch",
    });
  }

  if (!queryState || queryState.status === "idle") {
    return children({ metadata, status: "loading" });
  }

  if (queryState.status === "error") {
    return children({
      error: queryState.error,
      metadata,
      result: queryState.result,
      status: getErrorState(queryState.error),
    });
  }

  if (queryState.result && queryState.result.typeId !== typeId) {
    return children({
      metadata,
      result: queryState.result,
      status: "typeMismatch",
    });
  }

  if (
    queryState.status === "empty" ||
    (queryState.status === "ready" && !queryState.result?.items.length)
  ) {
    return children({ metadata, result: queryState.result, status: "empty" });
  }

  return children({
    metadata,
    result: queryState.result,
    status: queryState.status === "loading" ? "loading" : "ready",
  });
}
