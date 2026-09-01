import type { APIRequestContext } from "@playwright/test";
import { API } from "../constants/api-routes";
import { editorUrl } from "./url";

export interface WorkspaceInfo {
  id: string;
  name: string;
}

export interface AppInfo {
  id: string;
  name: string;
  slug: string;
  url: string;
}

export async function createWorkspace(
  api: APIRequestContext,
  name: string,
): Promise<WorkspaceInfo> {
  const response = await api.post(API.workspaces, { data: { name } });

  if (!response.ok()) {
    throw new Error(
      `Failed to create workspace "${name}": ${response.status()} ${await response.text()}`,
    );
  }

  const body = await response.json();
  return {
    id: body.data.id,
    name: body.data.name,
  };
}

export async function deleteWorkspace(
  api: APIRequestContext,
  workspaceId: string,
): Promise<void> {
  const response = await api.delete(`${API.workspaces}/${workspaceId}`);

  if (!response.ok()) {
    throw new Error(
      `Failed to delete workspace "${workspaceId}": ${response.status()}`,
    );
  }
}

export async function createApp(
  api: APIRequestContext,
  workspaceId: string,
  name: string,
): Promise<AppInfo> {
  const response = await api.post(API.applications, {
    data: { name, workspaceId },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create app "${name}": ${response.status()} ${await response.text()}`,
    );
  }

  const body = await response.json();
  const app = body.data;
  const defaultPage = app.pages.find(
    (page: { isDefault?: boolean }) => page.isDefault,
  );

  if (!defaultPage) {
    throw new Error(`Created app "${name}" did not include a default page`);
  }

  const pageResponse = await api.get(`${API.pages}/${defaultPage.id}`);

  if (!pageResponse.ok()) {
    throw new Error(
      `Failed to fetch default page for app "${name}": ${pageResponse.status()} ${await pageResponse.text()}`,
    );
  }

  const page = (await pageResponse.json()).data;

  return {
    id: app.id,
    name: app.name,
    slug: app.slug,
    url: editorUrl({
      appSlug: app.slug,
      pageId: page.baseId,
      pageSlug: page.slug,
    }),
  };
}

export async function deleteApp(
  api: APIRequestContext,
  appId: string,
  headers?: Record<string, string>,
): Promise<void> {
  const response = await api.delete(`${API.applications}/${appId}`, {
    headers,
  });

  if (!response.ok()) {
    throw new Error(`Failed to delete app "${appId}": ${response.status()}`);
  }
}

export async function deleteGitDeployKey(
  api: APIRequestContext,
  repoName: string,
  keyId: string,
): Promise<void> {
  const response = await api.delete(`${API.gitDeployKey}/${repoName}/${keyId}`);

  if (!response.ok()) {
    throw new Error(
      `Failed to delete deploy key "${keyId}": ${response.status()}`,
    );
  }
}
