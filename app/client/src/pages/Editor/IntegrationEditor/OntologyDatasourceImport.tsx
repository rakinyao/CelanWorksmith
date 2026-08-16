import {
  Button,
  Flex,
  Input,
  Option,
  Select,
  Text,
  toast,
} from "@appsmith/ads";
import { objectKeys } from "@appsmith/utils";
import OntologyDatasourceApi, {
  type OntologyDatasourceSource,
  type OntologyDatasourceSummary,
} from "api/OntologyDatasourceApi";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  DatasourceSection,
  DatasourceSectionHeading,
  StyledDivider,
} from "./IntegrationStyledComponents";

const ImportForm = styled(Flex)`
  max-width: 560px;
`;

const FileInput = styled.input`
  font-size: var(--ads-v2-font-size-3);
`;

interface OntologyDatasourceImportProps {
  onImported: () => void;
  workspaceId: string;
}

interface ImportValidation {
  datasourceName?: string;
  metadata?: string;
  runtimeProviderId?: string;
  sourceReleaseId?: string;
}

const sourceOptions: Array<{
  labelKey:
    | "ontologyDatasource.sourceDemo"
    | "ontologyDatasource.sourceLocalYaml"
    | "ontologyDatasource.sourcePlatformRelease";
  value: OntologyDatasourceSource;
}> = [
  { value: "DEMO", labelKey: "ontologyDatasource.sourceDemo" },
  { value: "LOCAL_YAML", labelKey: "ontologyDatasource.sourceLocalYaml" },
  {
    value: "PLATFORM_RELEASE",
    labelKey: "ontologyDatasource.sourcePlatformRelease",
  },
];

const readFile = async (file: File): Promise<number[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () =>
      resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)));
    reader.readAsArrayBuffer(file);
  });

const structuredErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error !== "object" || error === null) return undefined;

  const record = error as Record<string, unknown>;

  if (typeof record.message === "string" && record.message) {
    return record.message;
  }

  for (const key of ["response", "data", "responseMeta", "error", "message"]) {
    const message = structuredErrorMessage(record[key]);

    if (message) return message;
  }

  return undefined;
};

const sanitizeDiagnosticMessage = (message: string): string =>
  message
    .replace(
      /("?'?(?:token|password|secret|authorization|apiKey)"?'?\s*[:=]\s*)Bearer\s+.*?(?=\s+(?:token|password|secret|authorization|apiKey)\s*[:=]|[,;]|$)/gi,
      "$1[REDACTED]",
    )
    .replace(
      /("?'?(?:token|password|secret|authorization|apiKey)"?'?\s*[:=]\s*)("[^"]*"|'[^']*'|[^,\s}]+)/gi,
      "$1[REDACTED]",
    );

function OntologyDatasourceImport({
  onImported,
  workspaceId,
}: OntologyDatasourceImportProps) {
  const { t } = useTranslation();
  const [source, setSource] = useState<OntologyDatasourceSource>("DEMO");
  const [datasourceName, setDatasourceName] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [runtimeProviderId, setRuntimeProviderId] = useState("");
  const [sourceReleaseId, setSourceReleaseId] = useState("");
  const [yamlFile, setYamlFile] = useState<File>();
  const [validation, setValidation] = useState<ImportValidation>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string>();
  const [summary, setSummary] = useState<OntologyDatasourceSummary>();

  const validate = (): ImportValidation => {
    const errors: ImportValidation = {};

    if (!datasourceName.trim()) {
      errors.datasourceName = t("ontologyDatasource.datasourceNameRequired");
    }

    if (source === "LOCAL_YAML") {
      if (!yamlFile) errors.metadata = t("ontologyDatasource.yamlRequired");

      if (!runtimeProviderId.trim()) {
        errors.runtimeProviderId = t(
          "ontologyDatasource.runtimeProviderRequired",
        );
      }
    }

    if (source === "PLATFORM_RELEASE" && !sourceReleaseId.trim()) {
      errors.sourceReleaseId = t("ontologyDatasource.releaseRequired");
    }

    return errors;
  };

  const importDatasource = async () => {
    const errors = validate();

    setValidation(errors);

    if (objectKeys(errors).length > 0) return;

    setIsImporting(true);
    setSummary(undefined);
    setImportError(undefined);
    try {
      const metadata = yamlFile ? await readFile(yamlFile) : undefined;
      const response = await OntologyDatasourceApi.importDatasource({
        workspaceId,
        datasourceName: datasourceName.trim(),
        projectImportRequest: {
          sourceKind: source,
          metadata,
          sourceReleaseId: sourceReleaseId.trim() || undefined,
          runtimeProviderId: runtimeProviderId.trim() || undefined,
        },
        changeNote: changeNote.trim() || undefined,
      });

      setSummary(response.data);
      onImported();
      toast.show(t("ontologyDatasource.importSuccess"), { kind: "success" });
    } catch (error) {
      const message = sanitizeDiagnosticMessage(
        structuredErrorMessage(error) || t("ontologyDatasource.importFailed"),
      );

      setImportError(message);
      toast.show(message, { kind: "error" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSourceChange = useCallback((value: string) => {
    setSource(value as OntologyDatasourceSource);
    setValidation({});
  }, []);

  const handleYamlFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setYamlFile(event.target.files?.[0]);
      setValidation((current) => ({ ...current, metadata: undefined }));
    },
    [],
  );

  return (
    <>
      <DatasourceSection
        aria-busy={isImporting}
        data-testid="t--ontology-datasource-import"
      >
        <Flex flexDirection="column" gap="spaces-1">
          <DatasourceSectionHeading kind="heading-m">
            {t("ontologyDatasource.heading")}
          </DatasourceSectionHeading>
          <Text>{t("ontologyDatasource.description")}</Text>
        </Flex>
        <ImportForm flexDirection="column" gap="spaces-4">
          <Select
            aria-label={t("ontologyDatasource.source")}
            onChange={handleSourceChange}
            value={source}
          >
            {sourceOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </Option>
            ))}
          </Select>
          <Input
            errorMessage={validation.datasourceName}
            isRequired
            label={t("ontologyDatasource.datasourceName")}
            onChange={setDatasourceName}
            value={datasourceName}
          />
          {source === "LOCAL_YAML" && (
            <>
              <Flex flexDirection="column" gap="spaces-1">
                <Text>{t("ontologyDatasource.yamlFile")}</Text>
                <FileInput
                  accept=".yaml,.yml"
                  aria-label={t("ontologyDatasource.yamlFile")}
                  onChange={handleYamlFileChange}
                  type="file"
                />
                {validation.metadata && (
                  <Text color="var(--ads-v2-color-red-500)">
                    {validation.metadata}
                  </Text>
                )}
              </Flex>
              <Input
                errorMessage={validation.runtimeProviderId}
                isRequired
                label={t("ontologyDatasource.runtimeProvider")}
                onChange={setRuntimeProviderId}
                value={runtimeProviderId}
              />
            </>
          )}
          {source === "PLATFORM_RELEASE" && (
            <Input
              errorMessage={validation.sourceReleaseId}
              isRequired
              label={t("ontologyDatasource.releaseId")}
              onChange={setSourceReleaseId}
              value={sourceReleaseId}
            />
          )}
          <Input
            label={t("ontologyDatasource.changeNote")}
            onChange={setChangeNote}
            renderAs="textarea"
            value={changeNote}
          />
          <Flex justifyContent="flex-start">
            <Button
              isDisabled={isImporting}
              isLoading={isImporting}
              kind="primary"
              onClick={importDatasource}
            >
              {t("ontologyDatasource.import")}
            </Button>
          </Flex>
          {summary && (
            <Text data-testid="t--ontology-datasource-import-success">
              {t("ontologyDatasource.importedSummary", {
                name: summary.datasourceName,
                version: summary.projectVersion,
              })}
            </Text>
          )}
          {importError && (
            <Text color="var(--ads-v2-color-red-500)" role="alert">
              {importError}
            </Text>
          )}
          {isImporting && (
            <Text aria-live="polite" role="status">
              {t("ontologyDatasource.importLoading")}
            </Text>
          )}
          {!isImporting && !summary && !importError && (
            <Text
              aria-live="polite"
              data-testid="t--ontology-datasource-import-empty"
              role="status"
            >
              {t("ontologyDatasource.importEmpty")}
            </Text>
          )}
        </ImportForm>
      </DatasourceSection>
      <StyledDivider />
    </>
  );
}

export default OntologyDatasourceImport;
