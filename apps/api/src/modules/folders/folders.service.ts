import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CollectionEntity } from "../../database/entities/collection.entity";
import { FolderEntity } from "../../database/entities/folder.entity";
import { RequestEntity } from "../../database/entities/request.entity";
import { WorkspacePermissionsService } from "../workspaces/workspace-permissions.service";
import { CreateFolderDto, UpdateFolderDto } from "./dto/folder.dto";

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(FolderEntity)
    private readonly folderRepository: Repository<FolderEntity>,
    @InjectRepository(CollectionEntity)
    private readonly collectionRepository: Repository<CollectionEntity>,
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
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
    const targetCollectionId = dto.collectionId ?? folder.collectionId;

    if (dto.collectionId && dto.collectionId !== folder.collectionId) {
      const targetCollection = await this.assertCollectionOwnership(userId, dto.collectionId);
      await this.permissions.requireCollectionWrite(userId, targetCollection.workspaceId);
    }

    if (dto.parentFolderId === folder.id) {
      throw new BadRequestException("Folder cannot be moved into itself.");
    }

    if (dto.parentFolderId) {
      const parentFolder = await this.findOwned(userId, dto.parentFolderId);

      if (parentFolder.collectionId !== targetCollectionId) {
        throw new BadRequestException("Parent folder must be in the target collection.");
      }

      if (await this.isDescendantFolder(parentFolder.id, folder.id)) {
        throw new BadRequestException("Folder cannot be moved into one of its child folders.");
      }
    }

    const collectionChanged = targetCollectionId !== folder.collectionId;

    Object.assign(folder, {
      collectionId: targetCollectionId,
      parentFolderId:
        dto.parentFolderId === undefined ? folder.parentFolderId : dto.parentFolderId,
      name: dto.name ?? folder.name,
      sortOrder: dto.sortOrder ?? folder.sortOrder,
      authType: dto.authType === undefined ? folder.authType : dto.authType,
      authConfig: dto.authConfig === undefined ? folder.authConfig : dto.authConfig,
    });

    const savedFolder = await this.folderRepository.save(folder);

    if (collectionChanged) {
      await this.moveFolderContentsToCollection(savedFolder.id, targetCollectionId);
    }

    return savedFolder;
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

  private async isDescendantFolder(
    candidateFolderId: string,
    ancestorFolderId: string,
  ): Promise<boolean> {
    let currentFolder = await this.folderRepository.findOne({
      where: { id: candidateFolderId },
    });

    while (currentFolder?.parentFolderId) {
      if (currentFolder.parentFolderId === ancestorFolderId) {
        return true;
      }

      currentFolder = await this.folderRepository.findOne({
        where: { id: currentFolder.parentFolderId },
      });
    }

    return false;
  }

  private async moveFolderContentsToCollection(
    folderId: string,
    collectionId: string,
  ): Promise<void> {
    await this.requestRepository.update({ folderId }, { collectionId });

    const childFolders = await this.folderRepository.find({
      where: { parentFolderId: folderId },
    });

    for (const childFolder of childFolders) {
      childFolder.collectionId = collectionId;
      await this.folderRepository.save(childFolder);
      await this.moveFolderContentsToCollection(childFolder.id, collectionId);
    }
  }
}
