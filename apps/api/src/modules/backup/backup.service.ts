import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import {
  BackupMetadataEntity,
  CollectionEntity,
  CookieEntity,
  EnvironmentEntity,
  EnvironmentVariableEntity,
  FolderEntity,
  HistoryEntryEntity,
  RequestEntity,
  RequestSnapshotEntity,
} from "../../database/entities";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { WorkspacePermissionsService } from "../workspaces/workspace-permissions.service";
import { RestoreBackupDto } from "./dto/restore-backup.dto";

@Injectable()
export class BackupService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
    @InjectRepository(CookieEntity)
    private readonly cookieRepository: Repository<CookieEntity>,
    @InjectRepository(HistoryEntryEntity)
    private readonly historyRepository: Repository<HistoryEntryEntity>,
    @InjectRepository(BackupMetadataEntity)
    private readonly backupRepository: Repository<BackupMetadataEntity>,
    private readonly workspacesService: WorkspacesService,
    private readonly permissions: WorkspacePermissionsService,
  ) {}

  async exportWorkspace(userId: string) {
    const workspaceId = await this.workspacesService.ensureDefaultWorkspace(userId);
    await this.permissions.requireMember(userId, workspaceId);
    const collections = await this.collectionRepository.find({ where: { workspaceId } });
    const collectionIds = collections.map((collection) => collection.id);
    const [folders, requests, environments, cookies, history] = await Promise.all([
      collectionIds.length
        ? this.folderRepository.find({
            where: collectionIds.map((collectionId) => ({ collectionId })),
          })
        : Promise.resolve([]),
      collectionIds.length
        ? this.requestRepository.find({
            where: collectionIds.map((collectionId) => ({ collectionId })),
          })
        : Promise.resolve([]),
      this.environmentRepository.find({
        where: { workspaceId },
        relations: { variables: true },
      }),
      this.cookieRepository.find({ where: { userId } }),
      this.historyRepository.find({ where: { userId }, order: { createdAt: "DESC" } }),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        collections,
        folders,
        requests,
        environments,
        cookies,
        history,
      },
    };
  }

  async restoreWorkspace(userId: string, dto: RestoreBackupDto) {
    const mode = dto.mode ?? "replace";
    const payload = dto.payload;

    if (!payload || typeof payload !== "object" || !("data" in payload)) {
      throw new BadRequestException("Invalid backup payload.");
    }

    const data = payload.data as Record<string, unknown>;

    if (mode !== "replace") {
      throw new BadRequestException("Only replace mode is supported in this MVP.");
    }

    await this.dataSource.transaction(async (manager) => {
      const workspaceId = await this.workspacesService.ensureDefaultWorkspace(userId);
      await this.permissions.requireCollectionWrite(userId, workspaceId);
      await manager.delete(HistoryEntryEntity, { userId });
      await manager.delete(CookieEntity, { userId });

      const collections = await manager.find(CollectionEntity, { where: { workspaceId } });
      if (collections.length) {
        const collectionIds = collections.map((collection) => collection.id);
        const requests = await manager.find(RequestEntity, {
          where: collectionIds.map((id) => ({ collectionId: id })),
        });
        if (requests.length) {
          await manager.delete(
            RequestSnapshotEntity,
            requests.map((request) => ({ requestId: request.id })),
          );
        }
        await manager.delete(RequestEntity, collectionIds.map((id) => ({ collectionId: id })));
        await manager.delete(FolderEntity, collectionIds.map((id) => ({ collectionId: id })));
      }
      await manager.delete(CollectionEntity, { workspaceId });
      const environments = await manager.find(EnvironmentEntity, { where: { workspaceId } });
      if (environments.length) {
        await manager.delete(
          EnvironmentVariableEntity,
          environments.map((environment) => ({ environmentId: environment.id })),
        );
      }
      await manager.delete(EnvironmentEntity, { workspaceId });

      await manager.save(
        BackupMetadataEntity,
        manager.create(BackupMetadataEntity, {
          userId,
          name: "Restore",
          version: 1,
        }),
      );

      const collectionsData = Array.isArray(data.collections) ? data.collections : [];
      const foldersData = Array.isArray(data.folders) ? data.folders : [];
      const requestsData = Array.isArray(data.requests) ? data.requests : [];
      const environmentsData = Array.isArray(data.environments) ? data.environments : [];
      const cookiesData = Array.isArray(data.cookies) ? data.cookies : [];
      const historyData = Array.isArray(data.history) ? data.history : [];

      for (const rawCollection of collectionsData as Array<Record<string, unknown>>) {
        await manager.save(
          CollectionEntity,
          manager.create(CollectionEntity, {
            ...rawCollection,
            userId,
            workspaceId,
          }),
        );
      }

      for (const rawFolder of foldersData as Array<Record<string, unknown>>) {
        await manager.save(FolderEntity, manager.create(FolderEntity, rawFolder));
      }

      for (const rawRequest of requestsData as Array<Record<string, unknown>>) {
        await manager.save(RequestEntity, manager.create(RequestEntity, rawRequest));
      }

      for (const rawEnvironment of environmentsData as Array<Record<string, unknown>>) {
        const { variables, ...environmentData } = rawEnvironment;

        await manager.save(
          EnvironmentEntity,
          manager.create(EnvironmentEntity, {
            ...environmentData,
            userId,
            workspaceId,
          }),
        );

        if (Array.isArray(variables)) {
          for (const rawVariable of variables as Array<Record<string, unknown>>) {
            await manager.save(
              EnvironmentVariableEntity,
              manager.create(EnvironmentVariableEntity, rawVariable),
            );
          }
        }
      }

      for (const rawCookie of cookiesData as Array<Record<string, unknown>>) {
        await manager.save(
          CookieEntity,
          manager.create(CookieEntity, {
            ...rawCookie,
            userId,
          }),
        );
      }

      for (const rawHistoryEntry of historyData as Array<Record<string, unknown>>) {
        await manager.save(
          HistoryEntryEntity,
          manager.create(HistoryEntryEntity, {
            ...rawHistoryEntry,
            userId,
          }),
        );
      }
    });

    return {
      success: true,
      restoredAt: new Date().toISOString(),
    };
  }
}
