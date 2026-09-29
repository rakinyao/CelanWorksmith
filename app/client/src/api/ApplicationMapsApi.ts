import Api from "api/Api";

export interface ApplicationMapSummary {
  id: string;
  name: string;
  regionCount: number;
}

class ApplicationMapsApi extends Api {
  private static baseURL(applicationId: string) {
    return `v1/celanworksmith/applications/${encodeURIComponent(applicationId)}/maps`;
  }

  static async list(applicationId: string): Promise<ApplicationMapSummary[]> {
    return Api.get(this.baseURL(applicationId)) as Promise<
      ApplicationMapSummary[]
    >;
  }

  static async get(
    applicationId: string,
    resourceId: string,
  ): Promise<unknown> {
    return Api.get(
      `${this.baseURL(applicationId)}/${encodeURIComponent(resourceId)}`,
    );
  }
}

export default ApplicationMapsApi;
