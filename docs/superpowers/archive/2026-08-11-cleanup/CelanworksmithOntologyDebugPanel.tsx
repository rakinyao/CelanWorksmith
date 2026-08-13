import React, { useCallback } from "react";
import { Button, Flex } from "@appsmith/ads";
import type { OntologyDebugInfo } from "celanworksmith/ontologyDebug";

interface CelanworksmithOntologyDebugPanelProps {
  info: OntologyDebugInfo;
  onClearCache?: () => void;
  onRetry: () => void;
}

const DebugRow = ({ label, value }: { label: string; value?: string }) => (
  <Flex gap="spaces-3" justifyContent="space-between">
    <span>{label}</span>
    <span>{value || "-"}</span>
  </Flex>
);

const CelanworksmithOntologyDebugPanel = ({
  info,
  onClearCache,
  onRetry,
}: CelanworksmithOntologyDebugPanelProps) => {
  const copyBindingKey = useCallback(() => {
    if (
      !info.bindingKey ||
      !info.bindingKeySafeToCopy ||
      !navigator.clipboard?.writeText
    )
      return;

    void navigator.clipboard.writeText(info.bindingKey);
  }, [info.bindingKey]);

  return (
    <Flex
      data-testid="t--celanworksmith-debug-panel"
      flexDirection="column"
      gap="spaces-2"
      padding="spaces-3"
    >
      <strong>Ontology debug / 本体调试</strong>
      <DebugRow label="App" value={info.applicationId} />
      <DebugRow
        label="Project / Version"
        value={
          info.projectId && info.projectVersion
            ? `${info.projectId} / ${info.projectVersion}`
            : undefined
        }
      />
      <DebugRow label="Provider" value={info.providerId} />
      <DebugRow label="Binding status / 绑定状态" value={info.status} />
      <DebugRow
        label="Object Types / 对象类型"
        value={
          info.objectTypeStatus
            ? `${info.objectTypeStatus}: ${info.objectTypeIds.join(", ") || "-"}`
            : info.objectTypeIds.join(", ") || undefined
        }
      />
      <DebugRow label="Request key" value={info.request.requestKey} />
      <DebugRow label="API path" value={info.request.apiPath} />
      <DebugRow
        label="Response status"
        value={
          info.request.responseStatus === undefined
            ? undefined
            : String(info.request.responseStatus)
        }
      />
      <DebugRow
        label="Duration"
        value={
          info.request.durationMs === undefined
            ? undefined
            : `${info.request.durationMs} ms`
        }
      />
      <DebugRow
        label="Cache hit / Refresh reason"
        value={
          info.request.cacheHit === undefined
            ? info.request.refreshReason
            : `${String(info.request.cacheHit)} / ${info.request.refreshReason || "-"}`
        }
      />
      {info.error ? (
        <DebugRow
          label={`Error / ${info.error.code}`}
          value={info.error.message}
        />
      ) : null}
      <Flex gap="spaces-2">
        {info.request.canRetry ? (
          <Button
            data-testid="t--celanworksmith-debug-retry"
            onClick={onRetry}
            size="sm"
          >
            Retry / 重试
          </Button>
        ) : null}
        {info.bindingKey && info.bindingKeySafeToCopy ? (
          <Button
            data-testid="t--celanworksmith-debug-copy"
            onClick={copyBindingKey}
            size="sm"
          >
            Copy binding key / 复制绑定键
          </Button>
        ) : null}
        {onClearCache ? (
          <Button
            data-testid="t--celanworksmith-debug-clear-cache"
            onClick={onClearCache}
            size="sm"
          >
            Clear cache / 清缓存
          </Button>
        ) : null}
      </Flex>
    </Flex>
  );
};

export default CelanworksmithOntologyDebugPanel;
