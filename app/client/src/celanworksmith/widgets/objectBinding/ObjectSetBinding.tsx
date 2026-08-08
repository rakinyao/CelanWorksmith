import type { CelanworksmithObjectSet } from "api/CelanworksmithAPI";
import {
  celanworksmithObjectQueryRequested,
  type CelanworksmithObjectQueryRequest,
} from "actions/celanworksmithObjectQueryActions";
import { useEffect, useMemo, type ReactElement } from "react";
import type { DefaultRootState } from "react-redux";
import { useDispatch, useSelector } from "react-redux";
import { getCelanworksmithObjectQuery } from "selectors/celanworksmithObjectQuerySelectors";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import { normalizeObjectBinding } from "./normalizeObjectBinding";
import type { ObjectSetWidgetState } from "./objectSetUtils";

export interface ObjectSetBindingValue {
  metadata?: { id: string; properties: Array<{ id: string }> };
  result?: CelanworksmithObjectSet;
  status: ObjectSetWidgetState;
  error?: { message: string };
}

interface ObjectSetBindingProps {
  children: (value: ObjectSetBindingValue) => ReactElement;
  filter?: unknown;
  objectTypeId?: string;
  widgetId: string;
  widgetType: string;
}

const getErrorState = (error?: { code?: string; message: string }) =>
  error?.code === "PERMISSION_DENIED" || error?.code === "FORBIDDEN"
    ? "permissionDenied"
    : "error";

export default function ObjectSetBinding({
  children,
  filter,
  objectTypeId,
  widgetId,
  widgetType,
}: ObjectSetBindingProps) {
  const dispatch = useDispatch();
  const objectsState = useSelector((state: DefaultRootState) =>
    getCelanworksmithObjectsState(state),
  );
  const normalizedBinding = useMemo(
    () =>
      normalizeObjectBinding(
        widgetType,
        { dataMode: "OBJECT", filter, objectTypeId },
        { types: objectsState.types },
      ),
    [filter, objectTypeId, objectsState.types, widgetType],
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
          }
        : undefined,
    [
      metadata,
      normalizedBinding.binding.filter,
      normalizedBinding.issues.length,
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

  if (!typeId) {
    return children({ status: "typeMismatch" });
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

    return children({ status: "typeMismatch" });
  }

  if (normalizedBinding.issues.length) {
    return children({ status: "typeMismatch" });
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
