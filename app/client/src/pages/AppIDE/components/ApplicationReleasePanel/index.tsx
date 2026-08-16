import {
  Button,
  Callout,
  Checkbox,
  Flex,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Text,
} from "@appsmith/ads";
import {
  applicationReleaseActivateError,
  applicationReleaseActivateInit,
  applicationReleaseActivateSuccess,
  applicationReleaseActiveError,
  applicationReleaseActiveInit,
  applicationReleaseActiveSuccess,
  applicationReleaseCreateError,
  applicationReleaseCreateInit,
  applicationReleaseCreateSuccess,
  applicationReleaseListError,
  applicationReleaseListInit,
  applicationReleaseListSuccess,
  applicationReleasePreflightError,
  applicationReleasePreflightInit,
  applicationReleasePreflightSuccess,
  applicationReleaseRollbackError,
  applicationReleaseRollbackInit,
  applicationReleaseRollbackSuccess,
} from "actions/applicationReleaseActions";
import ApplicationReleasesAPI, {
  type ApplicationReleaseSnapshot,
  type ReleasePreflightResponse,
} from "api/ApplicationReleasesAPI";
import type { ApiResponse } from "api/types";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector, type DefaultRootState } from "react-redux";
import styled from "styled-components";

const DiagnosticList = styled.div`
  display: grid;
  gap: 8px;
  margin: 12px 0;
`;

const HistoryList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 12px;
`;

const HistoryItem = styled.div`
  border: 1px solid var(--ads-v2-color-border);
  padding: 8px;
`;

interface ApplicationReleasePanelProps {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => void;
}

const responseData = <T,>(response: ApiResponse<T>) => {
  if (!response?.responseMeta?.success || response.responseMeta.status >= 400) {
    const error = new Error(
      response?.responseMeta?.error?.message || "Release request failed",
    );

    Object.assign(error, {
      code: response?.responseMeta?.error?.code || "RELEASE_REQUEST_FAILED",
      status: response?.responseMeta?.status,
    });
    throw error;
  }

  return response.data;
};

const readSettledResponse = <T,>(
  result: PromiseSettledResult<ApiResponse<T>>,
): { data?: T; error?: unknown } => {
  if (result.status === "rejected") return { error: result.reason };

  try {
    return { data: responseData(result.value) };
  } catch (error) {
    return { error };
  }
};

const getDigestPrefix = (release: ApplicationReleaseSnapshot) =>
  release.contentDigest.slice(0, 13);

const getSeverityLabel = (severity: string, t: (key: string) => string) => {
  const knownSeverity = ["BLOCKING", "WARNING", "INFO"].includes(severity);

  return t(
    knownSeverity ? `release.severity.${severity}` : "release.severity.UNKNOWN",
  );
};

const getStatusLabel = (status: string, t: (key: string) => string) => {
  const knownStatus = [
    "SNAPSHOT_CREATED",
    "PUBLISHED",
    "SUPERSEDED",
    "ROLLED_BACK",
  ].includes(status);

  return t(knownStatus ? `release.status.${status}` : "release.status.UNKNOWN");
};

const getDiagnosticKind = (severity: string): "error" | "warning" | "info" => {
  if (severity === "BLOCKING") return "error";

  if (severity === "WARNING") return "warning";

  return "info";
};

function ApplicationReleasePanel({
  applicationId,
  isOpen,
  onClose,
  onPublish,
}: ApplicationReleasePanelProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const applicationRelease = useSelector(
    (state: DefaultRootState) => state.ui.applicationRelease,
  );
  const { activeReleaseId, error, loading, preflight, releases } =
    applicationRelease;
  const isBusy = loading || requestLoading;
  const diagnostics = preflight?.diagnostics || [];
  const hasBlockingDiagnostic = diagnostics.some(
    (diagnostic) => diagnostic.severity === "BLOCKING",
  );
  const hasWarningDiagnostic = diagnostics.some(
    (diagnostic) => diagnostic.severity === "WARNING",
  );
  const canOperate =
    Boolean(preflight?.valid) &&
    !hasBlockingDiagnostic &&
    (!hasWarningDiagnostic || warningAcknowledged);

  const loadReleaseData = useCallback(async () => {
    setRequestLoading(true);
    setWarningAcknowledged(false);
    dispatch(applicationReleasePreflightInit());
    dispatch(applicationReleaseListInit());
    dispatch(applicationReleaseActiveInit());

    const [preflightResult, listResult, activeResult] =
      await Promise.allSettled([
        ApplicationReleasesAPI.preflight(applicationId),
        ApplicationReleasesAPI.list(applicationId),
        ApplicationReleasesAPI.getActive(applicationId),
      ]);

    const preflightResponse = readSettledResponse(preflightResult);

    if (preflightResponse.error === undefined) {
      dispatch(
        applicationReleasePreflightSuccess(
          preflightResponse.data as ReleasePreflightResponse,
        ),
      );
    } else {
      dispatch(applicationReleasePreflightError(preflightResponse.error));
    }

    let activeRelease: ApplicationReleaseSnapshot | null = null;
    const activeResponse = readSettledResponse(activeResult);

    if (activeResponse.error === undefined) {
      activeRelease = activeResponse.data as ApplicationReleaseSnapshot;
      dispatch(applicationReleaseActiveSuccess(activeRelease));
    } else {
      dispatch(applicationReleaseActiveError(activeResponse.error));
    }

    const listResponse = readSettledResponse(listResult);

    if (listResponse.error === undefined) {
      dispatch(
        applicationReleaseListSuccess(
          listResponse.data as ApplicationReleaseSnapshot[],
          activeRelease?.releaseId,
        ),
      );
    } else {
      dispatch(applicationReleaseListError(listResponse.error));
    }

    setRequestLoading(false);
  }, [applicationId, dispatch]);

  useEffect(() => {
    if (isOpen) {
      setWarningAcknowledged(false);
      void loadReleaseData();
    }
  }, [isOpen, loadReleaseData]);

  const statusText = useMemo(() => {
    if (isBusy) return t("release.loading");

    if (error) return t("release.requestFailed");

    if (!preflight) return t("release.empty");

    if (hasBlockingDiagnostic) return t("release.blocking");

    if (hasWarningDiagnostic && !warningAcknowledged) {
      return t("release.warningAcknowledgementRequired");
    }

    return t("release.ready");
  }, [
    error,
    hasBlockingDiagnostic,
    hasWarningDiagnostic,
    isBusy,
    preflight,
    t,
    warningAcknowledged,
  ]);

  const createRelease = async () => {
    if (!canOperate) return;

    setRequestLoading(true);
    dispatch(applicationReleaseCreateInit());
    try {
      const result = await ApplicationReleasesAPI.create(applicationId);

      dispatch(applicationReleaseCreateSuccess(responseData(result)));
    } catch (requestError) {
      dispatch(applicationReleaseCreateError(requestError));
    } finally {
      setRequestLoading(false);
    }
  };

  const activateRelease = async (releaseId: string) => {
    if (!canOperate) return;

    setRequestLoading(true);
    dispatch(applicationReleaseActivateInit(releaseId));
    try {
      const result = await ApplicationReleasesAPI.activate(
        applicationId,
        releaseId,
      );

      dispatch(applicationReleaseActivateSuccess(responseData(result)));
    } catch (requestError) {
      dispatch(applicationReleaseActivateError(requestError));
    } finally {
      setRequestLoading(false);
    }
  };

  const rollbackRelease = async (releaseId: string) => {
    if (!canOperate) return;

    setRequestLoading(true);
    dispatch(applicationReleaseRollbackInit(releaseId));
    try {
      const result = await ApplicationReleasesAPI.rollback(
        applicationId,
        releaseId,
      );

      dispatch(applicationReleaseRollbackSuccess(responseData(result)));
    } catch (requestError) {
      dispatch(applicationReleaseRollbackError(requestError));
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <Modal onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <ModalContent style={{ width: "720px" }}>
        <ModalHeader>{t("release.heading")}</ModalHeader>
        <ModalBody>
          {isBusy && (
            <Flex alignItems="center" gap="spaces-2">
              <Spinner size="sm" />
              <Text>{statusText}</Text>
            </Flex>
          )}
          {!isBusy && error && <Callout kind="error">{statusText}</Callout>}
          {!isBusy && !error && <Text>{statusText}</Text>}
          <Button
            isDisabled={isBusy}
            onClick={() => void loadReleaseData()}
            size="sm"
          >
            {t("release.preflight")}
          </Button>

          {activeReleaseId && (
            <Text>
              {t("release.activeRelease")}: {activeReleaseId}
            </Text>
          )}

          {diagnostics.length > 0 && (
            <DiagnosticList>
              {diagnostics.map((diagnostic) => (
                <Callout
                  key={`${diagnostic.code}-${diagnostic.path || "root"}`}
                  kind={getDiagnosticKind(diagnostic.severity)}
                >
                  <Text kind="body-m-bold">
                    {getSeverityLabel(diagnostic.severity, t)}
                  </Text>
                  {diagnostic.path && (
                    <Text>
                      {t("release.resourcePath")}: {diagnostic.path}
                    </Text>
                  )}
                  <Text>{diagnostic.message}</Text>
                </Callout>
              ))}
            </DiagnosticList>
          )}

          {hasWarningDiagnostic && (
            <Checkbox
              isSelected={warningAcknowledged}
              onChange={setWarningAcknowledged}
            >
              {t("release.acknowledgeWarning")}
            </Checkbox>
          )}

          <Text kind="heading-s" renderAs="h4">
            {t("release.history")}
          </Text>
          {releases.length === 0 && <Text>{t("release.historyEmpty")}</Text>}
          {releases.length > 0 && (
            <HistoryList>
              {releases.map((release) => (
                <HistoryItem key={release.releaseId}>
                  <Text>
                    {t("release.releaseId")}: {release.releaseId}
                  </Text>
                  <Text>
                    {t("release.createdAt")}: {release.createdAt}
                  </Text>
                  <Text>
                    {t("release.statusLabel")}:{" "}
                    {getStatusLabel(release.status, t)}
                  </Text>
                  <Text>
                    {t("release.digest")}: {getDigestPrefix(release)}
                  </Text>
                  <Flex gap="spaces-2">
                    <Button
                      isDisabled={!canOperate || isBusy}
                      onClick={() => void activateRelease(release.releaseId)}
                      size="sm"
                    >
                      {t("release.activate")}
                    </Button>
                    <Button
                      isDisabled={!canOperate || isBusy}
                      kind="secondary"
                      onClick={() => void rollbackRelease(release.releaseId)}
                      size="sm"
                    >
                      {t("release.rollback")}
                    </Button>
                  </Flex>
                </HistoryItem>
              ))}
            </HistoryList>
          )}
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={onClose} size="md">
            {t("common.close")}
          </Button>
          <Button
            isDisabled={!canOperate || isBusy}
            onClick={() => void createRelease()}
            size="md"
          >
            {t("release.create")}
          </Button>
          <Button
            isDisabled={!canOperate || isBusy}
            onClick={onPublish}
            size="md"
          >
            {t("release.publish")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ApplicationReleasePanel;
