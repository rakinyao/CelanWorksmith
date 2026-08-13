import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Flex } from "@appsmith/ads";
import type {
  CelanworksmithExecutionError,
  CelanworksmithOntologyProjectSummary,
} from "api/CelanworksmithAPI";
import {
  celanworksmithApplicationBindingLoadRequest,
  celanworksmithApplicationBindingSaveRequest,
} from "actions/celanworksmithApplicationBindingActions";
import { getCelanworksmithApplicationBindingState } from "selectors/celanworksmithApplicationBindingSelectors";

export interface CelanworksmithApplicationBindingPanelProps {
  applicationId: string;
  debugError?: Pick<CelanworksmithExecutionError, "code" | "message">;
  onClearCache?: () => void;
  onDebugRetry?: () => void;
}

const CelanworksmithApplicationBindingPanel = ({
  applicationId,
  debugError,
  onClearCache,
  onDebugRetry,
}: CelanworksmithApplicationBindingPanelProps) => {
  const dispatch = useDispatch();
  const state = useSelector(getCelanworksmithApplicationBindingState);
  const [isDeveloperToolsOpen, setIsDeveloperToolsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const options = useMemo(
    () =>
      state.projects.map((project: CelanworksmithOntologyProjectSummary) => ({
        key: `${project.projectId}:${project.version}`,
        label: `${project.projectId} / ${project.version}`,
        project,
      })),
    [state.projects],
  );
  const selected = options.find((option) => option.key === selectedKey);
  const retry =
    onDebugRetry ||
    (() =>
      dispatch(celanworksmithApplicationBindingLoadRequest(applicationId)));

  if (state.status === "ready") {
    return (
      <Flex
        alignItems="stretch"
        backgroundColor="var(--ads-v2-color-bg-subtle)"
        data-testid="t--celanworksmith-binding-panel"
        flexDirection="column"
        gap="spaces-3"
        padding="spaces-3"
      >
        <span>
          Bound to / 已绑定：{state.binding?.projectId} /{" "}
          {state.binding?.projectVersion}
        </span>
        {(onClearCache || retry) && (
          <>
            <Button
              onClick={() => setIsDeveloperToolsOpen((isOpen) => !isOpen)}
              size="sm"
            >
              Developer tools / 开发工具
            </Button>
            {isDeveloperToolsOpen && (
              <Flex flexDirection="column" gap="spaces-2">
                {debugError?.code && <span>Error / {debugError.code}</span>}
                {onClearCache && (
                  <Button onClick={onClearCache} size="sm">
                    Clear cache / 清除缓存
                  </Button>
                )}
                {retry && (
                  <Button
                    data-testid="t--celanworksmith-debug-retry"
                    onClick={retry}
                    size="sm"
                  >
                    Retry / 重试
                  </Button>
                )}
              </Flex>
            )}
          </>
        )}
      </Flex>
    );
  }

  return (
    <Flex
      alignItems="stretch"
      backgroundColor="var(--ads-v2-color-bg-subtle)"
      data-testid="t--celanworksmith-binding-panel"
      flexDirection="column"
      gap="spaces-3"
      padding="spaces-3"
    >
      <span>
        {state.status === "error"
          ? `Ontology binding failed: ${debugError?.message || state.error?.message || "Unknown error"}`
          : "Select an ontology project / 选择本体工程"}
      </span>
      {state.status === "unbound" || state.status === "idle" ? (
        <>
          <select
            aria-label="Ontology project / 本体工程"
            data-testid="t--celanworksmith-binding-project"
            onChange={(event) => setSelectedKey(event.target.value)}
            value={selectedKey}
          >
            <option value="">Choose project / 选择工程</option>
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            disabled={!selected}
            onClick={() =>
              selected &&
              dispatch(
                celanworksmithApplicationBindingSaveRequest(applicationId, {
                  projectId: selected.project.projectId,
                  projectVersion: selected.project.version,
                  providerId: "mongodb-readonly",
                }),
              )
            }
            size="sm"
          >
            Bind / 绑定
          </Button>
        </>
      ) : null}
      {state.status === "error" && retry && (
        <Button onClick={retry} size="sm">
          Retry / 重试
        </Button>
      )}
      {onClearCache && (
        <Button onClick={onClearCache} size="sm">
          Clear cache / 清除缓存
        </Button>
      )}
    </Flex>
  );
};

export default CelanworksmithApplicationBindingPanel;
