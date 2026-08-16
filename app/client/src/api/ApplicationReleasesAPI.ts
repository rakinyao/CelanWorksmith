import Api from "api/Api";
import type { ApiResponse } from "api/types";

export interface ReleaseDiagnostic {
  severity: "BLOCKING" | "WARNING" | "INFO";
  code: string;
  path?: string | null;
  message: string;
  details: Record<string, unknown>;
}

export interface ReleasePreflightResponse {
  applicationId: string;
  baseRevisionId: string | null;
  valid: boolean;
  diagnostics: ReleaseDiagnostic[];
}

export interface ApplicationReleaseSnapshot {
  releaseId: string;
  applicationId: string;
  workspaceId: string;
  baseRevisionId: string;
  releaseSchemaVersion: string;
  createdBy: string;
  createdAt: string;
  releaseMessage?: string;
  contentDigest: string;
  applicationContent: Record<string, unknown>;
  datasourcePins: unknown[];
  diagnostics: ReleaseDiagnostic[];
  status: string;
}

export interface ApplicationReleaseRequest {
  message?: string;
}

export type ApplicationReleasesResponse = ApplicationReleaseSnapshot[];
export type ApplicationReleaseResponse = ApplicationReleaseSnapshot;
export type ApplicationReleasePreflightResponse = ReleasePreflightResponse;

class ApplicationReleasesAPI extends Api {
  static baseURL = (applicationId: string) =>
    `v1/celanworksmith/applications/${encodeURIComponent(applicationId)}/releases`;

  static async preflight(
    applicationId: string,
    request?: ApplicationReleaseRequest,
  ): Promise<ApiResponse<ApplicationReleasePreflightResponse>> {
    return Api.post(
      `${ApplicationReleasesAPI.baseURL(applicationId)}/preflight`,
      request,
    ) as unknown as Promise<ApiResponse<ApplicationReleasePreflightResponse>>;
  }

  static async create(
    applicationId: string,
    request?: ApplicationReleaseRequest,
  ): Promise<ApiResponse<ApplicationReleaseResponse>> {
    return Api.post(
      ApplicationReleasesAPI.baseURL(applicationId),
      request,
    ) as unknown as Promise<ApiResponse<ApplicationReleaseResponse>>;
  }

  static async list(
    applicationId: string,
  ): Promise<ApiResponse<ApplicationReleasesResponse>> {
    return Api.get(
      ApplicationReleasesAPI.baseURL(applicationId),
    ) as unknown as Promise<ApiResponse<ApplicationReleasesResponse>>;
  }

  static async getActive(
    applicationId: string,
  ): Promise<ApiResponse<ApplicationReleaseResponse>> {
    return Api.get(
      `${ApplicationReleasesAPI.baseURL(applicationId)}/active`,
    ) as unknown as Promise<ApiResponse<ApplicationReleaseResponse>>;
  }

  static async activate(
    applicationId: string,
    releaseId: string,
  ): Promise<ApiResponse<ApplicationReleaseResponse>> {
    return Api.post(
      `${ApplicationReleasesAPI.baseURL(applicationId)}/${encodeURIComponent(releaseId)}/activate`,
    ) as unknown as Promise<ApiResponse<ApplicationReleaseResponse>>;
  }

  static async rollback(
    applicationId: string,
    releaseId: string,
  ): Promise<ApiResponse<ApplicationReleaseResponse>> {
    return Api.post(
      `${ApplicationReleasesAPI.baseURL(applicationId)}/${encodeURIComponent(releaseId)}/rollback`,
    ) as unknown as Promise<ApiResponse<ApplicationReleaseResponse>>;
  }
}

export default ApplicationReleasesAPI;
