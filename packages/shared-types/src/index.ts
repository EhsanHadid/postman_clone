export type ProtocolType = "http" | "trpc" | "grpc" | "rpc";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type RequestBodyType =
  | "none"
  | "json"
  | "text"
  | "form-urlencoded"
  | "multipart-form-data";
export type AuthType = "inherit" | "none" | "basic" | "bearer";
export type WorkspaceRole = "OWNER" | "ADMIN" | "CONTRIBUTOR" | "READONLY";
export type EditorTabKey =
  | "params"
  | "headers"
  | "body"
  | "auth"
  | "cookies"
  | "scripts";

export interface UserProfile {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface WorkspaceDefinition {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdById: string;
  currentUserRole: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberDefinition {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  addedById: string | null;
  user: PublicUserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface KeyValueItem {
  id?: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface MultipartFormValue extends KeyValueItem {
  valueType?: "text" | "file";
  fileName?: string;
  mimeType?: string;
}

export interface RequestAuthConfig {
  username?: string;
  password?: string;
  token?: string;
}

export interface RequestDefinition {
  id: string;
  collectionId: string;
  folderId: string | null;
  name: string;
  protocolType: ProtocolType;
  method: HttpMethod;
  url: string;
  trpcProcedurePath: string | null;
  headers: KeyValueItem[];
  queryParams: KeyValueItem[];
  bodyType: RequestBodyType;
  body: string;
  formData: MultipartFormValue[];
  authType: AuthType | null;
  authConfig: RequestAuthConfig | null;
  preRequestScript: string;
  postResponseScript: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderDefinition {
  id: string;
  collectionId: string;
  parentFolderId: string | null;
  name: string;
  sortOrder: number;
  authType: AuthType | null;
  authConfig: RequestAuthConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDefinition {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  description: string;
  sortOrder: number;
  authType: AuthType | null;
  authConfig: RequestAuthConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentVariableDefinition {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentDefinition {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  isGlobal: boolean;
  variables: EnvironmentVariableDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface CookieDefinition {
  id: string;
  userId: string;
  domain: string;
  path: string;
  name: string;
  value: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntryDefinition {
  id: string;
  userId: string;
  requestId: string | null;
  protocolType: ProtocolType;
  method: HttpMethod;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
  durationMs: number;
  createdAt: string;
}

export interface RequestSnapshotDefinition {
  id: string;
  requestId: string;
  name: string;
  method: HttpMethod;
  url: string;
  body: string;
  headers: KeyValueItem[];
  queryParams: KeyValueItem[];
  bodyType: RequestBodyType;
  authType: AuthType | null;
  authConfig: RequestAuthConfig | null;
  preRequestScript: string;
  postResponseScript: string;
  createdAt: string;
}

export interface CollectionTreeFolder extends FolderDefinition {
  folders: CollectionTreeFolder[];
  requests: RequestDefinition[];
}

export interface CollectionTree extends CollectionDefinition {
  folders: CollectionTreeFolder[];
  requests: RequestDefinition[];
}

export interface ExecutionRequestPayload {
  requestId?: string;
  request: Partial<RequestDefinition> & {
    protocolType: ProtocolType;
    headers?: KeyValueItem[];
    queryParams?: KeyValueItem[];
    formData?: MultipartFormValue[];
  };
  activeEnvironmentId?: string | null;
}

export interface ExecutionCookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
}

export interface ExecutionResponsePayload {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
  parsedBody?: unknown;
  cookies: ExecutionCookieInfo[];
  resolvedUrl: string;
  requestHeaders: Record<string, string>;
}

export interface ImportResult {
  collectionId: string | null;
  importedCount: number;
  skippedCount: number;
  warnings: string[];
}

export interface BackupExportPayload {
  version: number;
  exportedAt: string;
  data: {
    users?: UserProfile[];
    collections: CollectionDefinition[];
    folders: FolderDefinition[];
    requests: RequestDefinition[];
    environments: EnvironmentDefinition[];
    cookies?: CookieDefinition[];
    history?: HistoryEntryDefinition[];
  };
}

export type LocalRequestBodyType =
  | "none"
  | "json"
  | "text"
  | "form-data"
  | "x-www-form-urlencoded"
  | "binary";

export interface LocalRequestInput {
  id: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: {
    type: LocalRequestBodyType;
    value?: unknown;
  };
  timeoutMs?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
}

export interface LocalRequestResponse {
  id: string;
  ok: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string | string[]>;
  body?: string;
  bodyBase64?: string;
  bodyType?: "text" | "json" | "binary";
  durationMs?: number;
  sizeBytes?: number;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface LocalHistoryEntry {
  id: string;
  requestId?: string | null;
  workspaceId?: string | null;
  collectionId?: string | null;
  protocolType: ProtocolType;
  method: HttpMethod;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
  durationMs: number;
  sizeBytes?: number;
  createdAt: string;
}

export interface LocalHistoryCreateInput
  extends Omit<LocalHistoryEntry, "id" | "createdAt"> {
  id?: string;
  createdAt?: string;
}

export interface LocalHistoryFilters {
  query?: string;
  requestId?: string;
  collectionId?: string;
  workspaceId?: string;
  limit?: number;
}

export interface DesktopApi {
  executeRequest(input: LocalRequestInput): Promise<LocalRequestResponse>;
  cancelRequest(requestId: string): Promise<{ cancelled: boolean }>;
  saveLocalHistory(entry: LocalHistoryCreateInput): Promise<LocalHistoryEntry | null>;
  getLocalHistory(filters?: LocalHistoryFilters): Promise<LocalHistoryEntry[]>;
  deleteLocalHistory(id: string): Promise<{ success: boolean }>;
  clearLocalHistory(): Promise<{ success: boolean }>;
}
