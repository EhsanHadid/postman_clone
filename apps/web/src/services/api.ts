import type {
  CollectionDefinition,
  CollectionTree,
  CookieDefinition,
  EnvironmentDefinition,
  ExecutionResponsePayload,
  HistoryEntryDefinition,
  PublicUserProfile,
  RequestDefinition,
  UserProfile,
  WorkspaceDefinition,
  WorkspaceMemberDefinition,
  WorkspaceRole,
} from "@postman-clone/shared-types";
import { getApiBaseUrl, isDesktopRenderer } from "./runtime";

const apiBase = getApiBaseUrl();
const desktopSessionKey = "postman-clone-desktop-session";

function getDesktopSessionToken(): string | null {
  if (!isDesktopRenderer()) {
    return null;
  }

  return window.localStorage.getItem(desktopSessionKey);
}

export function saveDesktopSessionToken(token?: string): void {
  if (!isDesktopRenderer()) {
    return;
  }

  if (token) {
    window.localStorage.setItem(desktopSessionKey, token);
  }
}

export function clearDesktopSessionToken(): void {
  if (isDesktopRenderer()) {
    window.localStorage.removeItem(desktopSessionKey);
  }
}

type RequestOptions = RequestInit & {
  bodyJson?: unknown;
};

type AuthResponse = {
  user: UserProfile;
  userId: string;
  sessionToken?: string;
};

export type PublicAppConfig = {
  desktopDownloadUrl: string | null;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const desktopSessionToken = getDesktopSessionToken();
  const response = await fetch(`${apiBase}${path}`, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(desktopSessionToken ? { "x-postman-clone-session": desktopSessionToken } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
    body:
      options.bodyJson !== undefined
        ? JSON.stringify(options.bodyJson)
        : options.body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  appConfig: {
    get: () => apiRequest<PublicAppConfig>("/app-config"),
  },
  auth: {
    me: () => apiRequest<AuthResponse>("/auth/me"),
    login: (payload: { username: string; password: string }) =>
      apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        bodyJson: payload,
      }),
    register: (payload: { username: string; password: string }) =>
      apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        bodyJson: payload,
      }),
    logout: () =>
      apiRequest<{ success: boolean }>("/auth/logout", {
        method: "POST",
      }),
  },
  collections: {
    list: () => apiRequest<CollectionTree[]>("/collections"),
    listByWorkspace: (workspaceId: string) =>
      apiRequest<CollectionTree[]>(`/collections/workspace/${workspaceId}`),
    create: (payload: Record<string, unknown>) =>
      apiRequest<CollectionDefinition>("/collections", { method: "POST", bodyJson: payload }),
    createInWorkspace: (workspaceId: string, payload: Record<string, unknown>) =>
      apiRequest<CollectionDefinition>(`/collections/workspace/${workspaceId}`, {
        method: "POST",
        bodyJson: payload,
      }),
    update: (id: string, payload: Record<string, unknown>) =>
      apiRequest<CollectionDefinition>(`/collections/${id}`, {
        method: "PATCH",
        bodyJson: payload,
      }),
    delete: (id: string) => apiRequest(`/collections/${id}`, { method: "DELETE" }),
  },
  folders: {
    create: (payload: Record<string, unknown>) =>
      apiRequest("/folders", { method: "POST", bodyJson: payload }),
    update: (id: string, payload: Record<string, unknown>) =>
      apiRequest(`/folders/${id}`, { method: "PATCH", bodyJson: payload }),
    delete: (id: string) => apiRequest(`/folders/${id}`, { method: "DELETE" }),
  },
  requests: {
    get: (id: string) => apiRequest<RequestDefinition>(`/requests/${id}`),
    create: (payload: Record<string, unknown>) =>
      apiRequest<RequestDefinition>("/requests", { method: "POST", bodyJson: payload }),
    update: (id: string, payload: Record<string, unknown>) =>
      apiRequest<RequestDefinition>(`/requests/${id}`, {
        method: "PATCH",
        bodyJson: payload,
      }),
    delete: (id: string) => apiRequest(`/requests/${id}`, { method: "DELETE" }),
    duplicate: (id: string) =>
      apiRequest<RequestDefinition>(`/requests/${id}/duplicate`, { method: "POST" }),
  },
  environments: {
    list: () => apiRequest<EnvironmentDefinition[]>("/environments"),
    listByWorkspace: (workspaceId: string) =>
      apiRequest<EnvironmentDefinition[]>(`/environments/workspace/${workspaceId}`),
    create: (payload: Record<string, unknown>) =>
      apiRequest("/environments", { method: "POST", bodyJson: payload }),
    createInWorkspace: (workspaceId: string, payload: Record<string, unknown>) =>
      apiRequest(`/environments/workspace/${workspaceId}`, { method: "POST", bodyJson: payload }),
    update: (id: string, payload: Record<string, unknown>) =>
      apiRequest(`/environments/${id}`, { method: "PATCH", bodyJson: payload }),
    delete: (id: string) => apiRequest(`/environments/${id}`, { method: "DELETE" }),
    addVariable: (id: string, payload: Record<string, unknown>) =>
      apiRequest(`/environments/${id}/variables`, { method: "POST", bodyJson: payload }),
    updateVariable: (id: string, payload: Record<string, unknown>) =>
      apiRequest(`/environment-variables/${id}`, {
        method: "PATCH",
        bodyJson: payload,
      }),
    deleteVariable: (id: string) =>
      apiRequest(`/environment-variables/${id}`, { method: "DELETE" }),
  },
  cookies: {
    list: () => apiRequest<CookieDefinition[]>("/cookies"),
    update: (id: string, payload: Record<string, unknown>) =>
      apiRequest(`/cookies/${id}`, { method: "PATCH", bodyJson: payload }),
    delete: (id: string) => apiRequest(`/cookies/${id}`, { method: "DELETE" }),
    clearDomain: (domain: string) =>
      apiRequest(`/cookies/domain/${encodeURIComponent(domain)}`, {
        method: "DELETE",
      }),
  },
  history: {
    list: () => apiRequest<HistoryEntryDefinition[]>("/history"),
    get: (id: string) => apiRequest<HistoryEntryDefinition>(`/history/${id}`),
    delete: (id: string) => apiRequest(`/history/${id}`, { method: "DELETE" }),
  },
  execution: {
    send: (payload: Record<string, unknown>) =>
      apiRequest<ExecutionResponsePayload>("/execute", {
        method: "POST",
        bodyJson: payload,
      }),
  },
  workspaces: {
    list: () => apiRequest<WorkspaceDefinition[]>("/workspaces"),
    create: (payload: { name: string; description?: string }) =>
      apiRequest<WorkspaceDefinition>("/workspaces", { method: "POST", bodyJson: payload }),
    update: (workspaceId: string, payload: { name?: string; description?: string }) =>
      apiRequest<WorkspaceDefinition>(`/workspaces/${workspaceId}`, {
        method: "PATCH",
        bodyJson: payload,
      }),
    delete: (workspaceId: string) =>
      apiRequest<{ success: boolean }>(`/workspaces/${workspaceId}`, { method: "DELETE" }),
    members: (workspaceId: string) =>
      apiRequest<WorkspaceMemberDefinition[]>(`/workspaces/${workspaceId}/members`),
    addMember: (workspaceId: string, payload: { userId: string; role: Exclude<WorkspaceRole, "OWNER"> }) =>
      apiRequest<WorkspaceMemberDefinition>(`/workspaces/${workspaceId}/members`, {
        method: "POST",
        bodyJson: payload,
      }),
    updateMember: (
      workspaceId: string,
      userId: string,
      payload: { role: Exclude<WorkspaceRole, "OWNER"> },
    ) =>
      apiRequest<WorkspaceMemberDefinition>(`/workspaces/${workspaceId}/members/${userId}`, {
        method: "PATCH",
        bodyJson: payload,
      }),
    removeMember: (workspaceId: string, userId: string) =>
      apiRequest<{ success: boolean }>(`/workspaces/${workspaceId}/members/${userId}`, {
        method: "DELETE",
      }),
  },
  users: {
    search: (query: string, excludeWorkspaceId?: string) => {
      const params = new URLSearchParams({ q: query });
      if (excludeWorkspaceId) {
        params.set("excludeWorkspaceId", excludeWorkspaceId);
      }
      return apiRequest<PublicUserProfile[]>(`/users/search?${params}`);
    },
  },
  importPostman: (payload: Record<string, unknown>) =>
    apiRequest("/import/postman", {
      method: "POST",
      bodyJson: payload,
    }),
  exportBackup: async () => {
    const response = await fetch(`${apiBase}/backup/export`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  },
  restoreBackup: (payload: Record<string, unknown>) =>
    apiRequest("/backup/restore", {
      method: "POST",
      bodyJson: payload,
    }),
};

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
