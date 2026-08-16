import Api from "api/Api";
import type { ApiResponse } from "api/ApiResponses";

export type OntologyDatasourceSource =
  | "DEMO"
  | "LOCAL_YAML"
  | "PLATFORM_RELEASE";

export interface ImportOntologyDatasourceRequest {
  workspaceId: string;
  datasourceName: string;
  projectImportRequest: {
    sourceKind: OntologyDatasourceSource;
    metadata?: number[];
    sourceReleaseId?: string;
    runtimeProviderId?: string;
  };
  changeNote?: string;
}

export interface OntologyDatasourceSummary {
  datasourceId: string;
  datasourceName: string;
  projectId: string;
  projectVersion: string;
  source: string;
  provider: string;
  digest: string;
  status: string;
  changeNote?: string;
}

class OntologyDatasourceApi extends Api {
  static async importDatasource(
    request: ImportOntologyDatasourceRequest,
  ): Promise<ApiResponse<OntologyDatasourceSummary>> {
    return Api.post(
      "v1/celanworksmith/ontology/datasources",
      request,
    ) as Promise<ApiResponse<OntologyDatasourceSummary>>;
  }
}

export default OntologyDatasourceApi;
