import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { Input } from "@appsmith/ads";
import type { CelanworksmithObjectInstance } from "api/CelanworksmithAPI";
import {
  celanworksmithLinkLoadRequested,
  celanworksmithLinkMetadataLoadRequested,
  type CelanworksmithLinkRequest,
} from "actions/celanworksmithLinkActions";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import {
  getCelanworksmithLinkEntry,
  getCelanworksmithLinkMetadata,
} from "selectors/celanworksmithSelectors";
import { getCelanworksmithCurrentApplicationId } from "selectors/celanworksmithApplicationBindingSelectors";
import {
  getObjectIdentity,
  groupObjectProperties,
  normalizeObjectData,
  ObjectDetailDisplayMode,
} from "../widget/objectDetailUtils";
import {
  GroupTitle,
  LinkError,
  LinkDetails,
  LinkedObjectId,
  LinkedObjectButton,
  LinkedObjectSummary,
  LinkTab,
  LinkTabs,
  MetadataNotice,
  ObjectDetailContainer,
  PropertyGroup,
  PropertyLabel,
  PropertyRow,
  PropertyValue,
  StateMessage,
} from "./index.styled";
import {
  filterLinkedObjects,
  getLinkedObjectSummary,
  getObjectTypeLabel,
  isLinkPermissionError,
} from "./objectDetailLinkUtils";

export interface ObjectDetailComponentProps {
  objectData?: unknown;
  objectTypeId?: string;
  displayMode?: ObjectDetailDisplayMode | string;
  widgetId: string;
  updateWidgetMetaProperty: (propertyName: string, value: unknown) => void;
}

const toDisplayValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "-";

  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
};

const clearLinkedSelection = (
  updateWidgetMetaProperty: ObjectDetailComponentProps["updateWidgetMetaProperty"],
) => {
  updateWidgetMetaProperty("selectedLinkedObject", undefined);
  updateWidgetMetaProperty("selectedLinkedObjectId", undefined);
  updateWidgetMetaProperty("selectedLinkType", undefined);
};

const getDisplayMode = (value: string | undefined): ObjectDetailDisplayMode =>
  Object.values(ObjectDetailDisplayMode).includes(
    value as ObjectDetailDisplayMode,
  )
    ? (value as ObjectDetailDisplayMode)
    : ObjectDetailDisplayMode.BUSINESS_ONLY;

export default function ObjectDetailComponent({
  displayMode,
  objectData,
  objectTypeId: configuredObjectTypeId,
  updateWidgetMetaProperty,
}: ObjectDetailComponentProps) {
  const dispatch = useDispatch();
  const updateWidgetMetaPropertyRef = useRef(updateWidgetMetaProperty);
  const object = useMemo(() => normalizeObjectData(objectData), [objectData]);
  const identity = getObjectIdentity(object);
  const hasTypeMismatch =
    !!object &&
    !!configuredObjectTypeId &&
    object.typeId !== configuredObjectTypeId;
  const objectTypeId = hasTypeMismatch ? undefined : object?.typeId;
  const applicationId = useSelector(getCelanworksmithCurrentApplicationId);
  const objectsState = useSelector((state: DefaultRootState) =>
    getCelanworksmithObjectsState(state),
  );
  const metadata = object
    ? objectsState.types[object.typeId]?.metadata
    : undefined;
  const objectId = object?.id;
  const linkMetadata = useSelector((state: DefaultRootState) =>
    objectTypeId
      ? getCelanworksmithLinkMetadata(
          state,
          objectTypeId,
          applicationId || undefined,
        )
      : undefined,
  );
  const firstLinkTypeId = linkMetadata?.links[0]?.id;
  const firstLinkRequest = useMemo<CelanworksmithLinkRequest | undefined>(
    () =>
      objectTypeId && objectId && firstLinkTypeId
        ? {
            typeId: objectTypeId,
            objectId,
            linkTypeId: firstLinkTypeId,
            ...(applicationId ? { applicationId } : {}),
            prefetch: true,
          }
        : undefined,
    [applicationId, firstLinkTypeId, objectId, objectTypeId],
  );
  const firstLinkEntry = useSelector((state: DefaultRootState) =>
    firstLinkRequest
      ? getCelanworksmithLinkEntry(state, firstLinkRequest)
      : undefined,
  );
  const [activeLinkTypeId, setActiveLinkTypeId] = useState<string>();
  const [linkSearch, setLinkSearch] = useState("");
  const activeLinkType = linkMetadata?.links.find(
    (link) => link.id === activeLinkTypeId,
  );
  const activeTargetMetadata = activeLinkType
    ? objectsState.types[activeLinkType.targetTypeId]?.metadata
    : undefined;
  const activeRequest = useMemo<CelanworksmithLinkRequest | undefined>(
    () =>
      objectTypeId && objectId && activeLinkType
        ? {
            typeId: objectTypeId,
            objectId,
            linkTypeId: activeLinkType.id,
            ...(applicationId ? { applicationId } : {}),
          }
        : undefined,
    [activeLinkType, applicationId, objectId, objectTypeId],
  );
  const activeLinkEntry = useSelector((state: DefaultRootState) =>
    activeRequest
      ? getCelanworksmithLinkEntry(state, activeRequest)
      : undefined,
  );
  const linkedObjects = useMemo(
    () =>
      activeLinkType
        ? filterLinkedObjects(
            activeLinkEntry?.result?.items || [],
            activeLinkType.targetTypeId,
            linkSearch,
          )
        : [],
    [activeLinkEntry?.result?.items, activeLinkType, linkSearch],
  );

  useEffect(() => {
    updateWidgetMetaPropertyRef.current = updateWidgetMetaProperty;
  }, [updateWidgetMetaProperty]);

  useEffect(() => {
    clearLinkedSelection(updateWidgetMetaPropertyRef.current);
    setActiveLinkTypeId(undefined);
    setLinkSearch("");
  }, [identity]);

  useEffect(() => {
    if (!objectTypeId) return;

    if (!linkMetadata || linkMetadata.status === "idle") {
      dispatch(
        celanworksmithLinkMetadataLoadRequested(
          objectTypeId,
          false,
          applicationId || undefined,
        ),
      );
    }
  }, [applicationId, dispatch, linkMetadata, objectTypeId]);

  useEffect(() => {
    if (!linkMetadata || !activeLinkTypeId) return;

    if (linkMetadata.links.some((link) => link.id === activeLinkTypeId)) {
      return;
    }

    setActiveLinkTypeId(linkMetadata.links[0]?.id);
    setLinkSearch("");
    clearLinkedSelection(updateWidgetMetaPropertyRef.current);
  }, [activeLinkTypeId, linkMetadata]);

  useEffect(() => {
    if (!objectTypeId || !objectId || !linkMetadata?.links.length) return;

    const firstLinkType = linkMetadata.links[0];

    setActiveLinkTypeId((current) => current || firstLinkType.id);

    if (firstLinkRequest && !firstLinkEntry) {
      dispatch(celanworksmithLinkLoadRequested(firstLinkRequest));
    }
  }, [
    dispatch,
    firstLinkEntry,
    firstLinkRequest,
    identity,
    linkMetadata,
    objectId,
    objectTypeId,
  ]);

  const groups = object
    ? groupObjectProperties(
        object,
        metadata,
        metadata
          ? getDisplayMode(displayMode)
          : ObjectDetailDisplayMode.ALL_METADATA,
      )
    : [];

  const selectLinkType = (linkTypeId: string) => {
    setActiveLinkTypeId(linkTypeId);
    setLinkSearch("");
    clearLinkedSelection(updateWidgetMetaProperty);

    if (!object) return;

    dispatch(
      celanworksmithLinkLoadRequested({
        typeId: object.typeId,
        objectId: object.id,
        linkTypeId,
        ...(applicationId ? { applicationId } : {}),
      }),
    );
  };

  const selectLinkedObject = (linkedObject: CelanworksmithObjectInstance) => {
    updateWidgetMetaProperty("selectedLinkedObject", linkedObject);
    updateWidgetMetaProperty("selectedLinkedObjectId", linkedObject.id);
    updateWidgetMetaProperty("selectedLinkType", activeLinkTypeId);
  };

  if (objectData === undefined || objectData === null) {
    return <StateMessage>Select an object to view its details.</StateMessage>;
  }

  if (!object) {
    return (
      <StateMessage>Object data must include both id and typeId.</StateMessage>
    );
  }

  if (hasTypeMismatch) {
    return (
      <StateMessage role="alert">
        Object data does not match the configured Object Type.
      </StateMessage>
    );
  }

  return (
    <ObjectDetailContainer className="t--object-detail-widget">
      {!metadata && (
        <MetadataNotice>Object metadata is unavailable.</MetadataNotice>
      )}
      {(!linkMetadata || linkMetadata.status === "loading") && (
        <MetadataNotice>Loading Link metadata...</MetadataNotice>
      )}
      {linkMetadata?.status === "error" && (
        <MetadataNotice>
          {isLinkPermissionError(linkMetadata.error?.code) ? (
            <div>You do not have permission to access Link metadata.</div>
          ) : (
            <>
              <div>
                {linkMetadata.error?.message || "Unable to load links."}
              </div>
              <button
                onClick={() =>
                  dispatch(
                    celanworksmithLinkMetadataLoadRequested(
                      objectTypeId!,
                      true,
                      applicationId || undefined,
                    ),
                  )
                }
                type="button"
              >
                Retry links
              </button>
            </>
          )}
        </MetadataNotice>
      )}
      {groups.map((group) => (
        <PropertyGroup key={group.id}>
          <GroupTitle>{group.label}</GroupTitle>
          <dl>
            {group.properties.map((property) => (
              <PropertyRow key={property.id}>
                <PropertyLabel>{property.label}</PropertyLabel>
                <PropertyValue>{toDisplayValue(property.value)}</PropertyValue>
              </PropertyRow>
            ))}
          </dl>
        </PropertyGroup>
      ))}
      {!!linkMetadata?.links.length && (
        <section>
          <GroupTitle>Links</GroupTitle>
          <LinkTabs role="tablist">
            {linkMetadata.links.map((link) => (
              <LinkTab
                $active={link.id === activeLinkTypeId}
                aria-selected={link.id === activeLinkTypeId}
                key={link.id}
                onClick={() => selectLinkType(link.id)}
                role="tab"
                type="button"
              >
                {link.displayName}
              </LinkTab>
            ))}
          </LinkTabs>
          {activeLinkType && (
            <>
              <LinkDetails>
                <span>
                  Target:{" "}
                  {getObjectTypeLabel(
                    activeLinkType.targetTypeId,
                    activeTargetMetadata,
                  )}
                </span>
                <span>{activeLinkType.cardinality}</span>
              </LinkDetails>
              <Input
                aria-label="Search linked objects"
                onChange={(value) => setLinkSearch(String(value))}
                placeholder={`Search ${activeLinkType.targetTypeId}`}
                value={linkSearch}
              />
            </>
          )}
          {activeLinkEntry?.status === "loading" && <div>Loading links...</div>}
          {activeLinkEntry?.status === "empty" && <div>No linked objects.</div>}
          {activeLinkEntry?.status === "error" && activeRequest && (
            <LinkError>
              {isLinkPermissionError(activeLinkEntry.error?.code) ? (
                <div>
                  You do not have permission to access these linked objects.
                </div>
              ) : (
                <>
                  <div>
                    {activeLinkEntry.error?.message || "Unable to load links."}
                  </div>
                  <button
                    onClick={() =>
                      dispatch(
                        celanworksmithLinkLoadRequested({
                          ...activeRequest,
                          force: true,
                        }),
                      )
                    }
                    type="button"
                  >
                    Retry
                  </button>
                </>
              )}
            </LinkError>
          )}
          {!!linkSearch &&
            !!activeLinkEntry?.result?.items.length &&
            !linkedObjects.length && <div>No matching linked objects.</div>}
          {linkedObjects.map((linkedObject) => {
            const summary = getLinkedObjectSummary(
              linkedObject,
              activeTargetMetadata,
            );

            return (
              <LinkedObjectButton
                key={linkedObject.id}
                onClick={() => selectLinkedObject(linkedObject)}
                type="button"
              >
                <LinkedObjectId>{linkedObject.id}</LinkedObjectId>
                {summary && (
                  <LinkedObjectSummary>
                    {summary.label}: {summary.value}
                  </LinkedObjectSummary>
                )}
              </LinkedObjectButton>
            );
          })}
        </section>
      )}
    </ObjectDetailContainer>
  );
}
