import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity, WorkspaceEntity, WorkspaceMemberEntity } from "../../database/entities";
import { WorkspacePermissionsService } from "./workspace-permissions.service";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceEntity, WorkspaceMemberEntity, UserEntity])],
  controllers: [WorkspacesController],
  providers: [WorkspacePermissionsService, WorkspacesService],
  exports: [WorkspacePermissionsService, WorkspacesService],
})
export class WorkspacesModule {}
