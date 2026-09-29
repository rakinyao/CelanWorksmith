import Api from "api/Api";

export interface ApplicationMapSummary {
  id: string;
  name: string;
  regionCount: number;
}

class ApplicationMapsApi {
  private static baseURL(applicationId: string) {
    return `v1/celanworksmith/applications/${encodeURIComponent(applicationId)}/maps`;
  }

  static async list(applicationId: string): Promise<ApplicationMapSummary[]> {
    return Api.get(this.baseURL(applicationId)) as unknown as Promise<
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

  static async create(
    applicationId: string,
    name: string,
    file: File,
  ): Promise<ApplicationMapSummary> {
    const form = new FormData();

    form.append("name", name);
    form.append("file", file);

    return Api.post(
      this.baseURL(applicationId),
      form,
      {},
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    ) as unknown as Promise<ApplicationMapSummary>;
  }
}

export default ApplicationMapsApi;
