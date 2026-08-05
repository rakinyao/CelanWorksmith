import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { DefaultRootState } from "react-redux";
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
import {
  getObjectIdentity,
  groupObjectProperties,
  normalizeObjectData,
  ObjectDetailDisplayMode,
} from "../widget/objectDetailUtils";
import {
  GroupTitle,
  LinkError,
  LinkedObjectButton,
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

export interface ObjectDetailComponentProps {
  objectData?: unknown;
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
  updateWidgetMetaProperty,
}: ObjectDetailComponentProps) {
  const dispatch = useDispatch();
  const object = useMemo(() => normalizeObjectData(objectData), [objectData]);
  const identity = getObjectIdentity(object);
  const metadata = useSelector((state: DefaultRootState) =>
    object
      ? getCelanworksmithObjectsState(state).types[object.typeId]?.metadata
      : undefined,
  );
  const linkMetadata = useSelector((state: DefaultRootState) =>
    getCelanworksmithLinkMetadata(state, object?.typeId || ""),
  );
  const firstLinkRequest: CelanworksmithLinkRequest | undefined =
    object && linkMetadata?.links[0]
      ? {
          typeId: object.typeId,
          objectId: object.id,
          linkTypeId: linkMetadata.links[0].id,
          prefetch: true,
        }
      : undefined;
  const firstLinkEntry = useSelector((state: DefaultRootState) =>
    firstLinkRequest
      ? getCelanworksmithLinkEntry(state, firstLinkRequest)
      : undefined,
  );
  const [activeLinkTypeId, setActiveLinkTypeId] = useState<string>();
  const activeLinkType = linkMetadata?.links.find(
    (link) => link.id === activeLinkTypeId,
  );
  const activeRequest: CelanworksmithLinkRequest | undefined =
    object && activeLinkType
      ? {
          typeId: object.typeId,
          objectId: object.id,
          linkTypeId: activeLinkType.id,
        }
      : undefined;
  const activeLinkEntry = useSelector((state: DefaultRootState) =>
    activeRequest ? getCelanworksmithLinkEntry(state, activeRequest) : undefined,
  );

  useEffect(() => {
    if (!object || !identity) return;

    clearLinkedSelection(updateWidgetMetaProperty);
    setActiveLinkTypeId(undefined);
  }, [identity, object, updateWidgetMetaProperty]);

  useEffect(() => {
    if (!object) return;

    if (!linkMetadata || linkMetadata.status === "idle") {
      dispatch(celanworksmithLinkMetadataLoadRequested(object.typeId));
    }
  }, [dispatch, linkMetadata, object]);

  useEffect(() => {
    if (!object || !linkMetadata?.links.length) return;

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
    object,
  ]);

  const groups = object
    ? groupObjectProperties(
        object,
        metadata,
        metadata ? getDisplayMode(displayMode) : ObjectDetailDisplayMode.ALL_METADATA,
      )
    : [];

  const selectLinkType = (linkTypeId: string) => {
    setActiveLinkTypeId(linkTypeId);
    clearLinkedSelection(updateWidgetMetaProperty);

    if (!object) return;

    dispatch(
      celanworksmithLinkLoadRequested({
        typeId: object.typeId,
        objectId: object.id,
        linkTypeId,
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

  return (
    <ObjectDetailContainer className="t--object-detail-widget">
      {!metadata && (
        <MetadataNotice>Object metadata is unavailable.</MetadataNotice>
      )}
      {groups.map((group) => (
        <PropertyGroup key={group.id}>
          <GroupTitle>{group.label}</GroupTitle>
          {group.properties.map((property) => (
            <PropertyRow key={property.id}>
              <PropertyLabel>{property.label}</PropertyLabel>
              <PropertyValue>{toDisplayValue(property.value)}</PropertyValue>
            </PropertyRow>
          ))}
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
          {activeLinkEntry?.status === "loading" && <div>Loading links...</div>}
          {activeLinkEntry?.status === "empty" && <div>No linked objects.</div>}
          {activeLinkEntry?.status === "error" && activeRequest && (
            <LinkError>
              <div>{activeLinkEntry.error?.message || "Unable to load links."}</div>
              <button
                onClick={() => dispatch(celanworksmithLinkLoadRequested(activeRequest))}
                type="button"
              >
                Retry
              </button>
            </LinkError>
          )}
          {activeLinkEntry?.result?.items.map((linkedObject) => (
            <LinkedObjectButton
              key={linkedObject.id}
              onClick={() => selectLinkedObject(linkedObject)}
              type="button"
            >
              {linkedObject.id}
            </LinkedObjectButton>
          ))}
        </section>
      )}
    </ObjectDetailContainer>
  );
}
