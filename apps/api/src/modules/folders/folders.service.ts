import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CollectionEntity } from "../../database/entities/collection.entity";
import { FolderEntity } from "../../database/entities/folder.entity";
import { WorkspacePermissionsService } from "../workspaces/workspace-permissions.service";
import { CreateFolderDto, UpdateFolderDto } from "./dto/folder.dto";

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(FolderEntity)
    private readonly folderRepository: Repository<FolderEntity>,
    @InjectRepository(CollectionEntity)
    private readonly collectionRepository: Repository<CollectionEntity>,
    private readonly permissions: WorkspacePermissionsService,
  ) {}

  async create(userId: string, dto: CreateFolderDto): Promise<FolderEntity> {
    const collection = await this.assertCollectionOwnership(userId, dto.collectionId);
    await this.permissions.requireCollectionWrite(userId, collection.workspaceId);

    if (dto.parentFolderId) {
      const parentFolder = await this.findOwned(userId, dto.parentFolderId);
      if (parentFolder.collectionId !== dto.collectionId) {
        throw new BadRequestException("Parent folder must be in the same collection.");
      }
    }

    return this.folderRepository.save(
      this.folderRepository.create({
        collectionId: dto.collectionId,
        parentFolderId: dto.parentFolderId ?? null,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
        authType: dto.authType ?? null,
        authConfig: dto.authConfig ?? null,
      }),
    );
  }

  async update(userId: string, folderId: string, dto: UpdateFolderDto): Promise<FolderEntity> {
    const folder = await this.findOwned(userId, folderId);
    await this.permissions.requireCollectionWrite(userId, folder.collection.workspaceId);

    if (dto.parentFolderId && dto.parentFolderId !== folder.id) {
      const parentFolder = await this.findOwned(userId, dto.parentFolderId);

      if (parentFolder.collectionId !== folder.collectionId) {
        throw new BadRequestException("Parent folder must stay in the same collection.");
      }
    }

    Object.assign(folder, {
      parentFolderId:
        dto.parentFolderId === undefined ? folder.parentFolderId : dto.parentFolderId,
      name: dto.name ?? folder.name,
      sortOrder: dto.sortOrder ?? folder.sortOrder,
      authType: dto.authType === undefined ? folder.authType : dto.authType,
      authConfig: dto.authConfig === undefined ? folder.authConfig : dto.authConfig,
    });

    return this.folderRepository.save(folder);
  }

  async delete(userId: string, folderId: string): Promise<void> {
    const folder = await this.findOwned(userId, folderId);
    await this.permissions.requireCollectionWrite(userId, folder.collection.workspaceId);
    await this.folderRepository.remove(folder);
  }

  async findOwned(userId: string, folderId: string): Promise<FolderEntity> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId },
      relations: {
        collection: true,
      },
    });

    if (!folder || !(await this.permissions.getRole(userId, folder.collection.workspaceId))) {
      throw new NotFoundException("Folder not found.");
    }

    return folder;
  }

  private async assertCollectionOwnership(
    userId: string,
    collectionId: string,
  ): Promise<CollectionEntity> {
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId },
    });

    if (!collection || !(await this.permissions.getRole(userId, collection.workspaceId))) {
      throw new NotFoundException("Collection not found.");
    }

    return collection;
  }
}
