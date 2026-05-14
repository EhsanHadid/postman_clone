import type {
  AuthType,
  CollectionTree,
  CollectionTreeFolder,
  EnvironmentDefinition,
  ExecutionCookieInfo,
  ExecutionResponsePayload,
  HttpMethod,
  KeyValueItem,
  LocalHistoryCreateInput,
  LocalRequestBodyType,
  LocalRequestInput,
  MultipartFormValue,
  RequestAuthConfig,
  RequestDefinition,
  RequestBodyType,
} from "@postman-clone/shared-types";
import { interpolateObject, safeJsonParse, toEnabledRecord } from "@postman-clone/shared-utils";

type RequestDraft = Partial<RequestDefinition> &
  Pick<RequestDefinition, "protocolType"> & {
    headers?: KeyValueItem[];
    queryParams?: KeyValueItem[];
    formData?: MultipartFormValue[];
  };

interface LocalExecutionPayload {
  requestId?: string;
  activeEnvironmentId?: string | null;
  request: RequestDraft;
}

const sensitiveHeaders = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "proxy-authorization",
]);

function requireDesktopApi() {
  if (!window.desktopApi) {
    throw new Error("Desktop request executor is unavailable. Run this app inside Electron to send requests locally.");
  }

  return window.desktopApi;
}

function normalizeHeaderName(name: string) {
  return name.trim().toLowerCase();
}

function maskHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      sensitiveHeaders.has(normalizeHeaderName(key)) ? "[masked]" : value,
    ]),
  );
}

function getEnvironmentVariables(
  environments: EnvironmentDefinition[],
  activeEnvironmentId?: string | null,
) {
  const variables: Record<string, string> = {};

  for (const environment of environments) {
    if (!environment.isGlobal && environment.id !== activeEnvironmentId) {
      continue;
    }

    for (const variable of environment.variables) {
      if (variable.enabled && variable.key.trim()) {
        variables[variable.key] = variable.value;
      }
    }
  }

  return variables;
}

function findFolderPath(
  folders: CollectionTreeFolder[],
  folderId: string | null | undefined,
  path: CollectionTreeFolder[] = [],
): CollectionTreeFolder[] {
  if (!folderId) {
    return [];
  }

  for (const folder of folders) {
    const nextPath = [...path, folder];
    if (folder.id === folderId) {
      return nextPath;
    }

    const nestedPath = findFolderPath(folder.folders, folderId, nextPath);
    if (nestedPath.length) {
      return nestedPath;
    }
  }

  return [];
}

function resolveInheritedAuth(
  request: RequestDraft,
  collections: CollectionTree[],
): { authType: AuthType | null; authConfig: RequestAuthConfig | null } {
  if (request.authType && request.authType !== "inherit") {
    return {
      authType: request.authType,
      authConfig: request.authConfig ?? null,
    };
  }

  const collection = collections.find((item) => item.id === request.collectionId);
  const folderPath = collection ? findFolderPath(collection.folders, request.folderId) : [];

  for (const folder of [...folderPath].reverse()) {
    if (folder.authType && folder.authType !== "inherit") {
      return {
        authType: folder.authType,
        authConfig: folder.authConfig,
      };
    }
  }

  if (collection?.authType && collection.authType !== "inherit") {
    return {
      authType: collection.authType,
      authConfig: collection.authConfig,
    };
  }

  return {
    authType: null,
    authConfig: null,
  };
}

function applyAuthHeader(
  headers: Record<string, string>,
  authType: AuthType | null,
  authConfig: RequestAuthConfig | null,
) {
  if (!authType || authType === "none") {
    return;
  }

  if (authType === "basic" && authConfig?.username !== undefined) {
    headers.authorization = `Basic ${btoa(`${authConfig.username}:${authConfig.password ?? ""}`)}`;
  }

  if (authType === "bearer" && authConfig?.token) {
    headers.authorization = `Bearer ${authConfig.token}`;
  }
}

function resolveTrpcUrl(baseUrl: string, procedurePath: string) {
  const trimmedBaseUrl = baseUrl.replace(/\/$/, "");
  const normalizedProcedure = procedurePath.replace(/^\//, "");
  const trpcBase = trimmedBaseUrl.endsWith("/trpc")
    ? trimmedBaseUrl
    : `${trimmedBaseUrl}/trpc`;

  return `${trpcBase}/${normalizedProcedure}`;
}

function createTrpcBody(body: string) {
  return JSON.stringify(safeJsonParse<unknown>(body || "{}", {}));
}

function appendInputParam(urlValue: string, body: string) {
  const url = new URL(urlValue);
  url.searchParams.set("input", createTrpcBody(body));
  return url.toString();
}

function toBodyType(bodyType: RequestBodyType | undefined): LocalRequestBodyType {
  if (bodyType === "form-urlencoded") {
    return "x-www-form-urlencoded";
  }

  if (bodyType === "multipart-form-data") {
    return "form-data";
  }

  if (bodyType === "json" || bodyType === "text") {
    return bodyType;
  }

  return "none";
}

function buildLocalRequestInput(
  request: RequestDraft,
  collections: CollectionTree[],
): { input: LocalRequestInput; resolvedUrl: string; requestHeaders: Record<string, string>; requestBody: string } {
  let url = request.url ?? "";
  const method = request.protocolType === "trpc"
    ? request.method === "POST" ? "POST" : "GET"
    : request.method ?? "GET";
  const headers = Object.fromEntries(
    Object.entries(toEnabledRecord(request.headers ?? [])).map(([key, value]) => [
      normalizeHeaderName(key),
      value,
    ]),
  );
  let body = request.body ?? "";
  let bodyType = request.protocolType === "trpc"
    ? method === "POST" ? "json" : "none"
    : toBodyType(request.bodyType);

  const resolvedAuth = resolveInheritedAuth(request, collections);
  applyAuthHeader(headers, resolvedAuth.authType, resolvedAuth.authConfig);

  if (request.protocolType === "trpc") {
    url = resolveTrpcUrl(url, request.trpcProcedurePath ?? "");

    if (method === "GET") {
      url = appendInputParam(url, body || "{}");
      delete headers["content-type"];
      body = "";
    } else {
      headers["content-type"] = headers["content-type"] ?? "application/json";
      body = createTrpcBody(body || "{}");
    }
  }

  const bodyValue = bodyType === "form-data" || bodyType === "x-www-form-urlencoded"
    ? request.formData ?? []
    : body;

  return {
    input: {
      id: crypto.randomUUID(),
      method,
      url,
      headers,
      queryParams: toEnabledRecord(request.queryParams ?? []),
      body: {
        type: bodyType,
        value: bodyValue,
      },
      timeoutMs: 60_000,
      followRedirects: true,
      maxRedirects: 10,
    },
    resolvedUrl: url,
    requestHeaders: headers,
    requestBody: body,
  };
}

function toCookiePreview(headers: Record<string, string | string[]> | undefined, rawUrl: string): ExecutionCookieInfo[] {
  const value = headers?.["set-cookie"] ?? headers?.["Set-Cookie"];
  const setCookieHeaders = Array.isArray(value) ? value : value ? [value] : [];

  return setCookieHeaders.map((header) => {
    const [nameValue, ...parts] = header.split(";").map((part) => part.trim());
    const [name, cookieValue] = nameValue.split("=");
    const url = new URL(rawUrl);
    const domainPart = parts.find((part) => part.toLowerCase().startsWith("domain="));
    const pathPart = parts.find((part) => part.toLowerCase().startsWith("path="));

    return {
      name,
      value: cookieValue,
      domain: domainPart?.split("=")[1] ?? url.hostname,
      path: pathPart?.split("=")[1] ?? "/",
    };
  });
}

function normalizeResponseHeaders(headers?: Record<string, string | string[]>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(", ") : value,
    ]),
  );
}

export const localDesktop = {
  history: {
    list: async () => requireDesktopApi().getLocalHistory(),
    delete: async (id: string) => requireDesktopApi().deleteLocalHistory(id),
    clear: async () => requireDesktopApi().clearLocalHistory(),
  },
  execution: {
    cancel: async (requestId: string) => requireDesktopApi().cancelRequest(requestId),
    send: async (
      payload: LocalExecutionPayload,
      context: {
        environments: EnvironmentDefinition[];
        collections: CollectionTree[];
        saveHistoryLocally?: boolean;
        localRequestId?: string;
      },
    ): Promise<ExecutionResponsePayload> => {
      const variables = getEnvironmentVariables(context.environments, payload.activeEnvironmentId);
      const request = interpolateObject(payload.request as never, variables) as RequestDraft;
      const { input, resolvedUrl, requestHeaders, requestBody } = buildLocalRequestInput(
        request,
        context.collections,
      );
      input.id = context.localRequestId ?? input.id;
      const localResponse = await requireDesktopApi().executeRequest(input);

      if (!localResponse.ok) {
        throw new Error(localResponse.error?.message ?? "Local request execution failed.");
      }

      const headers = normalizeResponseHeaders(localResponse.headers);
      const body = localResponse.body ?? "";
      const parsedBody = safeJsonParse<unknown>(body, null);
      const executionResponse: ExecutionResponsePayload = {
        status: localResponse.status ?? 0,
        statusText: localResponse.statusText ?? "",
        durationMs: localResponse.durationMs ?? 0,
        headers,
        body,
        parsedBody,
        cookies: toCookiePreview(localResponse.headers, resolvedUrl),
        resolvedUrl,
        requestHeaders,
      };

      const shouldSaveHistory = context.saveHistoryLocally ?? true;
      if (shouldSaveHistory) {
        const historyEntry: LocalHistoryCreateInput = {
          requestId: payload.requestId ?? request.id ?? null,
          collectionId: request.collectionId ?? null,
          protocolType: request.protocolType,
          method: input.method as HttpMethod,
          url: resolvedUrl,
          requestHeaders: maskHeaders(requestHeaders),
          requestBody,
          responseStatus: executionResponse.status,
          responseHeaders: maskHeaders(headers),
          responseBody: body,
          durationMs: executionResponse.durationMs,
          sizeBytes: localResponse.sizeBytes,
        };

        await requireDesktopApi().saveLocalHistory(historyEntry);
      }

      return executionResponse;
    },
  },
};
