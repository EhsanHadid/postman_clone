import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { UserEntity } from "../../database/entities";
import {
  AddWorkspaceMemberDto,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceMemberDto,
} from "./dto/workspace.dto";
import { WorkspacesService } from "./workspaces.service";

@UseGuards(SessionAuthGuard)
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: UserEntity) {
    return this.workspacesService.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: UserEntity, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(user.id, dto);
  }

  @Get(":workspaceId")
  get(@CurrentUser() user: UserEntity, @Param("workspaceId") workspaceId: string) {
    return this.workspacesService.get(user.id, workspaceId);
  }

  @Patch(":workspaceId")
  update(
    @CurrentUser() user: UserEntity,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(user.id, workspaceId, dto);
  }

  @Delete(":workspaceId")
  async remove(@CurrentUser() user: UserEntity, @Param("workspaceId") workspaceId: string) {
    await this.workspacesService.delete(user.id, workspaceId);
    return { success: true };
  }

  @Get(":workspaceId/members")
  listMembers(@CurrentUser() user: UserEntity, @Param("workspaceId") workspaceId: string) {
    return this.workspacesService.listMembers(user.id, workspaceId);
  }

  @Post(":workspaceId/members")
  addMember(
    @CurrentUser() user: UserEntity,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: AddWorkspaceMemberDto,
  ) {
    return this.workspacesService.addMember(user.id, workspaceId, dto);
  }

  @Patch(":workspaceId/members/:userId")
  updateMember(
    @CurrentUser() user: UserEntity,
    @Param("workspaceId") workspaceId: string,
    @Param("userId") targetUserId: string,
    @Body() dto: UpdateWorkspaceMemberDto,
  ) {
    return this.workspacesService.updateMember(user.id, workspaceId, targetUserId, dto);
  }

  @Delete(":workspaceId/members/:userId")
  async removeMember(
    @CurrentUser() user: UserEntity,
    @Param("workspaceId") workspaceId: string,
    @Param("userId") targetUserId: string,
  ) {
    await this.workspacesService.removeMember(user.id, workspaceId, targetUserId);
    return { success: true };
  }
}
