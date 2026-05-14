import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CollectionEntity,
  FolderEntity,
  RequestEntity,
  RequestSnapshotEntity,
} from "../../database/entities";
import { WorkspacePermissionsService } from "../workspaces/workspace-permissions.service";
import { CreateRequestDto, UpdateRequestDto } from "./dto/request.dto";

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(RequestSnapshotEntity)
    private readonly snapshotRepository: Repository<RequestSnapshotEntity>,
    @InjectRepository(CollectionEntity)
    private readonly collectionRepository: Repository<CollectionEntity>,
    @InjectRepository(FolderEntity)
    private readonly folderRepository: Repository<FolderEntity>,
    private readonly permissions: WorkspacePermissionsService,
  ) {}

  async findOwned(userId: string, requestId: string): Promise<RequestEntity> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: { collection: true },
    });

    if (!request || !(await this.permissions.getRole(userId, request.collection.workspaceId))) {
      throw new NotFoundException("Request not found.");
    }

    return request;
  }

  async findOne(userId: string, requestId: string): Promise<RequestEntity> {
    return this.findOwned(userId, requestId);
  }

  async create(userId: string, dto: CreateRequestDto): Promise<RequestEntity> {
    const collection = await this.collectionRepository.findOne({
      where: { id: dto.collectionId },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found.");
    }
    await this.permissions.requireCollectionWrite(userId, collection.workspaceId);

    if (dto.folderId) {
      const folder = await this.folderRepository.findOne({
        where: { id: dto.folderId },
        relations: { collection: true },
      });

      if (!folder || folder.collection.workspaceId !== collection.workspaceId) {
        throw new NotFoundException("Folder not found.");
      }

      if (folder.collectionId !== dto.collectionId) {
        throw new BadRequestException("Folder must belong to the same collection.");
      }
    }

    return this.requestRepository.save(
      this.requestRepository.create({
        collectionId: dto.collectionId,
        folderId: dto.folderId ?? null,
        name: dto.name,
        protocolType: dto.protocolType,
        method: dto.method ?? "GET",
        url: dto.url ?? "",
        trpcProcedurePath: dto.trpcProcedurePath ?? null,
        headers: dto.headers ?? [],
        queryParams: dto.queryParams ?? [],
        bodyType: dto.bodyType ?? "none",
        body: dto.body ?? "",
        formData: dto.formData ?? [],
        authType: dto.authType ?? null,
        authConfig: dto.authConfig ?? null,
        preRequestScript: dto.preRequestScript ?? "",
        postResponseScript: dto.postResponseScript ?? "",
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }

  async update(
    userId: string,
    requestId: string,
    dto: UpdateRequestDto,
  ): Promise<RequestEntity> {
    const request = await this.findOwned(userId, requestId);
    await this.permissions.requireCollectionWrite(userId, request.collection.workspaceId);
    await this.createSnapshot(request);

    if (dto.collectionId && dto.collectionId !== request.collectionId) {
      const collection = await this.collectionRepository.findOne({
        where: { id: dto.collectionId },
      });

      if (!collection) {
        throw new NotFoundException("Collection not found.");
      }
      await this.permissions.requireCollectionWrite(userId, collection.workspaceId);

      request.collectionId = dto.collectionId;
    }

    if (dto.folderId) {
      const folder = await this.folderRepository.findOne({
        where: { id: dto.folderId },
        relations: { collection: true },
      });

      if (!folder || folder.collectionId !== (dto.collectionId ?? request.collectionId)) {
        throw new NotFoundException("Folder not found.");
      }
    }

    Object.assign(request, {
      folderId: dto.folderId === undefined ? request.folderId : dto.folderId,
      name: dto.name ?? request.name,
      protocolType: dto.protocolType ?? request.protocolType,
      method: dto.method ?? request.method,
      url: dto.url ?? request.url,
      trpcProcedurePath:
        dto.trpcProcedurePath === undefined
          ? request.trpcProcedurePath
          : dto.trpcProcedurePath,
      headers: dto.headers ?? request.headers,
      queryParams: dto.queryParams ?? request.queryParams,
      bodyType: dto.bodyType ?? request.bodyType,
      body: dto.body ?? request.body,
      formData: dto.formData ?? request.formData,
      authType: dto.authType === undefined ? request.authType : dto.authType,
      authConfig: dto.authConfig === undefined ? request.authConfig : dto.authConfig,
      preRequestScript: dto.preRequestScript ?? request.preRequestScript,
      postResponseScript: dto.postResponseScript ?? request.postResponseScript,
      sortOrder: dto.sortOrder ?? request.sortOrder,
    });

    return this.requestRepository.save(request);
  }

  async duplicate(userId: string, requestId: string): Promise<RequestEntity> {
    const request = await this.findOwned(userId, requestId);
    await this.permissions.requireCollectionWrite(userId, request.collection.workspaceId);

    return this.requestRepository.save(
      this.requestRepository.create({
        collectionId: request.collectionId,
        folderId: request.folderId,
        name: `${request.name} Copy`,
        protocolType: request.protocolType,
        method: request.method,
        url: request.url,
        trpcProcedurePath: request.trpcProcedurePath,
        headers: request.headers,
        queryParams: request.queryParams,
        bodyType: request.bodyType,
        body: request.body,
        formData: request.formData,
        authType: request.authType,
        authConfig: request.authConfig,
        preRequestScript: request.preRequestScript,
        postResponseScript: request.postResponseScript,
        sortOrder: request.sortOrder + 1,
      }),
    );
  }

  async delete(userId: string, requestId: string): Promise<void> {
    const request = await this.findOwned(userId, requestId);
    await this.permissions.requireCollectionWrite(userId, request.collection.workspaceId);
    await this.requestRepository.remove(request);
  }

  private async createSnapshot(request: RequestEntity): Promise<void> {
    await this.snapshotRepository.save(
      this.snapshotRepository.create({
        requestId: request.id,
        name: request.name,
        method: request.method,
        url: request.url,
        body: request.body,
        headers: request.headers,
        queryParams: request.queryParams,
        bodyType: request.bodyType,
        authType: request.authType,
        authConfig: request.authConfig,
        preRequestScript: request.preRequestScript,
        postResponseScript: request.postResponseScript,
      }),
    );
  }
}
