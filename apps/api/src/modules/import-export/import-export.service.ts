import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import path from "node:path";
import { Repository } from "typeorm";
import {
  CollectionEntity,
  EnvironmentEntity,
  EnvironmentVariableEntity,
  FolderEntity,
  RequestEntity,
} from "../../database/entities";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { WorkspacePermissionsService } from "../workspaces/workspace-permissions.service";
import { ImportPostmanDto } from "./dto/import-postman.dto";

type PostmanAuth = {
  type?: string;
  basic?: Array<{ key: string; value: string }>;
  bearer?: Array<{ key: string; value: string }>;
};

type PostmanVariable = {
  key?: unknown;
  value?: unknown;
  enabled?: unknown;
  disabled?: unknown;
  description?: unknown;
};

@Injectable()
export class ImportExportService {
  constructor(
    @InjectRepository(CollectionEntity)
    private readonly collectionRepository: Repository<CollectionEntity>,
    @InjectRepository(FolderEntity)
    private readonly folderRepository: Repository<FolderEntity>,
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(EnvironmentEntity)
    private readonly environmentRepository: Repository<EnvironmentEntity>,
    @InjectRepository(EnvironmentVariableEntity)
    private readonly variableRepository: Repository<EnvironmentVariableEntity>,
    private readonly workspacesService: WorkspacesService,
    private readonly permissions: WorkspacePermissionsService,
  ) {}

  async importPostman(userId: string, dto: ImportPostmanDto) {
    const workspaceId = dto.workspaceId ?? await this.workspacesService.ensureDefaultWorkspace(userId);
    const warnings: string[] = [];
    const payload = dto.payload;

    if (Array.isArray(payload.values) && !Array.isArray(payload.item)) {
      await this.permissions.requireEnvironmentManage(userId, workspaceId);
      const environment = await this.importPostmanEnvironment(userId, workspaceId, payload, dto.name);

      return {
        environmentId: environment.id,
        importedCount: 0,
        importedVariableCount: environment.variables?.length ?? 0,
        skippedCount: warnings.length,
        warnings,
      };
    }

    await this.permissions.requireCollectionWrite(userId, workspaceId);
    const collectionName =
      dto.name ??
      this.readString(payload.info, "name") ??
      "Imported Postman Collection";

    const collectionAuth = this.parseAuth(payload.auth as PostmanAuth | undefined);
    const collection = await this.collectionRepository.save(
      this.collectionRepository.create({
        userId,
        workspaceId,
        name: collectionName,
        description: "Imported from Postman",
        sortOrder: 0,
        authType: collectionAuth.authType,
        authConfig: collectionAuth.authConfig,
      }),
    );

    const importedCount = await this.importItems(
      collection.id,
      null,
      Array.isArray(payload.item) ? payload.item : [],
      warnings,
    );
    const importedVariableCount = await this.importCollectionVariables(
      userId,
      workspaceId,
      Array.isArray(payload.variable) ? payload.variable : [],
    );

    return {
      collectionId: collection.id,
      importedCount,
      importedVariableCount,
      skippedCount: warnings.length,
      warnings,
    };
  }

  private async importPostmanEnvironment(
    userId: string,
    workspaceId: string,
    payload: Record<string, unknown>,
    name?: string,
  ): Promise<EnvironmentEntity> {
    const environmentName =
      name ??
      this.readString(payload, "name") ??
      this.readString(payload, "info.name") ??
      "Imported Postman Environment";
    const variables = this.parsePostmanVariables(
      Array.isArray(payload.values) ? payload.values : [],
    );

    const environment = await this.environmentRepository.save(
      this.environmentRepository.create({
        userId,
        workspaceId,
        name: environmentName,
        isGlobal: false,
      }),
    );

    if (variables.length) {
      environment.variables = await this.variableRepository.save(
        this.variableRepository.create(
          variables.map((variable) => ({
            environmentId: environment.id,
            ...variable,
          })),
        ),
      );
    } else {
      environment.variables = [];
    }

    return environment;
  }

  private async importCollectionVariables(
    userId: string,
    workspaceId: string,
    rawVariables: unknown[],
  ): Promise<number> {
    const variables = this.parsePostmanVariables(rawVariables);
    if (!variables.length) {
      return 0;
    }

    await this.permissions.requireEnvironmentManage(userId, workspaceId);
    const globalEnvironment = await this.ensureGlobalEnvironment(userId, workspaceId);

    for (const variable of variables) {
      const existing = await this.variableRepository.findOne({
        where: {
          environmentId: globalEnvironment.id,
          key: variable.key,
        },
      });

      if (existing) {
        Object.assign(existing, variable);
        await this.variableRepository.save(existing);
        continue;
      }

      await this.variableRepository.save(
        this.variableRepository.create({
          environmentId: globalEnvironment.id,
          ...variable,
        }),
      );
    }

    return variables.length;
  }

  private async ensureGlobalEnvironment(
    userId: string,
    workspaceId: string,
  ): Promise<EnvironmentEntity> {
    const existing = await this.environmentRepository.findOne({
      where: { workspaceId, isGlobal: true },
    });

    if (existing) {
      return existing;
    }

    return this.environmentRepository.save(
      this.environmentRepository.create({
        userId,
        workspaceId,
        name: "Global",
        isGlobal: true,
      }),
    );
  }

  private parsePostmanVariables(rawVariables: unknown[]): Array<{
    key: string;
    value: string;
    enabled: boolean;
    description: string | null;
  }> {
    return rawVariables
      .map((rawVariable) => {
        const variable = rawVariable as PostmanVariable;
        const key = typeof variable.key === "string" ? variable.key.trim() : "";

        if (!key) {
          return null;
        }

        return {
          key,
          value:
            variable.value === undefined || variable.value === null
              ? ""
              : String(variable.value),
          enabled:
            typeof variable.enabled === "boolean"
              ? variable.enabled
              : variable.disabled !== true,
          description:
            typeof variable.description === "string"
              ? variable.description
              : null,
        };
      })
      .filter(Boolean) as Array<{
        key: string;
        value: string;
        enabled: boolean;
        description: string | null;
      }>;
  }

  private async importItems(
    collectionId: string,
    parentFolderId: string | null,
    items: unknown[],
    warnings: string[],
  ): Promise<number> {
    let importedCount = 0;

    for (const item of items as Array<Record<string, unknown>>) {
      if (Array.isArray(item.item)) {
        const folder = await this.folderRepository.save(
          this.folderRepository.create({
            collectionId,
            parentFolderId,
            name: typeof item.name === "string" ? item.name : "Imported Folder",
            sortOrder: importedCount * 100,
            authType: null,
            authConfig: null,
          }),
        );

        importedCount += await this.importItems(
          collectionId,
          folder.id,
          item.item,
          warnings,
        );
        continue;
      }

      if (!item.request || typeof item.request !== "object") {
        warnings.push(`Skipped item without request payload: ${String(item.name ?? "unknown")}`);
        continue;
      }

      const requestPayload = item.request as Record<string, unknown>;
      const parsedRequest = this.parseRequest(requestPayload, warnings);

      await this.requestRepository.save(
        this.requestRepository.create({
          collectionId,
          folderId: parentFolderId,
          name: typeof item.name === "string" ? item.name : "Imported Request",
          protocolType: "http",
          method: parsedRequest.method,
          url: parsedRequest.url,
          trpcProcedurePath: null,
          headers: parsedRequest.headers,
          queryParams: [],
          bodyType: parsedRequest.bodyType,
          body: parsedRequest.body,
          formData: parsedRequest.formData,
          authType: parsedRequest.authType,
          authConfig: parsedRequest.authConfig,
          preRequestScript: "",
          postResponseScript: "",
          sortOrder: importedCount * 100,
        }),
      );

      if (Array.isArray(item.event) && item.event.length) {
        warnings.push(
          `Ignored Postman scripts/events for request: ${String(item.name ?? "unknown")}`,
        );
      }

      importedCount += 1;
    }

    return importedCount;
  }

  private parseRequest(
    requestPayload: Record<string, unknown>,
    warnings: string[],
  ): {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    headers: Array<{ id: string; key: string; value: string; enabled: boolean }>;
    bodyType: "none" | "json" | "text" | "form-urlencoded" | "multipart-form-data";
    body: string;
    formData: Array<{
      id: string;
      key: string;
      value: string;
      enabled: boolean;
      valueType?: "text" | "file";
      fileName?: string;
    }>;
    authType: "basic" | "bearer" | null;
    authConfig: Record<string, string> | null;
  } {
    const auth = this.parseAuth(requestPayload.auth as PostmanAuth | undefined);
    const method = (typeof requestPayload.method === "string"
      ? requestPayload.method.toUpperCase()
      : "GET") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    const url = this.parseUrl(requestPayload.url);
    const headers = Array.isArray(requestPayload.header)
      ? requestPayload.header.map((header, index) => {
          const headerItem = header as Record<string, unknown>;
          return {
            id: `${index}`,
            key: String(headerItem.key ?? ""),
            value: String(headerItem.value ?? ""),
            enabled: headerItem.disabled !== true,
          };
        })
      : [];

    const bodyPayload = (requestPayload.body ?? {}) as Record<string, unknown>;
    const mode = typeof bodyPayload.mode === "string" ? bodyPayload.mode : "none";

    if (mode === "raw") {
      const language = this.readString(bodyPayload.options, "raw.language");
      return {
        method,
        url,
        headers,
        bodyType: language === "json" ? "json" : "text",
        body: String(bodyPayload.raw ?? ""),
        formData: [],
        authType: auth.authType,
        authConfig: auth.authConfig,
      };
    }

    if (mode === "urlencoded") {
      return {
        method,
        url,
        headers,
        bodyType: "form-urlencoded",
        body: "",
        formData: Array.isArray(bodyPayload.urlencoded)
          ? bodyPayload.urlencoded.map((entry, index) => {
              const item = entry as Record<string, unknown>;
              return {
                id: `${index}`,
                key: String(item.key ?? ""),
                value: String(item.value ?? ""),
                enabled: item.disabled !== true,
              };
            })
          : [],
        authType: auth.authType,
        authConfig: auth.authConfig,
      };
    }

    if (mode === "formdata") {
      return {
        method,
        url,
        headers,
        bodyType: "multipart-form-data",
        body: "",
        formData: Array.isArray(bodyPayload.formdata)
          ? bodyPayload.formdata.map((entry, index) => {
              const item = entry as Record<string, unknown>;
              const sourcePath = item.src ? String(item.src) : undefined;
              return {
                id: `${index}`,
                key: String(item.key ?? ""),
                value: "",
                enabled: item.disabled !== true,
                valueType: item.type === "file" ? "file" : "text",
                fileName: sourcePath ? path.basename(sourcePath) : undefined,
              };
            })
          : [],
        authType: auth.authType,
        authConfig: auth.authConfig,
      };
    }

    if (mode !== "none") {
      warnings.push(`Unsupported body mode "${mode}" was imported as empty body.`);
    }

    return {
      method,
      url,
      headers,
      bodyType: "none",
      body: "",
      formData: [],
      authType: auth.authType,
      authConfig: auth.authConfig,
    };
  }

  private parseUrl(urlValue: unknown): string {
    if (typeof urlValue === "string") {
      return urlValue;
    }

    if (!urlValue || typeof urlValue !== "object") {
      return "";
    }

    const urlRecord = urlValue as Record<string, unknown>;

    if (typeof urlRecord.raw === "string") {
      return urlRecord.raw;
    }

    const protocol = typeof urlRecord.protocol === "string" ? urlRecord.protocol : "https";
    const host = Array.isArray(urlRecord.host) ? urlRecord.host.join(".") : "";
    const pathValue = Array.isArray(urlRecord.path) ? urlRecord.path.join("/") : "";
    return `${protocol}://${host}/${pathValue}`.replace(/\/$/, "");
  }

  private parseAuth(auth?: PostmanAuth): {
    authType: "basic" | "bearer" | null;
    authConfig: Record<string, string> | null;
  } {
    if (!auth?.type) {
      return { authType: null, authConfig: null };
    }

    if (auth.type === "bearer") {
      const token = auth.bearer?.find((entry) => entry.key === "token")?.value ?? "";
      return {
        authType: "bearer",
        authConfig: { token },
      };
    }

    if (auth.type === "basic") {
      const username = auth.basic?.find((entry) => entry.key === "username")?.value ?? "";
      const password = auth.basic?.find((entry) => entry.key === "password")?.value ?? "";
      return {
        authType: "basic",
        authConfig: { username, password },
      };
    }

    return { authType: null, authConfig: null };
  }

  private readString(
    input: unknown,
    pathExpression: string,
  ): string | undefined {
    const segments = pathExpression.split(".");
    let current: unknown = input;

    for (const segment of segments) {
      if (!current || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return typeof current === "string" ? current : undefined;
  }
}
