import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CollectionEntity } from "../../database/entities/collection.entity";
import { FolderEntity } from "../../database/entities/folder.entity";
import { RequestEntity } from "../../database/entities/request.entity";
import { WorkspacePermissionsService } from "../workspaces/workspace-permissions.service";
import { WorkspacesService } from "../workspaces/workspaces.service";
import { CreateCollectionDto, UpdateCollectionDto } from "./dto/collection.dto";

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(CollectionEntity)
    private readonly collectionRepository: Repository<CollectionEntity>,
    @InjectRepository(FolderEntity)
    private readonly folderRepository: Repository<FolderEntity>,
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    private readonly permissions: WorkspacePermissionsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async listTreeForDefaultWorkspace(userId: string) {
    const workspaceId = await this.workspacesService.ensureDefaultWorkspace(userId);
    return this.listTree(userId, workspaceId);
  }

  async listTree(userId: string, workspaceId: string) {
    await this.permissions.requireCollectionRead(userId, workspaceId);

    const collections = await this.collectionRepository.find({
      where: { workspaceId },
      order: { sortOrder: "ASC", name: "ASC" },
    });

    const collectionIds = collections.map((collection) => collection.id);

    if (!collectionIds.length) {
      return [];
    }

    const [folders, requests] = await Promise.all([
      this.folderRepository.find({
        where: collectionIds.map((collectionId) => ({ collectionId })),
        order: { sortOrder: "ASC", name: "ASC" },
      }),
      this.requestRepository.find({
        where: collectionIds.map((collectionId) => ({ collectionId })),
        order: { sortOrder: "ASC", name: "ASC" },
      }),
    ]);

    const folderNodes = new Map(
      folders.map((folder) => [
        folder.id,
        {
          ...folder,
          folders: [] as unknown[],
          requests: [] as RequestEntity[],
        },
      ]),
    );

    for (const folder of folders) {
      const node = folderNodes.get(folder.id)!;
      if (folder.parentFolderId) {
        const parent = folderNodes.get(folder.parentFolderId);
        parent?.folders.push(node);
      }
    }

    const requestsByFolder = new Map<string, RequestEntity[]>();
    const rootRequestsByCollection = new Map<string, RequestEntity[]>();

    for (const request of requests) {
      if (request.folderId) {
        const current = requestsByFolder.get(request.folderId) ?? [];
        current.push(request);
        requestsByFolder.set(request.folderId, current);
      } else {
        const current = rootRequestsByCollection.get(request.collectionId) ?? [];
        current.push(request);
        rootRequestsByCollection.set(request.collectionId, current);
      }
    }

    for (const folder of folders) {
      const node = folderNodes.get(folder.id)!;
      node.requests = requestsByFolder.get(folder.id) ?? [];
    }

    return collections.map((collection) => ({
      ...collection,
      folders: folders
        .filter(
          (folder) =>
            folder.collectionId === collection.id && folder.parentFolderId === null,
        )
        .map((folder) => folderNodes.get(folder.id)),
      requests: rootRequestsByCollection.get(collection.id) ?? [],
    }));
  }

  async createInDefaultWorkspace(
    userId: string,
    dto: CreateCollectionDto,
  ): Promise<CollectionEntity> {
    const workspaceId = await this.workspacesService.ensureDefaultWorkspace(userId);
    return this.create(userId, workspaceId, dto);
  }

  async create(
    userId: string,
    workspaceId: string,
    dto: CreateCollectionDto,
  ): Promise<CollectionEntity> {
    await this.permissions.requireCollectionWrite(userId, workspaceId);

    return this.collectionRepository.save(
      this.collectionRepository.create({
        userId,
        workspaceId,
        name: dto.name,
        description: dto.description ?? "",
        sortOrder: dto.sortOrder ?? 0,
        authType: dto.authType ?? null,
        authConfig: dto.authConfig ?? null,
      }),
    );
  }

  async update(
    userId: string,
    collectionId: string,
    dto: UpdateCollectionDto,
  ): Promise<CollectionEntity> {
    const collection = await this.findOwned(userId, collectionId);
    await this.permissions.requireCollectionWrite(userId, collection.workspaceId);

    Object.assign(collection, {
      name: dto.name ?? collection.name,
      description: dto.description ?? collection.description,
      sortOrder: dto.sortOrder ?? collection.sortOrder,
      authType: dto.authType === undefined ? collection.authType : dto.authType,
      authConfig: dto.authConfig === undefined ? collection.authConfig : dto.authConfig,
    });

    return this.collectionRepository.save(collection);
  }

  async delete(userId: string, collectionId: string): Promise<void> {
    const collection = await this.findOwned(userId, collectionId);
    await this.permissions.requireCollectionWrite(userId, collection.workspaceId);
    await this.collectionRepository.remove(collection);
  }

  async findOwned(userId: string, collectionId: string): Promise<CollectionEntity> {
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId },
    });

    if (!collection || !(await this.permissions.getRole(userId, collection.workspaceId))) {
      throw new NotFoundException("Collection not found.");
    }

    return collection;
  }
}
