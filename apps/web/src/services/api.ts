import type {
  CollectionTree,
  CookieDefinition,
  EnvironmentDefinition,
  ExecutionResponsePayload,
  HistoryEntryDefinition,
  RequestDefinition,
  UserProfile,
} from "@postman-clone/shared-types";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api";

type RequestOptions = RequestInit & {
  bodyJson?: unknown;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
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
  auth: {
    me: () => apiRequest<{ user: UserProfile; userId: string }>("/auth/me"),
    login: (payload: { username: string; password: string }) =>
      apiRequest<{ user: UserProfile; userId: string }>("/auth/login", {
        method: "POST",
        bodyJson: payload,
      }),
    register: (payload: { username: string; password: string }) =>
      apiRequest<{ user: UserProfile; userId: string }>("/auth/register", {
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
    create: (payload: Record<string, unknown>) =>
      apiRequest("/collections", { method: "POST", bodyJson: payload }),
    update: (id: string, payload: Record<string, unknown>) =>
      apiRequest(`/collections/${id}`, { method: "PATCH", bodyJson: payload }),
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
    create: (payload: Record<string, unknown>) =>
      apiRequest("/environments", { method: "POST", bodyJson: payload }),
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
    http: (payload: Record<string, unknown>) =>
      apiRequest<ExecutionResponsePayload>("/execute/http", {
        method: "POST",
        bodyJson: payload,
      }),
    trpc: (payload: Record<string, unknown>) =>
      apiRequest<ExecutionResponsePayload>("/execute/trpc", {
        method: "POST",
        bodyJson: payload,
      }),
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
