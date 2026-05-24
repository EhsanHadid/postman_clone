import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuthType,
  HttpMethod,
  KeyValueItem,
  MultipartFormValue,
  RequestAuthConfig,
  RequestBodyType,
} from "@postman-clone/shared-types";
import {
  interpolateObject,
  safeJsonParse,
  stripJsonComments,
} from "@postman-clone/shared-utils";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CollectionEntity,
  FolderEntity,
} from "../../database/entities";
import { CookiesService } from "../cookies/cookies.service";
import { EnvironmentsService } from "../environments/environments.service";
import { HistoryService } from "../history/history.service";
import { RequestsService } from "../requests/requests.service";
import { TrpcService } from "../trpc/trpc.service";
import { ExecuteRequestDto } from "./dto/execute-request.dto";
import { ScriptRunnerService } from "./script-runner.service";

interface ResolvedRequest {
  id?: string;
  collectionId?: string;
  folderId?: string | null;
  name: string;
  protocolType: "http" | "trpc" | "grpc" | "rpc";
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
}

@Injectable()
export class ExecutionService {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly environmentsService: EnvironmentsService,
    private readonly cookiesService: CookiesService,
    private readonly historyService: HistoryService,
    private readonly trpcService: TrpcService,
    private readonly scriptRunnerService: ScriptRunnerService,
    @InjectRepository(CollectionEntity)
    private readonly collectionRepository: Repository<CollectionEntity>,
    @InjectRepository(FolderEntity)
    private readonly folderRepository: Repository<FolderEntity>,
  ) {}

  async execute(userId: string, dto: ExecuteRequestDto) {
    const mergedRequest = await this.resolveRequest(userId, dto);
    const environmentVariables = await this.environmentsService.getVariableMap(
      userId,
      dto.activeEnvironmentId,
    );
    const interpolatedRequest = this.interpolateRequest(mergedRequest, environmentVariables);
    const resolvedAuth = await this.resolveInheritedAuth(interpolatedRequest);
    const mutableHeaders = this.toHeaderRecord(interpolatedRequest.headers);

    this.applyAuthHeader(mutableHeaders, resolvedAuth.authType, resolvedAuth.authConfig);

    const mutableRequest = {
      url: this.buildUrl(interpolatedRequest.url, interpolatedRequest.queryParams),
      method: interpolatedRequest.method,
      headers: mutableHeaders,
      body: interpolatedRequest.body,
    };

    const preScript = this.scriptRunnerService.run({
      script: interpolatedRequest.preRequestScript,
      request: mutableRequest,
      envVariables: environmentVariables,
    });

    if (!mutableRequest.headers.cookie) {
      const cookieHeader = await this.cookiesService.getCookieHeader(userId, mutableRequest.url);
      if (cookieHeader) {
        mutableRequest.headers.cookie = cookieHeader;
      }
    }

    const startedAt = Date.now();
    const fetchResult = await this.performFetch(interpolatedRequest, mutableRequest);
    const durationMs = Date.now() - startedAt;
    const responseHeaders = this.readHeaders(fetchResult.response.headers);
    const responseBody = await fetchResult.response.text();
    const parsedBody = safeJsonParse<unknown>(responseBody, null);
    const setCookieHeaders = this.extractSetCookieHeaders(fetchResult.response.headers);

    if (setCookieHeaders.length) {
      await this.cookiesService.absorbResponseCookies(
        userId,
        fetchResult.resolvedUrl,
        setCookieHeaders,
      );
    }

    const postScript = this.scriptRunnerService.run({
      script: interpolatedRequest.postResponseScript,
      request: mutableRequest,
      envVariables: environmentVariables,
      response: {
        status: fetchResult.response.status,
        headers: responseHeaders,
        text: () => responseBody,
        json: () => parsedBody,
      },
    });

    await this.environmentsService.applyScriptMutations(userId, dto.activeEnvironmentId, {
      ...preScript.envMutations,
      ...postScript.envMutations,
    });

    await this.historyService.createEntry({
      userId,
      requestId: dto.requestId ?? mergedRequest.id ?? null,
      protocolType: interpolatedRequest.protocolType,
      method: mutableRequest.method as HttpMethod,
      url: fetchResult.resolvedUrl,
      requestHeaders: mutableRequest.headers,
      requestBody: mutableRequest.body,
      responseStatus: fetchResult.response.status,
      responseHeaders,
      responseBody,
      durationMs,
    });

    return {
      status: fetchResult.response.status,
      statusText: fetchResult.response.statusText,
      durationMs,
      headers: responseHeaders,
      body: responseBody,
      parsedBody,
      cookies: setCookieHeaders.map((header) => this.previewCookie(header, fetchResult.resolvedUrl)),
      resolvedUrl: fetchResult.resolvedUrl,
      requestHeaders: mutableRequest.headers,
    };
  }

  private async resolveRequest(userId: string, dto: ExecuteRequestDto): Promise<ResolvedRequest> {
    let savedRequest = null;

    if (dto.requestId) {
      try {
        savedRequest = await this.requestsService.findOwned(userId, dto.requestId);
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw error;
        }
      }
    }

    const source = dto.request;

    return {
      id: source.id ?? savedRequest?.id,
      collectionId: source.collectionId ?? savedRequest?.collectionId,
      folderId: source.folderId ?? savedRequest?.folderId ?? null,
      name: source.name ?? savedRequest?.name ?? "Untitled Request",
      protocolType: source.protocolType ?? savedRequest?.protocolType ?? "http",
      method: source.method ?? savedRequest?.method ?? "GET",
      url: source.url ?? savedRequest?.url ?? "",
      trpcProcedurePath:
        source.trpcProcedurePath === undefined
          ? savedRequest?.trpcProcedurePath ?? null
          : source.trpcProcedurePath,
      headers: source.headers ?? savedRequest?.headers ?? [],
      queryParams: source.queryParams ?? savedRequest?.queryParams ?? [],
      bodyType: source.bodyType ?? savedRequest?.bodyType ?? "none",
      body: source.body ?? savedRequest?.body ?? "",
      formData: source.formData ?? savedRequest?.formData ?? [],
      authType:
        source.authType === undefined
          ? savedRequest?.authType ?? null
          : (source.authType as AuthType | null),
      authConfig:
        source.authConfig === undefined ? savedRequest?.authConfig ?? null : source.authConfig,
      preRequestScript:
        source.preRequestScript ?? savedRequest?.preRequestScript ?? "",
      postResponseScript:
        source.postResponseScript ?? savedRequest?.postResponseScript ?? "",
    };
  }

  private interpolateRequest(
    request: ResolvedRequest,
    variables: Record<string, string>,
  ): ResolvedRequest {
    return interpolateObject(request as never, variables) as ResolvedRequest;
  }

  private async resolveInheritedAuth(
    request: ResolvedRequest,
  ): Promise<{ authType: AuthType | null; authConfig: RequestAuthConfig | null }> {
    if (request.authType && request.authType !== "inherit") {
      return {
        authType: request.authType,
        authConfig: request.authConfig,
      };
    }

    let currentFolderId = request.folderId ?? null;

    while (currentFolderId) {
      const folder = await this.folderRepository.findOne({ where: { id: currentFolderId } });

      if (!folder) {
        break;
      }

      if (folder.authType && folder.authType !== "inherit") {
        return {
          authType: folder.authType,
          authConfig: folder.authConfig,
        };
      }

      currentFolderId = folder.parentFolderId;
    }

    if (request.collectionId) {
      const collection = await this.collectionRepository.findOne({
        where: { id: request.collectionId },
      });

      if (collection?.authType && collection.authType !== "inherit") {
        return {
          authType: collection.authType,
          authConfig: collection.authConfig,
        };
      }
    }

    return {
      authType: null,
      authConfig: null,
    };
  }

  private applyAuthHeader(
    headers: Record<string, string>,
    authType: AuthType | null,
    authConfig: RequestAuthConfig | null,
  ): void {
    if (!authType || authType === "none") {
      return;
    }

    if (authType === "basic" && authConfig?.username !== undefined) {
      headers.authorization = `Basic ${Buffer.from(
        `${authConfig.username}:${authConfig.password ?? ""}`,
      ).toString("base64")}`;
    }

    if (authType === "bearer" && authConfig?.token) {
      headers.authorization = `Bearer ${authConfig.token}`;
    }
  }

  private buildUrl(urlValue: string, queryParams: KeyValueItem[]): string {
    let resolvedUrl: URL;
    try {
      resolvedUrl = new URL(urlValue);
    } catch {
      throw new BadRequestException("Request URL must be a valid absolute URL.");
    }

    for (const param of queryParams) {
      if (param.enabled && param.key.trim()) {
        resolvedUrl.searchParams.set(param.key, param.value);
      }
    }

    return resolvedUrl.toString();
  }

  private async performFetch(
    request: ResolvedRequest,
    mutableRequest: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body: string;
    },
  ): Promise<{ response: Response; resolvedUrl: string }> {
    if (!mutableRequest.url) {
      throw new BadRequestException("Request URL is required.");
    }

    let resolvedUrl = mutableRequest.url;
    let transportUrl = this.resolveTransportUrl(mutableRequest.url);

    this.assertPublicRequestUrl(resolvedUrl);

    if (request.protocolType === "trpc") {
      if (mutableRequest.method !== "GET" && mutableRequest.method !== "POST") {
        throw new BadRequestException(
          "tRPC requests in this client support GET for queries and POST for mutations.",
        );
      }

      resolvedUrl = this.trpcService.resolveUrl(resolvedUrl, request.trpcProcedurePath ?? "");
      transportUrl = this.trpcService.resolveUrl(
        transportUrl,
        request.trpcProcedurePath ?? "",
      );

      this.assertPublicRequestUrl(resolvedUrl);

      if (mutableRequest.method === "GET") {
        resolvedUrl = this.trpcService.appendInputParam(resolvedUrl, mutableRequest.body || "{}");
        transportUrl = this.trpcService.appendInputParam(
          transportUrl,
          mutableRequest.body || "{}",
        );
        delete mutableRequest.headers["content-type"];
      } else {
        mutableRequest.headers["content-type"] = "application/json";
        mutableRequest.body = this.trpcService.createBody(mutableRequest.body || "{}");
      }
    } else if (request.bodyType === "json") {
      mutableRequest.body = stripJsonComments(mutableRequest.body || "{}");
    }

    const body = await this.buildRequestBody(
      request.protocolType === "trpc"
        ? mutableRequest.method === "POST"
          ? "json"
          : "none"
        : request.bodyType,
      mutableRequest.body,
      request.formData,
      mutableRequest.headers,
    );

    try {
      const response = await fetch(transportUrl, {
        method: mutableRequest.method,
        headers: mutableRequest.headers,
        body:
          mutableRequest.method === "GET" || mutableRequest.method === "DELETE"
            ? undefined
            : (body as never),
      });

      return {
        response,
        resolvedUrl,
      };
    } catch (error) {
      throw new BadGatewayException(
        this.formatFetchErrorMessage(resolvedUrl, transportUrl, error),
      );
    }
  }

  private async buildRequestBody(
    bodyType: RequestBodyType,
    body: string,
    formDataValues: MultipartFormValue[],
    headers: Record<string, string>,
  ): Promise<unknown> {
    if (bodyType === "none") {
      return undefined;
    }

    if (bodyType === "json") {
      headers["content-type"] = headers["content-type"] ?? "application/json";
      return stripJsonComments(body || "{}");
    }

    if (bodyType === "text") {
      headers["content-type"] = headers["content-type"] ?? "text/plain";
      return body;
    }

    if (bodyType === "form-urlencoded") {
      headers["content-type"] =
        headers["content-type"] ?? "application/x-www-form-urlencoded";
      const params = new URLSearchParams();
      for (const item of formDataValues) {
        if (item.enabled && item.key.trim()) {
          params.append(item.key, item.value);
        }
      }

      return params.toString();
    }

    if (bodyType === "multipart-form-data") {
      delete headers["content-type"];
      const formData = new FormData();

      for (const item of formDataValues) {
        if (!item.enabled || !item.key.trim()) {
          continue;
        }

        if (item.valueType === "file") {
          const fileBuffer = Buffer.from(
            item.value.includes(",") ? item.value.split(",").pop() ?? "" : item.value,
            "base64",
          );
          const blob = new Blob([fileBuffer], {
            type: item.mimeType ?? "application/octet-stream",
          });
          formData.append(item.key, blob, item.fileName ?? "upload.bin");
        } else {
          formData.append(item.key, item.value);
        }
      }

      return formData;
    }

    return undefined;
  }

  private toHeaderRecord(headers: KeyValueItem[]): Record<string, string> {
    return headers.reduce<Record<string, string>>((accumulator, header) => {
      if (header.enabled && header.key.trim()) {
        accumulator[header.key.toLowerCase()] = header.value;
      }

      return accumulator;
    }, {});
  }

  private readHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};

    headers.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  }

  private extractSetCookieHeaders(headers: Headers): string[] {
    const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;

    if (typeof getSetCookie === "function") {
      return getSetCookie.call(headers);
    }

    const singleHeader = headers.get("set-cookie");
    return singleHeader ? [singleHeader] : [];
  }

  private previewCookie(header: string, rawUrl: string) {
    const [nameValue, ...parts] = header.split(";").map((part) => part.trim());
    const [name, value] = nameValue.split("=");
    const url = new URL(rawUrl);
    const domainPart = parts.find((part) => part.toLowerCase().startsWith("domain="));
    const pathPart = parts.find((part) => part.toLowerCase().startsWith("path="));

    return {
      name,
      value,
      domain: domainPart?.split("=")[1] ?? url.hostname,
      path: pathPart?.split("=")[1] ?? "/",
    };
  }

  private resolveTransportUrl(rawUrl: string): string {
    const dockerLocalhostAlias = process.env.DOCKER_LOCALHOST_ALIAS?.trim();

    if (!dockerLocalhostAlias) {
      return rawUrl;
    }

    try {
      const url = new URL(rawUrl);

      if (!this.isLoopbackHostname(url.hostname)) {
        return rawUrl;
      }

      url.hostname = dockerLocalhostAlias;
      return url.toString();
    } catch {
      return rawUrl;
    }
  }

  private assertPublicRequestUrl(rawUrl: string): void {
    let url: URL;

    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException("Request URL must be a valid absolute URL.");
    }

    if (this.isPrivateNetworkHostname(url.hostname)) {
      throw new BadRequestException(
        "Online execution cannot reach localhost or private network addresses. Use the desktop app to send this request from your machine.",
      );
    }
  }

  private isLoopbackHostname(hostname: string): boolean {
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    );
  }

  private isPrivateNetworkHostname(hostname: string): boolean {
    const normalizedHostname = hostname.toLowerCase();

    if (this.isLoopbackHostname(normalizedHostname)) {
      return true;
    }

    const ipv4Parts = normalizedHostname.split(".").map((part) => Number(part));
    if (
      ipv4Parts.length === 4 &&
      ipv4Parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ) {
      const [first, second] = ipv4Parts;
      return (
        first === 10 ||
        first === 127 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 169 && second === 254)
      );
    }

    return (
      normalizedHostname.endsWith(".local") ||
      normalizedHostname.endsWith(".localhost") ||
      normalizedHostname.endsWith(".internal") ||
      normalizedHostname.endsWith(".lan")
    );
  }

  private formatFetchErrorMessage(
    requestedUrl: string,
    transportUrl: string,
    error: unknown,
  ): string {
    const causeMessage = this.getErrorMessage(error);

    if (requestedUrl !== transportUrl) {
      return `Unable to reach ${requestedUrl}. The API executor is running in Docker, so localhost was mapped to ${transportUrl}. ${causeMessage}`;
    }

    return `Unable to reach ${requestedUrl}. ${causeMessage}`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const cause = error as Error & {
        cause?: unknown;
      };

      if (
        cause.cause &&
        typeof cause.cause === "object" &&
        "message" in cause.cause &&
        typeof cause.cause.message === "string"
      ) {
        return cause.cause.message;
      }

      return error.message;
    }

    return "Unknown network error.";
  }
}
