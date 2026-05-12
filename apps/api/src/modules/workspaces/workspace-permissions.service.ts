import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkspaceRole } from "@postman-clone/shared-types";
import { Repository } from "typeorm";
import { WorkspaceMemberEntity } from "../../database/entities";

const writeCollectionRoles = new Set<WorkspaceRole>(["OWNER", "ADMIN", "CONTRIBUTOR"]);
const manageEnvironmentRoles = new Set<WorkspaceRole>(["OWNER", "ADMIN"]);

@Injectable()
export class WorkspacePermissionsService {
  constructor(
    @InjectRepository(WorkspaceMemberEntity)
    private readonly memberRepository: Repository<WorkspaceMemberEntity>,
  ) {}

  async getRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
    const member = await this.memberRepository.findOne({
      where: { userId, workspaceId },
    });

    return member?.role ?? null;
  }

  async requireMember(userId: string, workspaceId: string): Promise<WorkspaceRole> {
    const role = await this.getRole(userId, workspaceId);
    if (!role) {
      throw new NotFoundException("Workspace not found.");
    }

    return role;
  }

  async requireWorkspaceAdmin(userId: string, workspaceId: string): Promise<WorkspaceRole> {
    const role = await this.requireMember(userId, workspaceId);
    if (role !== "OWNER" && role !== "ADMIN") {
      throw new ForbiddenException("You do not have permission to manage this workspace.");
    }

    return role;
  }

  async requireOwner(userId: string, workspaceId: string): Promise<void> {
    const role = await this.requireMember(userId, workspaceId);
    if (role !== "OWNER") {
      throw new ForbiddenException("Only the workspace owner can perform this action.");
    }
  }

  async requireCollectionRead(userId: string, workspaceId: string): Promise<void> {
    await this.requireMember(userId, workspaceId);
  }

  async requireCollectionWrite(userId: string, workspaceId: string): Promise<void> {
    const role = await this.requireMember(userId, workspaceId);
    if (!writeCollectionRoles.has(role)) {
      throw new ForbiddenException("You do not have permission to modify collections.");
    }
  }

  async requireEnvironmentManage(userId: string, workspaceId: string): Promise<void> {
    const role = await this.requireMember(userId, workspaceId);
    if (!manageEnvironmentRoles.has(role)) {
      throw new ForbiddenException("You do not have permission to manage environments.");
    }
  }

  canAddMember(actorRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
    if (actorRole === "OWNER") {
      return targetRole !== "OWNER";
    }

    return actorRole === "ADMIN" && (targetRole === "CONTRIBUTOR" || targetRole === "READONLY");
  }

  canRemoveMember(actorRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
    if (actorRole === "OWNER") {
      return targetRole !== "OWNER";
    }

    return actorRole === "ADMIN" && (targetRole === "CONTRIBUTOR" || targetRole === "READONLY");
  }

  canChangeRole(
    actorRole: WorkspaceRole,
    currentTargetRole: WorkspaceRole,
    nextTargetRole: WorkspaceRole,
  ): boolean {
    if (nextTargetRole === "OWNER" || currentTargetRole === "OWNER") {
      return false;
    }

    if (actorRole === "OWNER") {
      return true;
    }

    return (
      actorRole === "ADMIN" &&
      currentTargetRole !== "ADMIN" &&
      (nextTargetRole === "CONTRIBUTOR" || nextTargetRole === "READONLY")
    );
  }
}
