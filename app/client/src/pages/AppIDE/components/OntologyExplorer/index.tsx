import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosResponse } from "axios";
import { EmptyState, Flex, Icon, Spinner } from "@appsmith/ads";
import styled from "styled-components";
import CelanworksmithAPI, {
  type CelanworksmithAction,
  type CelanworksmithFunction,
  type CelanworksmithLinkType,
  type CelanworksmithObjectType,
  type CelanworksmithProperty,
} from "api/CelanworksmithAPI";
import type { ApiResponse } from "api/ApiResponses";
import { useDispatch, useSelector } from "react-redux";
import { celanworksmithObjectsLoadRequest } from "actions/celanworksmithObjectActions";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";
import { getCelanworksmithOntologyState } from "selectors/celanworksmithSelectors";

type ApiResult<T> = ApiResponse<T> | AxiosResponse<ApiResponse<T>>;

type SelectedNode =
  | { kind: "objectType"; value: CelanworksmithObjectType }
  | { kind: "property"; value: CelanworksmithProperty; objectType: string }
  | { kind: "linkType"; value: CelanworksmithLinkType }
  | { kind: "function"; value: CelanworksmithFunction }
  | { kind: "action"; value: CelanworksmithAction };

const Explorer = styled(Flex)`
  min-width: 0;
  & button {
    font: inherit;
  }
`;

const ScrollArea = styled(Flex)`
  min-height: 0;
  overflow-y: auto;
`;

const OntologyText = styled.span<{
  $kind?: "body-s" | "heading-xs";
  $color?: string;
}>`
  color: ${({ $color }) => $color || "var(--ads-v2-color-fg)"};
  font-size: ${({ $kind }) => ($kind === "heading-xs" ? "14px" : "12px")};
  font-weight: ${({ $kind }) => ($kind === "heading-xs" ? 600 : 400)};
  line-height: 16px;
`;

const SectionTitle = styled(OntologyText)`
  color: var(--ads-v2-color-fg-secondary);
  padding: var(--ads-v2-spaces-3) var(--ads-v2-spaces-4) var(--ads-v2-spaces-2);
  text-transform: uppercase;
`;

const ObjectTypeGroup = styled.div``;

const EmptySection = () => (
  <OntologyText $color="var(--ads-v2-color-fg-secondary)" $kind="body-s">
    No items / 暂无数据
  </OntologyText>
);

const NodeButton = styled.button<{ $selected?: boolean; $depth?: number }>`
  align-items: center;
  background: ${({ $selected }) =>
    $selected ? "var(--ads-v2-color-bg-subtle)" : "transparent"};
  border: 0;
  color: var(--ads-v2-color-fg);
  cursor: pointer;
  display: flex;
  gap: var(--ads-v2-spaces-2);
  min-height: 32px;
  padding: var(--ads-v2-spaces-2) var(--ads-v2-spaces-4);
  padding-left: calc(
    var(--ads-v2-spaces-4) + ${({ $depth = 0 }) => $depth * 16}px
  );
  text-align: left;
  width: 100%;

  &:hover {
    background: var(--ads-v2-color-bg-subtle);
  }
`;

const ExpandButton = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--ads-v2-color-fg-secondary);
  cursor: pointer;
  display: flex;
  height: 24px;
  justify-content: center;
  padding: 0;
  width: 24px;
`;

const DetailPanel = styled(Flex)`
  border-top: 1px solid var(--ads-v2-color-border);
  min-height: 150px;
  overflow-y: auto;
  padding: var(--ads-v2-spaces-4);
`;

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Flex gap="spaces-3" justifyContent="space-between">
    <OntologyText $color="var(--ads-v2-color-fg-secondary)" $kind="body-s">
      {label}
    </OntologyText>
    <OntologyText $kind="body-s">{value}</OntologyText>
  </Flex>
);

const getApiData = <T,>(response: ApiResult<T>): T => {
  const responseData = response.data;

  if (
    responseData &&
    typeof responseData === "object" &&
    "responseMeta" in responseData &&
    "data" in responseData
  ) {
    return (responseData as ApiResponse<T>).data;
  }

  return (response as ApiResponse<T>).data;
};

const NodeLabel = ({
  name,
  secondary,
}: {
  name: string;
  secondary?: string;
}) => (
  <Flex flexDirection="column" minWidth={0} overflow="hidden">
    <OntologyText $kind="body-s">{name}</OntologyText>
    {secondary ? (
      <OntologyText $color="var(--ads-v2-color-fg-secondary)" $kind="body-s">
        {secondary}
      </OntologyText>
    ) : null}
  </Flex>
);

const Detail = ({ selected }: { selected: SelectedNode | null }) => {
  if (!selected) {
    return (
      <EmptyState
        description="Select an ontology item / 选择本体项"
        icon="file-line"
      />
    );
  }

  if (selected.kind === "objectType") {
    return (
      <Flex flexDirection="column" gap="spaces-3" width="100%">
        <OntologyText $kind="heading-xs">Object Type / 对象类型</OntologyText>
        <DetailRow label="ID" value={selected.value.id} />
        <DetailRow
          label="Properties / 属性"
          value={String(selected.value.properties.length)}
        />
      </Flex>
    );
  }

  if (selected.kind === "property") {
    return (
      <Flex flexDirection="column" gap="spaces-3" width="100%">
        <OntologyText $kind="heading-xs">Property / 属性</OntologyText>
        <DetailRow label="Object Type / 对象类型" value={selected.objectType} />
        <DetailRow label="ID" value={selected.value.id} />
        <DetailRow
          label="Data Type / 数据类型"
          value={selected.value.dataType}
        />
        <DetailRow
          label="Required / 必填"
          value={String(selected.value.required)}
        />
        <DetailRow
          label="Read Only / 只读"
          value={String(selected.value.readOnly)}
        />
        <DetailRow
          label="Derived / 派生"
          value={String(selected.value.derived)}
        />
      </Flex>
    );
  }

  if (selected.kind === "linkType") {
    return (
      <Flex flexDirection="column" gap="spaces-3" width="100%">
        <OntologyText $kind="heading-xs">Link Type / 关联类型</OntologyText>
        <DetailRow label="ID" value={selected.value.id} />
        <DetailRow
          label="Source / 源类型"
          value={selected.value.sourceTypeId}
        />
        <DetailRow
          label="Target / 目标类型"
          value={selected.value.targetTypeId}
        />
        <DetailRow
          label="Cardinality / 基数"
          value={selected.value.cardinality}
        />
      </Flex>
    );
  }

  if (selected.kind === "function") {
    return (
      <Flex flexDirection="column" gap="spaces-3" width="100%">
        <OntologyText $kind="heading-xs">Function / 函数</OntologyText>
        <DetailRow label="ID" value={selected.value.id} />
        <DetailRow
          label="Return Type / 返回类型"
          value={selected.value.returnType}
        />
        <DetailRow
          label="Parameters / 参数"
          value={String(selected.value.parameters.length)}
        />
        <DetailRow
          label="Side Effect Free / 无副作用"
          value={String(selected.value.sideEffectFree)}
        />
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" gap="spaces-3" width="100%">
      <OntologyText $kind="heading-xs">Action / 动作</OntologyText>
      <DetailRow label="ID" value={selected.value.id} />
      <DetailRow
        label="Object Type / 对象类型"
        value={selected.value.objectTypeId}
      />
      <DetailRow
        label="Parameters / 参数"
        value={String(selected.value.parameters.length)}
      />
      <DetailRow
        label="Requires Confirmation / 需要确认"
        value={String(selected.value.requiresConfirmation)}
      />
    </Flex>
  );
};

const OntologyExplorer = () => {
  const dispatch = useDispatch();
  const ontologyState = useSelector(getCelanworksmithOntologyState);
  const [objectTypes, setObjectTypes] = useState<CelanworksmithObjectType[]>(
    [],
  );
  const [linkTypes, setLinkTypes] = useState<CelanworksmithLinkType[]>([]);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [objectMetadataLoading, setObjectMetadataLoading] = useState(true);
  const [objectMetadataError, setObjectMetadataError] = useState(false);

  const loadObjectMetadata = useCallback(async () => {
    setObjectMetadataLoading(true);
    setObjectMetadataError(false);
    dispatch(celanworksmithObjectsLoadRequest());

    try {
      const [objectTypesResponse, linkTypesResponse] = await Promise.all([
        CelanworksmithAPI.getObjectTypes(),
        CelanworksmithAPI.getLinkTypes(),
      ]);

      setObjectTypes(getApiData(objectTypesResponse));
      setLinkTypes(getApiData(linkTypesResponse));
    } catch {
      setObjectMetadataError(true);
    } finally {
      setObjectMetadataLoading(false);
    }
  }, [dispatch]);

  const retryOntology = useCallback(() => {
    dispatch(celanworksmithOntologyLoadRequest());
    void loadObjectMetadata();
  }, [dispatch, loadObjectMetadata]);

  useEffect(
    function loadOntologyOnMount() {
      void loadObjectMetadata();
    },
    [loadObjectMetadata],
  );

  const objectTypeNames = useMemo(
    () =>
      new Map(
        objectTypes.map((objectType) => [
          objectType.id,
          objectType.displayName,
        ]),
      ),
    [objectTypes],
  );

  const toggleObjectType = useCallback((typeId: string) => {
    setExpandedTypes((current) => {
      const next = new Set(current);

      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }

      return next;
    });
  }, []);

  if (objectMetadataLoading || ontologyState.status === "loading") {
    return (
      <Explorer alignItems="center" height="100%" justifyContent="center">
        <Spinner size="md" />
      </Explorer>
    );
  }

  if (objectMetadataError || ontologyState.status === "error") {
    return (
      <Explorer alignItems="center" height="100%" justifyContent="center">
        <EmptyState
          button={{
            className: "t--ontology-retry",
            onClick: retryOntology,
            testId: "t--ontology-retry",
            text: "Retry / 重试",
          }}
          description="Unable to load ontology / 本体加载失败"
          icon="warning-line"
        />
      </Explorer>
    );
  }

  return (
    <Explorer flexDirection="column" height="100%" overflow="hidden">
      <ScrollArea flex="1" flexDirection="column">
        <SectionTitle>Object Types / 对象类型</SectionTitle>
        {objectTypes.map((objectType) => {
          const isExpanded = expandedTypes.has(objectType.id);
          const isSelected =
            selected?.kind === "objectType" &&
            selected.value.id === objectType.id;

          return (
            <ObjectTypeGroup key={objectType.id}>
              <Flex alignItems="center">
                <ExpandButton
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${objectType.displayName}`}
                  data-testid={`t--ontology-expand-${objectType.id}`}
                  onClick={() => toggleObjectType(objectType.id)}
                >
                  <Icon
                    name={
                      isExpanded ? "arrow-down-s-line" : "arrow-right-s-line"
                    }
                    size="sm"
                  />
                </ExpandButton>
                <NodeButton
                  $selected={isSelected}
                  data-testid={`t--ontology-object-type-${objectType.id}`}
                  onClick={() =>
                    setSelected({ kind: "objectType", value: objectType })
                  }
                >
                  <Icon name="database-2-line" size="sm" />
                  <NodeLabel
                    name={objectType.displayName}
                    secondary={objectType.id}
                  />
                </NodeButton>
              </Flex>
              {isExpanded
                ? objectType.properties.map((property) => (
                    <NodeButton
                      $depth={1}
                      $selected={
                        selected?.kind === "property" &&
                        selected.value.id === property.id &&
                        selected.objectType === objectType.id
                      }
                      data-testid={`t--ontology-property-${objectType.id}-${property.id}`}
                      key={property.id}
                      onClick={() =>
                        setSelected({
                          kind: "property",
                          objectType: objectType.id,
                          value: property,
                        })
                      }
                    >
                      <Icon name="file-line" size="sm" />
                      <NodeLabel
                        name={property.displayName}
                        secondary={property.dataType}
                      />
                    </NodeButton>
                  ))
                : null}
            </ObjectTypeGroup>
          );
        })}
        {objectTypes.length === 0 ? <EmptySection /> : null}

        <SectionTitle>Link Types / 关联类型</SectionTitle>
        {linkTypes.map((linkType) => (
          <NodeButton
            $selected={
              selected?.kind === "linkType" && selected.value.id === linkType.id
            }
            data-testid={`t--ontology-link-type-${linkType.id}`}
            key={linkType.id}
            onClick={() => setSelected({ kind: "linkType", value: linkType })}
          >
            <Icon name="links-line" size="sm" />
            <NodeLabel
              name={linkType.displayName}
              secondary={`${objectTypeNames.get(linkType.sourceTypeId) || linkType.sourceTypeId} -> ${objectTypeNames.get(linkType.targetTypeId) || linkType.targetTypeId}`}
            />
          </NodeButton>
        ))}
        {linkTypes.length === 0 ? <EmptySection /> : null}

        <SectionTitle>Functions / 函数</SectionTitle>
        {ontologyState.functions.map((func) => (
          <NodeButton
            $selected={
              selected?.kind === "function" && selected.value.id === func.id
            }
            data-testid={`t--ontology-function-${func.id}`}
            key={func.id}
            onClick={() => setSelected({ kind: "function", value: func })}
          >
            <Icon name="widget" size="sm" />
            <NodeLabel name={func.displayName} secondary={func.id} />
          </NodeButton>
        ))}
        {ontologyState.functions.length === 0 ? <EmptySection /> : null}

        <SectionTitle>Actions / 动作</SectionTitle>
        {ontologyState.actions.map((action) => (
          <NodeButton
            $selected={
              selected?.kind === "action" && selected.value.id === action.id
            }
            data-testid={`t--ontology-action-${action.id}`}
            key={action.id}
            onClick={() => setSelected({ kind: "action", value: action })}
          >
            <Icon name="play-line" size="sm" />
            <NodeLabel name={action.displayName} secondary={action.id} />
          </NodeButton>
        ))}
        {ontologyState.actions.length === 0 ? <EmptySection /> : null}
      </ScrollArea>
      <DetailPanel>
        <Detail selected={selected} />
      </DetailPanel>
    </Explorer>
  );
};

export default OntologyExplorer;
