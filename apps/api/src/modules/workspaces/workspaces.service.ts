import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkspaceRole } from "@postman-clone/shared-types";
import { DataSource, Repository } from "typeorm";
import {
  WorkspaceEntity,
  WorkspaceMemberEntity,
  UserEntity,
} from "../../database/entities";
import {
  AddWorkspaceMemberDto,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberDto,
} from "./dto/workspace.dto";
import { WorkspacePermissionsService } from "./workspace-permissions.service";

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly permissions: WorkspacePermissionsService,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectRepository(WorkspaceMemberEntity)
    private readonly memberRepository: Repository<WorkspaceMemberEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async listForUser(userId: string) {
    const memberships = await this.memberRepository.find({
      where: { userId },
      relations: { workspace: true },
      order: { createdAt: "ASC" },
    });

    if (!memberships.length) {
      const workspace = await this.create(userId, { name: "My Workspace" });
      return [workspace];
    }

    return memberships.map((membership) => this.toWorkspaceDto(membership.workspace, membership.role));
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    return this.dataSource.transaction(async (manager) => {
      const workspace = await manager.save(
        manager.create(WorkspaceEntity, {
          name: dto.name.trim(),
          description: dto.description ?? "",
          ownerId: userId,
          createdById: userId,
        }),
      );

      await manager.save(
        manager.create(WorkspaceMemberEntity, {
          workspaceId: workspace.id,
          userId,
          role: "OWNER",
          addedById: userId,
        }),
      );

      return this.toWorkspaceDto(workspace, "OWNER");
    });
  }

  async get(userId: string, workspaceId: string) {
    const role = await this.permissions.requireMember(userId, workspaceId);
    const workspace = await this.findWorkspace(workspaceId);
    return this.toWorkspaceDto(workspace, role);
  }

  async update(userId: string, workspaceId: string, dto: UpdateWorkspaceDto) {
    const role = await this.permissions.requireWorkspaceAdmin(userId, workspaceId);
    const workspace = await this.findWorkspace(workspaceId);

    Object.assign(workspace, {
      name: dto.name?.trim() || workspace.name,
      description: dto.description ?? workspace.description,
    });

    return this.toWorkspaceDto(await this.workspaceRepository.save(workspace), role);
  }

  async delete(userId: string, workspaceId: string): Promise<void> {
    await this.permissions.requireOwner(userId, workspaceId);
    const workspace = await this.findWorkspace(workspaceId);
    await this.workspaceRepository.remove(workspace);
  }

  async listMembers(userId: string, workspaceId: string) {
    await this.permissions.requireMember(userId, workspaceId);

    return this.memberRepository.find({
      where: { workspaceId },
      relations: { user: true },
      order: { role: "ASC", createdAt: "ASC" },
    }).then((members) => members.map((member) => this.toMemberDto(member)));
  }

  async addMember(userId: string, workspaceId: string, dto: AddWorkspaceMemberDto) {
    const actorRole = await this.permissions.requireWorkspaceAdmin(userId, workspaceId);
    if (!this.permissions.canAddMember(actorRole, dto.role)) {
      throw new ForbiddenException("You do not have permission to add a user with this role.");
    }

    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const existing = await this.memberRepository.findOne({
      where: { workspaceId, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException("User is already a member.");
    }

    const member = await this.memberRepository.save(
      this.memberRepository.create({
        workspaceId,
        userId: dto.userId,
        role: dto.role,
        addedById: userId,
      }),
    );

    member.user = user;
    return this.toMemberDto(member);
  }

  async updateMember(
    userId: string,
    workspaceId: string,
    targetUserId: string,
    dto: UpdateWorkspaceMemberDto,
  ) {
    const actorRole = await this.permissions.requireWorkspaceAdmin(userId, workspaceId);
    const target = await this.findMember(workspaceId, targetUserId);

    if (!this.permissions.canChangeRole(actorRole, target.role, dto.role)) {
      throw new ForbiddenException("You do not have permission to change this member role.");
    }

    target.role = dto.role;
    return this.toMemberDto(await this.memberRepository.save(target));
  }

  async removeMember(userId: string, workspaceId: string, targetUserId: string): Promise<void> {
    if (userId === targetUserId) {
      throw new BadRequestException("Transfer ownership before removing yourself.");
    }

    const actorRole = await this.permissions.requireWorkspaceAdmin(userId, workspaceId);
    const target = await this.findMember(workspaceId, targetUserId);

    if (!this.permissions.canRemoveMember(actorRole, target.role)) {
      throw new ForbiddenException("You do not have permission to remove this member.");
    }

    await this.memberRepository.remove(target);
  }

  async ensureDefaultWorkspace(userId: string): Promise<string> {
    const membership = await this.memberRepository.findOne({
      where: { userId },
      order: { createdAt: "ASC" },
    });

    if (membership) {
      return membership.workspaceId;
    }

    const workspace = await this.create(userId, { name: "My Workspace" });
    return workspace.id;
  }

  private async findWorkspace(workspaceId: string): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException("Workspace not found.");
    }

    return workspace;
  }

  private async findMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity> {
    const member = await this.memberRepository.findOne({
      where: { workspaceId, userId },
      relations: { user: true },
    });

    if (!member) {
      throw new NotFoundException("Workspace member not found.");
    }

    return member;
  }

  private toWorkspaceDto(workspace: WorkspaceEntity, role: WorkspaceRole) {
    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      ownerId: workspace.ownerId,
      createdById: workspace.createdById,
      currentUserRole: role,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  private toMemberDto(member: WorkspaceMemberEntity) {
    return {
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role,
      addedById: member.addedById,
      user: {
        id: member.user.id,
        username: member.user.username,
      },
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    };
  }
}
